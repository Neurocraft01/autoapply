import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { automationSettings, jobMatches } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { JobQueue, JobType } from '@/lib/queue/jobQueue';

const jobQueue = new JobQueue();

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users with auto-apply enabled
    const settings = await db
      .select()
      .from(automationSettings)
      .where(eq(automationSettings.autoApplyEnabled, true));

    if (!settings || settings.length === 0) {
      return NextResponse.json({ message: 'No users with auto-apply enabled' });
    }

    let jobsCreated = 0;

    for (const setting of settings) {
      // Get high-scoring matches that haven't been applied to
      const matches = await db
        .select()
        .from(jobMatches)
        .where(
          and(
            eq(jobMatches.userId, setting.userId),
            eq(jobMatches.status, 'pending'),
            gte(jobMatches.matchScore, setting.minMatchScore)
          )
        )
        .limit(setting.maxDailyApplications);

      for (const match of matches) {
        await jobQueue.addJob(JobType.APPLY_TO_JOB, setting.userId, {
          jobId: match.jobId,
          matchId: match.id,
        });

        jobsCreated++;
      }
    }

    return NextResponse.json({
      message: `Created ${jobsCreated} auto-apply jobs for ${settings.length} users`,
      jobsCreated,
      usersProcessed: settings.length,
    });
  } catch (error: any) {
    console.error('Auto-apply cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
