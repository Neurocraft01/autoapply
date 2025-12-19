import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { jobQueue as jobQueueTable } from '@/lib/db/schema';
import { and, inArray, lt } from 'drizzle-orm';
import { JobQueue, JobType } from '@/lib/queue/jobQueue';

const jobQueue = new JobQueue();

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create cleanup job (runs for all users, no specific user_id)
    await jobQueue.addJob(JobType.CLEANUP_OLD_JOBS, 'system', {});

    // Clean up old completed/failed queue jobs (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await db
      .delete(jobQueueTable)
      .where(
        and(
          inArray(jobQueueTable.status, ['completed', 'failed']),
          lt(jobQueueTable.processedAt, thirtyDaysAgo)
        )
      );

    return NextResponse.json({
      message: 'Cleanup jobs created successfully',
    });
  } catch (error: any) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
