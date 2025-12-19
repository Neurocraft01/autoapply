import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { jobQueue as jobQueueTable } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { JobQueue, JobType } from '@/lib/queue/jobQueue';

const jobQueue = new JobQueue();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = await request.json();

    // Validate job type
    if (!Object.values(JobType).includes(type)) {
      return NextResponse.json({ error: 'Invalid job type' }, { status: 400 });
    }

    // Add job to queue
    const jobId = await jobQueue.addJob(type, session.user.id, data);

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's queue jobs
    const jobs = await db
      .select()
      .from(jobQueueTable)
      .where(eq(jobQueueTable.userId, session.user.id))
      .orderBy(desc(jobQueueTable.createdAt))
      .limit(50);

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error('Queue API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
