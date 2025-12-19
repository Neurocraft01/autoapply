import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { applications, jobs, jobPortals } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const statusFilter = searchParams.get('status');

    // Get applications with job details
    const userApplications = await db
      .select({
        id: applications.id,
        applied_at: applications.appliedAt,
        status: applications.status,
        job_title: jobs.jobTitle,
        company_name: jobs.companyName,
        location: jobs.location,
        job_url: jobs.jobUrl,
        portal_name: jobPortals.name,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(jobPortals, eq(jobs.portalId, jobPortals.id))
      .where(eq(applications.userId, session.user.id))
      .orderBy(desc(applications.appliedAt))
      .limit(limit);

    return NextResponse.json(userApplications);
  } catch (error: any) {
    console.error('Applications API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
