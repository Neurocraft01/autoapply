import { createClient } from '@supabase/supabase-js';
import LinkedInScraper from '../scrapers/linkedin';
import IndeedScraper from '../scrapers/indeed';
import GlassdoorScraper from '../scrapers/glassdoor';
import ZipRecruiterScraper from '../scrapers/ziprecruiter';
import { calculateJobMatchScore } from '../matching/jobMatcher';
import EmailService from '../email/emailService';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const emailService = new EmailService();

export enum JobType {
  SCRAPE_JOBS = 'scrape_jobs',
  MATCH_JOBS = 'match_jobs',
  AUTO_APPLY = 'auto_apply',
  SEND_DAILY_SUMMARY = 'send_daily_summary',
  CLEANUP_OLD_JOBS = 'cleanup_old_jobs',
}

export interface JobQueueItem {
  id: string;
  type: JobType;
  userId: string;
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: Date;
  processingAt?: Date;
  completedAt?: Date;
}

export class JobQueue {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-start processing
    this.startProcessing();
  }

  async addJob(type: JobType, userId: string, data: any): Promise<string> {
    const { data: job, error } = await supabaseAdmin
      .from('job_queue')
      .insert({
        type,
        user_id: userId,
        data,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add job to queue: ${error.message}`);
    }

    return job.id;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get pending jobs
      const { data: jobs, error } = await supabaseAdmin
        .from('job_queue')
        .select('*')
        .eq('status', 'pending')
        .lt('attempts', supabaseAdmin.rpc('max_attempts'))
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching queue jobs:', error);
        return;
      }

      if (!jobs || jobs.length === 0) {
        return;
      }

      // Process each job
      for (const job of jobs) {
        await this.processJob(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(job: any): Promise<void> {
    try {
      // Update status to processing
      await supabaseAdmin
        .from('job_queue')
        .update({
          status: 'processing',
          processing_at: new Date().toISOString(),
          attempts: job.attempts + 1,
        })
        .eq('id', job.id);

      // Execute job based on type
      switch (job.type) {
        case JobType.SCRAPE_JOBS:
          await this.scrapeJobs(job);
          break;
        case JobType.MATCH_JOBS:
          await this.matchJobs(job);
          break;
        case JobType.AUTO_APPLY:
          await this.autoApply(job);
          break;
        case JobType.SEND_DAILY_SUMMARY:
          await this.sendDailySummary(job);
          break;
        case JobType.CLEANUP_OLD_JOBS:
          await this.cleanupOldJobs(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Mark as completed
      await supabaseAdmin
        .from('job_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error);

      // Update job with error
      const updates: any = {
        error: error.message,
      };

      // Mark as failed if max attempts reached
      if (job.attempts + 1 >= job.max_attempts) {
        updates.status = 'failed';
        updates.completed_at = new Date().toISOString();
      } else {
        updates.status = 'pending'; // Retry
      }

      await supabaseAdmin.from('job_queue').update(updates).eq('id', job.id);
    }
  }

  private async scrapeJobs(job: any): Promise<void> {
    const { userId, data } = job;
    const { portal, query, location } = data;

    let scraper: any;
    let jobs: any[] = [];

    // Get portal credentials
    const { data: credentials } = await supabaseAdmin
      .from('portal_credentials')
      .select('username, password_encrypted')
      .eq('user_id', userId)
      .eq('portal_id', portal)
      .single();

    switch (portal.toLowerCase()) {
      case 'linkedin':
        scraper = new LinkedInScraper();
        await scraper.initialize();
        if (credentials) {
          await scraper.login(credentials.username, credentials.password_encrypted);
        }
        jobs = await scraper.searchJobs(query, location);
        await scraper.close();
        break;

      case 'indeed':
        scraper = new IndeedScraper();
        await scraper.initialize();
        jobs = await scraper.searchJobs(query, location);
        await scraper.close();
        break;

      case 'glassdoor':
        scraper = new GlassdoorScraper();
        await scraper.initialize();
        jobs = await scraper.searchJobs(query, location);
        await scraper.close();
        break;

      case 'ziprecruiter':
        scraper = new ZipRecruiterScraper();
        await scraper.initialize();
        jobs = await scraper.searchJobs(query, location);
        await scraper.close();
        break;

      default:
        throw new Error(`Unsupported portal: ${portal}`);
    }

    // Save jobs to database
    for (const jobData of jobs) {
      await supabaseAdmin.from('jobs').insert({
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        description: jobData.description,
        salary_min: this.extractSalaryMin(jobData.salary),
        salary_max: this.extractSalaryMax(jobData.salary),
        job_type: jobData.jobType,
        remote: jobData.remote,
        url: jobData.url,
        portal_id: portal,
        posted_date: jobData.postedDate,
        scraped_at: new Date().toISOString(),
      });
    }

    console.log(`Scraped ${jobs.length} jobs from ${portal}`);
  }

  private async matchJobs(job: any): Promise<void> {
    const { userId } = job;

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Get user skills
    const { data: skills } = await supabaseAdmin
      .from('candidate_skills')
      .select('skill_name, proficiency_level, years_of_experience')
      .eq('profile_id', profile.id);

    // Get unmatched jobs (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: jobs } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .gte('posted_date', sevenDaysAgo.toISOString())
      .is('matched_at', null)
      .limit(100);

    if (!jobs || jobs.length === 0) {
      return;
    }

    for (const jobData of jobs) {
      const matchScore = calculateJobMatchScore(
        {
          id: jobData.id,
          portal_id: jobData.portal_id,
          job_title: jobData.title,
          company_name: jobData.company,
          location: jobData.location,
          job_type: jobData.job_type,
          salary_range: jobData.salary_max ? `$${jobData.salary_min || 0}-$${jobData.salary_max}` : undefined,
          description: jobData.description,
          requirements: jobData.description,
          job_url: jobData.url,
          posted_date: jobData.posted_date,
          scraped_at: new Date().toISOString(),
          is_active: true,
          created_at: jobData.created_at || new Date().toISOString(),
        },
        {
          preferred_titles: profile.desired_job_titles || [],
          skills: skills?.map((s) => s.skill_name) || [],
          preferred_locations: profile.preferred_locations || [],
          salary_expectation: profile.desired_salary_min,
          experience_years: profile.years_of_experience || 0,
        }
      );

      // Save match score
      await supabaseAdmin.from('job_matches').insert({
        user_id: userId,
        job_id: jobData.id,
        match_score: matchScore.total_score,
        skill_match: matchScore.skills_match,
        title_match: matchScore.title_match,
        location_match: matchScore.location_match,
        salary_match: matchScore.salary_match,
        experience_match: matchScore.experience_match,
        matched_at: new Date().toISOString(),
      });

      // Send notification for high matches
      if (matchScore.total_score >= 80) {
        const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (data && data.user && data.user.email) {
          await emailService.sendJobMatchNotification(
            data.user.email,
            profile.full_name,
            jobData.title,
            jobData.company,
            matchScore.total_score,
            jobData.url
          );
        }
      }
    }

    console.log(`Matched ${jobs.length} jobs for user ${userId}`);
  }

  private async autoApply(job: any): Promise<void> {
    const { userId, data } = job;
    const { jobId } = data;

    // Get job details
    const { data: jobData } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!jobData) {
      throw new Error('Job not found');
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile || !profile.resume_url) {
      throw new Error('Profile or resume not found');
    }

    // Get portal credentials
    const { data: credentials } = await supabaseAdmin
      .from('portal_credentials')
      .select('username, password_encrypted')
      .eq('user_id', userId)
      .eq('portal_id', jobData.portal_id)
      .single();

    if (!credentials) {
      throw new Error('Portal credentials not found');
    }

    // Initialize appropriate scraper
    let scraper: any;
    let success = false;

    switch (jobData.portal_id.toLowerCase()) {
      case 'linkedin':
        scraper = new LinkedInScraper();
        await scraper.initialize();
        await scraper.login(credentials.username, credentials.password_encrypted);
        success = await scraper.applyToJob(jobData.url, profile.resume_url);
        await scraper.close();
        break;

      case 'indeed':
        scraper = new IndeedScraper();
        await scraper.initialize();
        success = await scraper.applyToJob(jobData.url, profile.resume_url);
        await scraper.close();
        break;

      default:
        throw new Error(`Auto-apply not supported for ${jobData.portal_id}`);
    }

    if (success) {
      // Record application
      await supabaseAdmin.from('applications').insert({
        user_id: userId,
        job_id: jobId,
        status: 'submitted',
        applied_at: new Date().toISOString(),
      });

      // Send confirmation email
      const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (data && data.user && data.user.email) {
        await emailService.sendApplicationConfirmation(
          data.user.email,
          profile.full_name,
          jobData.title,
          jobData.company,
          jobData.url
        );
      }
    } else {
      throw new Error('Application submission failed');
    }
  }

  private async sendDailySummary(job: any): Promise<void> {
    const { userId } = job;

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: applications } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('user_id', userId)
      .gte('applied_at', today.toISOString());

    const { data: matches } = await supabaseAdmin
      .from('job_matches')
      .select('id')
      .eq('user_id', userId)
      .gte('matched_at', today.toISOString());

    const { data: totalApplications } = await supabaseAdmin
      .from('applications')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    const { data: profile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (data && data.user && data.user.email && profile) {
      await emailService.sendDailySummary(data.user.email, profile.full_name, {
        applicationsToday: applications?.length || 0,
        matchesToday: matches?.length || 0,
        totalApplications: (totalApplications as any)?.length || 0,
      });
    }
  }

  private async cleanupOldJobs(job: any): Promise<void> {
    // Delete jobs older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { error } = await supabaseAdmin
      .from('jobs')
      .delete()
      .lt('posted_date', ninetyDaysAgo.toISOString());

    if (error) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }

    console.log('Cleaned up old jobs');
  }

  private extractSalaryMin(salaryString?: string): number | null {
    if (!salaryString) return null;
    const match = salaryString.match(/\$?([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, '')) : null;
  }

  private extractSalaryMax(salaryString?: string): number | null {
    if (!salaryString) return null;
    const matches = salaryString.match(/\$?([\d,]+)/g);
    if (matches && matches.length > 1) {
      return parseInt(matches[1].replace(/[$,]/g, ''));
    }
    return this.extractSalaryMin(salaryString);
  }

  startProcessing(intervalMs: number = 60000): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(() => {
      this.processQueue().catch(console.error);
    }, intervalMs);

    // Process immediately
    this.processQueue().catch(console.error);
  }

  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

export default JobQueue;
