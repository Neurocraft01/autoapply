import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { profiles, portalCredentials, jobPortals, jobs, automationLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import LinkedInScraper from '@/lib/scrapers/linkedin';
import { decrypt } from '@/lib/encryption';

// Advanced endpoint for real LinkedIn scraping
// WARNING: This is slow (60+ seconds), often blocked, and may violate LinkedIn's ToS
// Use only for testing or with proper proxy/residential IP setup

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keywords, location, limit = 5 } = await request.json();

    // Get LinkedIn credentials
    const linkedInPortal = await db
      .select()
      .from(jobPortals)
      .where(eq(jobPortals.name, 'LinkedIn'))
      .limit(1);

    if (linkedInPortal.length === 0) {
      return NextResponse.json({ error: 'LinkedIn portal not found' }, { status: 404 });
    }

    const creds = await db
      .select()
      .from(portalCredentials)
      .where(
        and(
          eq(portalCredentials.userId, session.user.id),
          eq(portalCredentials.portalId, linkedInPortal[0].id),
          eq(portalCredentials.isActive, true)
        )
      )
      .limit(1);

    if (creds.length === 0) {
      return NextResponse.json({ 
        error: 'LinkedIn credentials not found. Please add credentials first.' 
      }, { status: 404 });
    }

    const credentials = creds[0];
    const password = decrypt(credentials.encryptedPassword, process.env.ENCRYPTION_KEY!);

    // Initialize scraper
    const scraper = new LinkedInScraper();
    await scraper.initialize();

    try {
      // Login
      await scraper.login(credentials.username, password);

      // Search jobs
      const scrapedJobs = await scraper.searchJobs(keywords, location, limit);

      // Save jobs
      let jobsFound = 0;
      for (const jobData of scrapedJobs) {
        try {
          const existing = await db
            .select()
            .from(jobs)
            .where(eq(jobs.jobUrl, jobData.job_url))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(jobs).values({
              portalId: linkedInPortal[0].id,
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

      // Log activity
      await db.insert(automationLogs).values({
        userId: session.user.id,
        action: 'linkedin_scraping_real',
        status: 'completed',
        details: {
          keywords,
          location,
          jobs_found: jobsFound,
          mode: 'real_scraping',
        },
      });

      return NextResponse.json({
        message: `Successfully scraped ${jobsFound} real jobs from LinkedIn`,
        jobsFound,
      });
    } finally {
      await scraper.close();
    }
  } catch (error: any) {
    console.error('Real scraping error:', error);

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await db.insert(automationLogs).values({
        userId: session.user.id,
        action: 'linkedin_scraping_real',
        status: 'failed',
        errorMessage: error.message,
      });
    }

    let errorMessage = 'Scraping failed. ';
    if (error.message.includes('timeout')) {
      errorMessage += 'LinkedIn is blocking or too slow. Try using a VPN or residential proxy.';
    } else if (error.message.includes('login')) {
      errorMessage += 'Login failed. Verify credentials or LinkedIn may require captcha.';
    } else {
      errorMessage += error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
