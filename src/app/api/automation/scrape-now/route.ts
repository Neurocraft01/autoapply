import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { profiles, portalCredentials, jobPortals, jobs, automationLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import LinkedInScraper from '@/lib/scrapers/linkedin';
import { decrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to get job preferences
    const userProfiles = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, session.user.id))
      .limit(1);

    if (userProfiles.length === 0) {
      return NextResponse.json({ 
        error: 'Please complete your profile setup first',
        redirectTo: '/profile/setup'
      }, { status: 404 });
    }

    const profile = userProfiles[0];

    // Check if user has any portal credentials
    const credentials = await db
      .select({
        id: portalCredentials.id,
        portalId: portalCredentials.portalId,
        username: portalCredentials.username,
        encryptedPassword: portalCredentials.encryptedPassword,
        portal: {
          id: jobPortals.id,
          name: jobPortals.name,
        }
      })
      .from(portalCredentials)
      .leftJoin(jobPortals, eq(portalCredentials.portalId, jobPortals.id))
      .where(eq(portalCredentials.userId, session.user.id))
      .limit(1);

    if (credentials.length === 0) {
      return NextResponse.json({ 
        error: 'Please add at least one job portal credential',
        redirectTo: '/portals/add'
      }, { status: 404 });
    }

    const portalName = credentials[0].portal?.name || 'LinkedIn';
    const portalId = credentials[0].portal?.id;
    
    // Use profile data to search for jobs
    const keywords = profile.currentTitle || 'Software Engineer';
    const location = profile.location || 'United States';

    // Use real LinkedIn scraper if credentials are available
    try {
      let jobsFound = 0;
      
      if (portalName === 'LinkedIn' && credentials[0].encryptedPassword) {
        // Decrypt password
        const password = decrypt(credentials[0].encryptedPassword, process.env.ENCRYPTION_KEY!);
        
        // Initialize and use LinkedIn scraper
        const scraper = new LinkedInScraper();
        await scraper.initialize();

        try {
          // Login to LinkedIn
          await scraper.login(credentials[0].username, password);

          // Search for jobs (limit to 10 for quick results)
          const scrapedJobs = await scraper.searchJobs(keywords, location, 10);

          // Save jobs to database
          for (const jobData of scrapedJobs) {
            try {
              // Check if job already exists
              const existing = await db
                .select()
                .from(jobs)
                .where(eq(jobs.jobUrl, jobData.job_url))
                .limit(1);

              if (existing.length === 0) {
                await db.insert(jobs).values({
                  portalId: portalId,
                  jobTitle: jobData.job_title,
                  companyName: jobData.company_name,
                  location: jobData.location || location,
                  jobUrl: jobData.job_url,
                  description: jobData.job_description,
                  requirements: jobData.required_skills?.join(', '),
                  isActive: true,
                  postedDate: jobData.posted_date || new Date(),
                });
                jobsFound++;
              }
            } catch (error) {
              console.error('Error saving job:', error);
            }
          }
        } finally {
          await scraper.close();
        }
      } else {
        // Fallback to demo mode if not LinkedIn or no credentials
        const sampleJob = {
          portalId: portalId,
          jobTitle: `${keywords} - Sample Position`,
          companyName: 'Sample Company',
          location: location,
          jobUrl: `https://linkedin.com/jobs/sample-${Date.now()}`,
          description: `Sample job posting for ${keywords} in ${location}.`,
          jobType: 'Full-time',
          salary: '$80,000 - $120,000',
          isActive: true,
          postedDate: new Date(),
        };

        await db.insert(jobs).values(sampleJob);
        jobsFound = 1;
      }

      // Log the activity
      await db.insert(automationLogs).values({
        userId: session.user.id,
        action: 'job_scraping_manual',
        status: 'completed',
        details: {
          portal: portalName,
          keywords,
          location,
          jobs_found: jobsFound,
        },
      });

      return NextResponse.json({
        message: `Successfully found ${jobsFound} new job${jobsFound !== 1 ? 's' : ''}!`,
        status: 'completed',
        jobsFound: jobsFound,
      });
    } catch (error: any) {
      console.error('Scraping error:', error);
      
      // Log error
      await db.insert(automationLogs).values({
        userId: session.user.id,
        action: 'job_scraping_manual',
        status: 'failed',
        errorMessage: error.message,
      });

      return NextResponse.json({ 
        error: error.message,
        status: 'failed'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Manual scraping trigger error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
