import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/encryption';

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

    const { portal_id, username, password } = await request.json();

    if (!portal_id || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Encrypt password
    const encryptedPassword = encrypt(password, process.env.ENCRYPTION_KEY!);

    // Get profile
    const { data: profile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Save credentials
    const { data: credentials, error: credError } = await supabaseAdmin
      .from('portal_credentials')
      .upsert({
        user_id: user.id,
        profile_id: profile.id,
        portal_id,
        username,
        encrypted_password: encryptedPassword,
        is_active: true,
      }, { onConflict: 'user_id,portal_id' })
      .select()
      .single();

    if (credError) {
      return NextResponse.json({ error: credError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Portal credentials saved successfully',
      credentials: {
        id: credentials.id,
        portal_id: credentials.portal_id,
        username: credentials.username,
        is_active: credentials.is_active,
      },
    });
  } catch (error: any) {
    console.error('Portal credentials error:', error);
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

    const { data: credentials } = await supabaseAdmin
      .from('portal_credentials')
      .select(`
        id,
        username,
        is_active,
        created_at,
        portal:job_portals (
          id,
          name,
          url,
          logo_url
        )
      `)
      .eq('user_id', user.id);

    return NextResponse.json({ credentials: credentials || [] });
  } catch (error: any) {
    console.error('Get portal credentials error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
