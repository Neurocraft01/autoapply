import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateJobMatchScore } from '@/lib/matching/jobMatcher';

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

    // Get user profile and preferences
    const { data: profile } = await supabaseAdmin
      .from('candidate_profiles')
      .select(`
        *,
        skills (*),
        experience (*),
        preferences:job_preferences (*)
      `)
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get unmatched jobs from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: jobs } = await supabaseAdmin
      .from('scraped_jobs')
      .select('*')
      .gte('posted_date', sevenDaysAgo.toISOString())
      .is('deleted_at', null);

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No new jobs to match', matches: [] });
    }

    // Calculate match scores
    const matches = [];
    for (const job of jobs) {
      // Check if already matched
      const { data: existing } = await supabaseAdmin
        .from('job_matches')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('job_id', job.id)
        .single();

      if (existing) continue;

      const matchScore = calculateJobMatchScore(job, profile);

      // Only save matches above threshold
      const minScore = profile.preferences?.min_match_score || 70;
      if (matchScore.total_score >= minScore) {
        const { data: match } = await supabaseAdmin
          .from('job_matches')
          .insert({
            profile_id: profile.id,
            job_id: job.id,
            match_score: matchScore.total_score,
            match_details: matchScore,
          })
          .select()
          .single();

        if (match) {
          matches.push({
            ...match,
            job,
          });
        }
      }
    }

    return NextResponse.json({
      message: `Found ${matches.length} new matches`,
      matches,
    });
  } catch (error: any) {
    console.error('Job matching error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
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

    const { data: profile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: matches } = await supabaseAdmin
      .from('job_matches')
      .select(`
        *,
        job:scraped_jobs (
          job_title,
          company_name,
          location,
          job_url,
          salary_range,
          job_type,
          portal:job_portals (
            name
          )
        )
      `)
      .eq('profile_id', profile.id)
      .order('match_score', { ascending: false })
      .limit(50);

    return NextResponse.json({ matches: matches || [] });
  } catch (error: any) {
    console.error('Get matches error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
