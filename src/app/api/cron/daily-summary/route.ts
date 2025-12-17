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

    // Get all users with daily summary enabled
    const { data: settings } = await supabaseAdmin
      .from('notification_settings')
      .select('user_id, daily_summary, daily_summary_time')
      .eq('email_notifications', true)
      .eq('daily_summary', true);

    if (!settings || settings.length === 0) {
      return NextResponse.json({ message: 'No users with daily summary enabled' });
    }

    const currentTime = new Date();
    const currentHour = currentTime.getHours();

    let jobsCreated = 0;

    for (const setting of settings) {
      // Check if it's the right time for this user
      const summaryHour = parseInt(setting.daily_summary_time.split(':')[0]);

      if (currentHour !== summaryHour) {
        continue; // Not the right time
      }

      // Check if we already sent summary today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: recentSummaries } = await supabaseAdmin
        .from('job_queue')
        .select('id')
        .eq('user_id', setting.user_id)
        .eq('type', JobType.SEND_DAILY_SUMMARY)
        .gte('created_at', today.toISOString())
        .limit(1);

      if (recentSummaries && recentSummaries.length > 0) {
        continue; // Already sent today
      }

      // Create daily summary job
      await jobQueue.addJob(JobType.SEND_DAILY_SUMMARY, setting.user_id, {});
      jobsCreated++;
    }

    return NextResponse.json({
      message: `Created ${jobsCreated} daily summary jobs`,
      jobsCreated,
      usersProcessed: settings.length,
    });
  } catch (error: any) {
    console.error('Daily summary cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
