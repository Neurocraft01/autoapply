import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import LinkedInScraper from '@/lib/scrapers/linkedin';
import { decrypt } from '@/lib/encryption';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { portal_name, keywords, location, limit } = await request.json();

    // Get portal
    const { data: portal } = await supabaseAdmin
      .from('job_portals')
      .select('id')
      .eq('name', portal_name)
      .single();

    if (!portal) {
      return NextResponse.json({ error: 'Portal not found' }, { status: 404 });
    }

    // Get credentials
    const { data: credentials } = await supabaseAdmin
      .from('portal_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('portal_id', portal.id)
      .eq('is_active', true)
      .single();

    if (!credentials) {
      return NextResponse.json({ error: 'Portal credentials not found' }, { status: 404 });
    }

    // Decrypt password
    const password = decrypt(credentials.encrypted_password, process.env.ENCRYPTION_KEY!);

    // Initialize scraper
    const scraper = new LinkedInScraper();
    await scraper.initialize();

    try {
      // Login
      await scraper.login(credentials.username, password);

      // Search jobs
      const jobs = await scraper.searchJobs(keywords, location, limit || 25);

      // Save to database
      const savedJobs = [];
      for (const job of jobs) {
        try {
          const { data: savedJob } = await supabaseAdmin
            .from('scraped_jobs')
            .upsert({
              portal_id: portal.id,
              job_title: job.job_title,
              company_name: job.company_name,
              location: job.location,
              job_url: job.job_url,
              job_description: job.job_description,
              salary_range: job.salary_range,
              job_type: job.job_type,
              experience_level: job.experience_level,
              required_skills: job.required_skills,
              posted_date: job.posted_date,
              scraped_at: new Date(),
            }, { onConflict: 'job_url' })
            .select()
            .single();

          if (savedJob) {
            savedJobs.push(savedJob);
          }
        } catch (error) {
          console.error('Error saving job:', error);
        }
      }

      // Log scraping activity
      await supabaseAdmin
        .from('automation_logs')
        .insert({
          user_id: user.id,
          action_type: 'job_scraping',
          status: 'completed',
          details: {
            portal: portal_name,
            keywords,
            location,
            jobs_found: savedJobs.length,
          },
        });

      return NextResponse.json({
        message: `Successfully scraped ${savedJobs.length} jobs`,
        jobs: savedJobs,
      });
    } finally {
      await scraper.close();
    }
  } catch (error: any) {
    console.error('Scraping error:', error);

    // Log error
    try {
      await supabaseAdmin
        .from('automation_logs')
        .insert({
          user_id: (request as any).user?.id,
          action_type: 'job_scraping',
          status: 'failed',
          details: {
            error: error.message,
          },
        });
    } catch {}

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
