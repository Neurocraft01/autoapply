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

    // Get all users with auto-scrape enabled
    const { data: settings } = await supabaseAdmin
      .from('automation_settings')
      .select('user_id, preferred_portals, scrape_frequency_hours')
      .eq('auto_scrape_enabled', true);

    if (!settings || settings.length === 0) {
      return NextResponse.json({ message: 'No users with auto-scrape enabled' });
    }

    let jobsCreated = 0;

    for (const setting of settings) {
      // Get user's job preferences
      const { data: profile } = await supabaseAdmin
        .from('candidate_profiles')
        .select('desired_job_titles, preferred_locations')
        .eq('user_id', setting.user_id)
        .single();

      if (!profile || !profile.desired_job_titles || profile.desired_job_titles.length === 0) {
        continue;
      }

      // Check if we've scraped recently
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - (setting.scrape_frequency_hours || 24));

      const { data: recentJobs } = await supabaseAdmin
        .from('job_queue')
        .select('id')
        .eq('user_id', setting.user_id)
        .eq('type', JobType.SCRAPE_JOBS)
        .gte('created_at', hoursAgo.toISOString())
        .limit(1);

      if (recentJobs && recentJobs.length > 0) {
        continue; // Already scraped recently
      }

      // Create scrape jobs for each portal and job title
      for (const portal of setting.preferred_portals || ['LinkedIn', 'Indeed']) {
        for (const jobTitle of profile.desired_job_titles.slice(0, 3)) {
          // Limit to 3 job titles
          const location = profile.preferred_locations?.[0] || 'United States';

          await jobQueue.addJob(JobType.SCRAPE_JOBS, setting.user_id, {
            portal: portal.toLowerCase(),
            query: jobTitle,
            location,
          });

          jobsCreated++;
        }
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
