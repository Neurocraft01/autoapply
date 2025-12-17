import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import JobQueue, { JobType } from '@/lib/queue/jobQueue';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const jobQueue = new JobQueue();

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

    const { type, data } = await request.json();

    // Validate job type
    if (!Object.values(JobType).includes(type)) {
      return NextResponse.json({ error: 'Invalid job type' }, { status: 400 });
    }

    // Add job to queue
    const jobId = await jobQueue.addJob(type, user.id, data);

    return NextResponse.json({
      message: 'Job added to queue',
      jobId,
    });
  } catch (error: any) {
    console.error('Queue API error:', error);
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

    // Get user's queue jobs
    const { data: jobs, error } = await supabaseAdmin
      .from('job_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error('Queue API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
