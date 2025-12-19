import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { applications, portalCredentials } from '@/lib/db/schema';
import { eq, and, count, sql, gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total applications
    const [totalAppsResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(applications)
      .where(eq(applications.userId, session.user.id));

    const totalApps = Number(totalAppsResult?.count) || 0;

    // Get this week's applications (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [weekAppsResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(applications)
      .where(and(
        eq(applications.userId, session.user.id),
        gte(applications.appliedAt, sevenDaysAgo)
      ));

    const weekApps = Number(weekAppsResult?.count) || 0;

    // Get successful applications (status = 'accepted')
    const [successfulAppsResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(applications)
      .where(and(
        eq(applications.userId, session.user.id),
        eq(applications.status, 'accepted')
      ));

    const successfulApps = Number(successfulAppsResult?.count) || 0;

    // Get active portal credentials (user's connected portals)
    const [activePortalsResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(portalCredentials)
      .where(and(
        eq(portalCredentials.userId, session.user.id),
        eq(portalCredentials.isActive, true)
      ));

    const activePortals = Number(activePortalsResult?.count) || 0;

    // Calculate success rate
    const successRate = totalApps > 0 ? Math.round((successfulApps / totalApps) * 100) : 0;

    return NextResponse.json({
      totalApplications: totalApps,
      successfulApplications: successfulApps,
      weekApplications: weekApps,
      activePortals: activePortals,
      successRate: successRate,
    });
  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json({
      totalApplications: 0,
      successfulApplications: 0,
      weekApplications: 0,
      activePortals: 0,
      successRate: 0,
    }, { status: 200 });
  }
}
