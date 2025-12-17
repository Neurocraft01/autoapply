import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import JobQueue, { JobType } from '@/lib/queue/jobQueue';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const { error: queueCleanupError } = await supabaseAdmin
      .from('job_queue')
      .delete()
      .in('status', ['completed', 'failed'])
      .lt('completed_at', thirtyDaysAgo.toISOString());

    if (queueCleanupError) {
      console.error('Queue cleanup error:', queueCleanupError);
    }

    return NextResponse.json({
      message: 'Cleanup jobs created successfully',
    });
  } catch (error: any) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
