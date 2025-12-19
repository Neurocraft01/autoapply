import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { 
  applications, 
  jobs, 
  profiles, 
  automationSettings,
  automationLogs 
} from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Get job details
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if already applied
    const [existingApp] = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.userId, session.user.id),
          eq(applications.jobId, jobId)
        )
      )
      .limit(1);

    if (existingApp) {
      return NextResponse.json({ error: 'Already applied to this job' }, { status: 400 });
    }

    // Get user profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, session.user.id))
      .limit(1);

    if (!profile || !profile.resumeUrl) {
      return NextResponse.json({ 
        error: 'Please upload your resume first' 
      }, { status: 400 });
    }

    // Get automation settings
    const [settings] = await db
      .select()
      .from(automationSettings)
      .where(eq(automationSettings.userId, session.user.id))
      .limit(1);

    // Check daily application limit
    if (settings?.maxDailyApplications) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(applications)
        .where(
          and(
            eq(applications.userId, session.user.id),
            gte(applications.appliedAt, today)
          )
        );

      if (count >= settings.maxDailyApplications) {
        return NextResponse.json({ 
          error: 'Daily application limit reached' 
        }, { status: 429 });
      }
    }

    // Create application
    const [newApplication] = await db
      .insert(applications)
      .values({
        userId: session.user.id,
        jobId: jobId,
        status: 'applied',
        appliedAt: new Date(),
      })
      .returning();

    // Log the action
    await db.insert(automationLogs).values({
      userId: session.user.id,
      action: 'auto_apply',
      status: 'success',
      details: `Applied to ${job.jobTitle} at ${job.companyName}`,
    });

    return NextResponse.json({
      message: 'Application submitted successfully',
      application: newApplication,
    });
  } catch (error: any) {
    console.error('Auto-apply error:', error);
    
    // Log error
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await db.insert(automationLogs).values({
        userId: session.user.id,
        action: 'auto_apply',
        status: 'error',
        details: error.message,
      });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
