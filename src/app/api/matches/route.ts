import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { jobMatches, jobs, jobPortals } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all matches for the user
    const matches = await db
      .select({
        id: jobMatches.id,
        matchScore: jobMatches.matchScore,
        jobId: jobs.id,
        jobTitle: jobs.jobTitle,
        companyName: jobs.companyName,
        location: jobs.location,
        jobUrl: jobs.jobUrl,
        salary: jobs.salary,
        description: jobs.description,
        portalName: jobPortals.name,
      })
      .from(jobMatches)
      .innerJoin(jobs, eq(jobMatches.jobId, jobs.id))
      .leftJoin(jobPortals, eq(jobs.portalId, jobPortals.id))
      .where(eq(jobMatches.userId, session.user.id))
      .orderBy(desc(jobMatches.matchScore))
      .limit(50);

    return NextResponse.json(matches);
  } catch (error: any) {
    console.error('Matches API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
