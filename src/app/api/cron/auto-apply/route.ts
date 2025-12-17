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

    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay(); // 0 = Sunday, 6 = Saturday

    // Get all users with auto-apply enabled
    const { data: settings } = await supabaseAdmin
      .from('automation_settings')
      .select('*')
      .eq('auto_apply_enabled', true);

    if (!settings || settings.length === 0) {
      return NextResponse.json({ message: 'No users with auto-apply enabled' });
    }

    let jobsCreated = 0;

    for (const setting of settings) {
      // Check if within allowed hours
      const startHour = parseInt(setting.auto_apply_hours_start.split(':')[0]);
      const endHour = parseInt(setting.auto_apply_hours_end.split(':')[0]);

      if (currentHour < startHour || currentHour >= endHour) {
        continue; // Outside allowed hours
      }

      // Skip weekends unless configured
      if (currentDay === 0 || currentDay === 6) {
        continue;
      }

      // Get today's application count
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayApplications, count } = await supabaseAdmin
        .from('applications')
        .select('id', { count: 'exact' })
        .eq('user_id', setting.user_id)
        .gte('applied_at', today.toISOString());

      const applicationsToday = count || 0;

      if (applicationsToday >= setting.max_applications_per_day) {
        continue; // Already hit daily limit
      }

      // Get high-scoring matches that haven't been applied to
      const { data: matches } = await supabaseAdmin
        .from('job_matches')
        .select('job_id, match_score')
        .eq('user_id', setting.user_id)
        .gte('match_score', setting.min_match_score)
        .order('match_score', { ascending: false })
        .limit(setting.max_applications_per_day - applicationsToday);

      if (!matches || matches.length === 0) {
        continue;
      }

      // Filter out jobs already applied to
      const { data: appliedJobs } = await supabaseAdmin
        .from('applications')
        .select('job_id')
        .eq('user_id', setting.user_id);

      const appliedJobIds = new Set(appliedJobs?.map((a) => a.job_id) || []);

      const unappliedMatches = matches.filter((m) => !appliedJobIds.has(m.job_id));

      // Create auto-apply jobs
      for (const match of unappliedMatches.slice(
        0,
        setting.max_applications_per_day - applicationsToday
      )) {
        // Check if job company is excluded
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .select('company')
          .eq('id', match.job_id)
          .single();

        if (job && setting.excluded_companies?.includes(job.company)) {
          continue;
        }

        await jobQueue.addJob(JobType.AUTO_APPLY, setting.user_id, {
          jobId: match.job_id,
        });

        jobsCreated++;
      }
    }

    return NextResponse.json({
      message: `Created ${jobsCreated} auto-apply jobs`,
      jobsCreated,
      usersProcessed: settings.length,
    });
  } catch (error: any) {
    console.error('Auto-apply cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
