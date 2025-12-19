import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { jobPortals, portalCredentials, jobs as jobsTable, automationLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import LinkedInScraper from '@/lib/scrapers/linkedin';
import { decrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body with defaults
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Use defaults if JSON parsing fails
    }

    const { portal_name = 'LinkedIn', keywords = '', location = '', limit = 25 } = body;

    // Get portal
    const portals = await db
      .select()
      .from(jobPortals)
      .where(eq(jobPortals.name, portal_name))
      .limit(1);

    if (portals.length === 0) {
      return NextResponse.json({ error: 'Portal not found' }, { status: 404 });
    }

    const portal = portals[0];

    // Get credentials
    const creds = await db
      .select()
      .from(portalCredentials)
      .where(
        and(
          eq(portalCredentials.userId, session.user.id),
          eq(portalCredentials.portalId, portal.id),
          eq(portalCredentials.isActive, true)
        )
      )
      .limit(1);

    if (creds.length === 0) {
      return NextResponse.json({ error: 'Portal credentials not found. Please add your LinkedIn credentials in Settings.' }, { status: 404 });
    }

    const credentials = creds[0];

    // Decrypt password
    const password = decrypt(credentials.encryptedPassword, process.env.ENCRYPTION_KEY!);

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
      for (const jobData of jobs) {
        try {
          // Check if job already exists
          const existing = await db
            .select()
            .from(jobsTable)
            .where(eq(jobsTable.jobUrl, jobData.job_url))
            .limit(1);

          if (existing.length === 0) {
            const [savedJob] = await db
              .insert(jobsTable)
              .values({
                portalId: portal.id,
                jobTitle: jobData.job_title,
                companyName: jobData.company_name,
                location: jobData.location,
                jobUrl: jobData.job_url,
                description: jobData.job_description,
                salary: jobData.salary_range,
                jobType: jobData.job_type,
                requirements: jobData.required_skills?.join(', '),
                postedDate: jobData.posted_date ? new Date(jobData.posted_date) : null,
              })
              .returning();

            if (savedJob) {
              savedJobs.push(savedJob);
            }
          }
        } catch (error) {
          console.error('Error saving job:', error);
        }
      }

      // Log scraping activity
      await db.insert(automationLogs).values({
        userId: session.user.id,
        action: 'job_scraping',
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
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        await db.insert(automationLogs).values({
          userId: session.user.id,
          action: 'job_scraping',
          status: 'failed',
          errorMessage: error.message,
        });
      }
    } catch {}

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
