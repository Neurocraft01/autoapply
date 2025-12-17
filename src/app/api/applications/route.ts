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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('job_applications')
      .select(`
        *,
        job:scraped_jobs (
          job_title,
          company_name,
          location,
          job_url,
          portal:job_portals (
            name,
            logo_url
          )
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: applications, error: appsError, count } = await query;

    if (appsError) {
      return NextResponse.json({ error: appsError.message }, { status: 500 });
    }

    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Applications API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
