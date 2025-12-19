import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { automationSettings, jobs, jobMatches, profiles } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { JobQueue, JobType } from '@/lib/queue/jobQueue';

const jobQueue = new JobQueue();

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users with auto-apply enabled (simplified - we can add auto_match_enabled later)
    const settings = await db
      .select()
      .from(automationSettings)
      .where(eq(automationSettings.autoApplyEnabled, true));

    if (!settings || settings.length === 0) {
      return NextResponse.json({ message: 'No users with auto-match enabled' });
    }

    let jobsCreated = 0;

    for (const setting of settings) {
      // Create match job
      await jobQueue.addJob(JobType.MATCH_JOBS, setting.userId, {});
      jobsCreated++;
    }

    return NextResponse.json({
      message: `Created ${jobsCreated} match jobs`,
      jobsCreated,
      usersProcessed: settings.length,
    });
  } catch (error: any) {
    console.error('Match cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
