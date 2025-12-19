import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { profiles, jobs, jobPortals, automationLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { IndeedScraper } from '@/lib/scrapers/indeed';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for search criteria
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, session.user.id))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get Indeed portal ID
    const [portal] = await db
      .select()
      .from(jobPortals)
      .where(eq(jobPortals.name, 'Indeed'))
      .limit(1);

    if (!portal) {
      return NextResponse.json({ error: 'Portal not configured' }, { status: 500 });
    }

    const scraper = new IndeedScraper();
    await scraper.initialize();

    const scrapedJobs = await scraper.searchJobs(
      profile.currentTitle || 'software developer',
      profile.location || '',
      10
    );

    await scraper.close();

    // Save jobs to database
    const savedJobs = [];
    for (const job of scrapedJobs) {
      const [savedJob] = await db.insert(jobs).values({
        portalId: portal.id,
        jobTitle: job.job_title,
        companyName: job.company_name,
        location: job.location,
        jobUrl: job.job_url,
        description: job.job_description,
        salary: job.salary_range,
        jobType: job.job_type,
        postedDate: job.posted_date || new Date(),
        isActive: true,
      }).returning();

      savedJobs.push(savedJob);
    }

    // Log the scraping action
    await db.insert(automationLogs).values({
      userId: session.user.id,
      action: 'scrape_jobs',
      status: 'success',
      details: `Scraped ${savedJobs.length} jobs from Indeed`,
    });

    return NextResponse.json({
      message: `Successfully scraped ${savedJobs.length} jobs from Indeed`,
      jobs: savedJobs,
    });
  } catch (error: any) {
    console.error('Indeed scraping error:', error);

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await db.insert(automationLogs).values({
        userId: session.user.id,
        action: 'scrape_jobs',
        status: 'error',
        details: error.message,
      });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
