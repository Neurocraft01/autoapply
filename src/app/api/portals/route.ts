import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data: portals } = await supabaseAdmin
      .from('job_portals')
      .select('*')
      .order('name');

    return NextResponse.json({ portals: portals || [] });
  } catch (error: any) {
    console.error('Get portals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
