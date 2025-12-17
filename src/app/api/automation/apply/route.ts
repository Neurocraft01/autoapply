import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get automation settings
    const { data: settings } = await supabaseAdmin
      .from('automation_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!settings?.auto_apply_enabled) {
      return NextResponse.json({ error: 'Auto-apply is not enabled' }, { status: 400 });
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabaseAdmin
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('applied_at', today.toISOString());

    if ((todayCount || 0) >= settings.max_applications_per_day) {
      return NextResponse.json({ 
        error: 'Daily application limit reached',
        applied: 0,
      });
    }

    // Get top matches that haven't been applied to
    const remainingSlots = settings.max_applications_per_day - (todayCount || 0);

    const { data: matches } = await supabaseAdmin
      .from('job_matches')
      .select(`
        id,
        job_id,
        match_score,
        job:scraped_jobs (
          id,
          job_title,
          company_name,
          job_url,
          portal_id
        )
      `)
      .eq('profile_id', profile.id)
      .gte('match_score', settings.min_match_score)
      .is('applied', false)
      .order('match_score', { ascending: false })
      .limit(remainingSlots);

    if (!matches || matches.length === 0) {
      return NextResponse.json({ 
        message: 'No matching jobs to apply to',
        applied: 0,
      });
    }

    // Apply to jobs
    const applications = [];
    for (const match of matches as any) {
      try {
        // Create application record
        const { data: application } = await supabaseAdmin
          .from('job_applications')
          .insert({
            user_id: user.id,
            job_id: match.job_id,
            portal_id: match.job?.portal_id || match.job?.[0]?.portal_id,
            status: 'pending',
            applied_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (application) {
          // Mark match as applied
          await supabaseAdmin
            .from('job_matches')
            .update({ applied: true })
            .eq('id', match.id);

          // Log automation activity
          await supabaseAdmin
            .from('automation_logs')
            .insert({
              user_id: user.id,
              action_type: 'auto_apply',
              status: 'pending',
              details: {
                job_id: match.job_id,
                job_title: match.job?.job_title || match.job?.[0]?.job_title,
                company_name: match.job?.company_name || match.job?.[0]?.company_name,
                match_score: match.match_score,
              },
            });

          applications.push(application);
        }
      } catch (error) {
        console.error('Application error:', error);
        
        // Log failure
        await supabaseAdmin
          .from('automation_logs')
          .insert({
            user_id: user.id,
            action_type: 'auto_apply',
            status: 'failed',
            details: {
              job_id: match.job_id,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
      }
    }

    return NextResponse.json({
      message: `Initiated ${applications.length} applications`,
      applied: applications.length,
      applications,
    });
  } catch (error: any) {
    console.error('Auto-apply error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
