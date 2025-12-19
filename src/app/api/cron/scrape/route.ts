import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { automationSettings, profiles, jobQueue as jobQueueTable } from '@/lib/db/schema';
import { eq, gte, and } from 'drizzle-orm';
import { JobQueue, JobType } from '@/lib/queue/jobQueue';

const jobQueue = new JobQueue();

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users with auto-apply enabled (simplified - we can add auto_scrape_enabled to schema later)
    const settings = await db
      .select()
      .from(automationSettings)
      .where(eq(automationSettings.autoApplyEnabled, true));

    if (!settings || settings.length === 0) {
      return NextResponse.json({ message: 'No users with auto-apply enabled' });
    }

    let jobsCreated = 0;

    for (const setting of settings) {
      // Get user's job preferences
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, setting.userId))
        .limit(1);

      if (!profile) {
        continue;
      }

      // Check if we've scraped recently (within last 24 hours)
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - 24);

      const recentJobs = await db
        .select()
        .from(jobQueueTable)
        .where(and(
          eq(jobQueueTable.userId, setting.userId),
          gte(jobQueueTable.createdAt, hoursAgo)
        ))
        .limit(1);

      if (recentJobs && recentJobs.length > 0) {
        continue; // Already scraped recently
      }

      // Create scrape jobs for each portal
      const portals = ['LinkedIn', 'Indeed'];
      const searchTerm = profile.currentTitle || 'Software Engineer';
      const location = profile.location || 'United States';

      for (const portal of portals) {
        await jobQueue.addJob(JobType.SCRAPE_JOBS, setting.userId, {
          portal: portal.toLowerCase(),
          query: searchTerm,
          location,
        });

        jobsCreated++;
      }
    }

    return NextResponse.json({
      message: `Created ${jobsCreated} scrape jobs for ${settings.length} users`,
      jobsCreated,
      usersProcessed: settings.length,
    });
  } catch (error: any) {
    console.error('Scrape cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
