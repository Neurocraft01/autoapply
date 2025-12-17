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

    const { skill_name, proficiency_level, years_of_experience } = await request.json();

    // Get profile
    const { data: profile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Add skill
    const { data: skill, error: skillError } = await supabaseAdmin
      .from('skills')
      .insert({
        profile_id: profile.id,
        skill_name,
        proficiency_level: proficiency_level || 'intermediate',
        years_of_experience: years_of_experience || 0,
      })
      .select()
      .single();

    if (skillError) {
      return NextResponse.json({ error: skillError.message }, { status: 500 });
    }

    return NextResponse.json({ skill });
  } catch (error: any) {
    console.error('Add skill error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get('id');

    if (!skillId) {
      return NextResponse.json({ error: 'Skill ID required' }, { status: 400 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('skills')
      .delete()
      .eq('id', skillId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete skill error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
