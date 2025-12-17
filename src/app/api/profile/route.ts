import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Get profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Get skills
    const { data: skills } = await supabaseAdmin
      .from('skills')
      .select('*')
      .eq('profile_id', profile.id);

    // Get experience
    const { data: experience } = await supabaseAdmin
      .from('experience')
      .select('*')
      .eq('profile_id', profile.id)
      .order('start_date', { ascending: false });

    // Get education
    const { data: education } = await supabaseAdmin
      .from('education')
      .select('*')
      .eq('profile_id', profile.id)
      .order('start_date', { ascending: false });

    // Get certifications
    const { data: certifications } = await supabaseAdmin
      .from('certifications')
      .select('*')
      .eq('profile_id', profile.id)
      .order('issue_date', { ascending: false });

    // Get job preferences
    const { data: preferences } = await supabaseAdmin
      .from('job_preferences')
      .select('*')
      .eq('profile_id', profile.id)
      .single();

    return NextResponse.json({
      profile,
      skills: skills || [],
      experience: experience || [],
      education: education || [],
      certifications: certifications || [],
      preferences,
    });
  } catch (error: any) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();

    // Update profile
    const { data: profile, error: updateError } = await supabaseAdmin
      .from('candidate_profiles')
      .update({
        full_name: body.full_name,
        phone: body.phone,
        location: body.location,
        linkedin_url: body.linkedin_url,
        portfolio_url: body.portfolio_url,
        bio: body.bio,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
