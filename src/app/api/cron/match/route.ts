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

    // Get all users with auto-match enabled
    const { data: settings } = await supabaseAdmin
      .from('automation_settings')
      .select('user_id')
      .eq('auto_match_enabled', true);

    if (!settings || settings.length === 0) {
      return NextResponse.json({ message: 'No users with auto-match enabled' });
    }

    let jobsCreated = 0;

    for (const setting of settings) {
      // Create match job
      await jobQueue.addJob(JobType.MATCH_JOBS, setting.user_id, {});
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
