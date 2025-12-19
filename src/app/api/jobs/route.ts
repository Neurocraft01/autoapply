import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { jobs, jobPortals } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active jobs with portal info
    const allJobs = await db
      .select({
        id: jobs.id,
        jobTitle: jobs.jobTitle,
        companyName: jobs.companyName,
        location: jobs.location,
        jobUrl: jobs.jobUrl,
        salary: jobs.salary,
        jobType: jobs.jobType,
        description: jobs.description,
        postedDate: jobs.postedDate,
        portal: {
          name: jobPortals.name,
        },
      })
      .from(jobs)
      .leftJoin(jobPortals, eq(jobs.portalId, jobPortals.id))
      .where(eq(jobs.isActive, true))
      .orderBy(desc(jobs.postedDate))
      .limit(100);

    return NextResponse.json(allJobs);
  } catch (error: any) {
    console.error('Jobs API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
