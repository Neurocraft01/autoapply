import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { automationSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await db
      .select()
      .from(automationSettings)
      .where(eq(automationSettings.userId, session.user.id))
      .limit(1);

    if (settings.length === 0) {
      // Return default settings
      return NextResponse.json({
        auto_apply_enabled: false,
        max_daily_applications: 10,
        min_match_score: 70,
      });
    }

    return NextResponse.json(settings[0]);
  } catch (error) {
    console.error('Error fetching automation settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Check if settings exist
    const existing = await db
      .select()
      .from(automationSettings)
      .where(eq(automationSettings.userId, session.user.id))
      .limit(1);

    if (existing.length === 0) {
      // Insert new settings
      await db.insert(automationSettings).values({
        userId: session.user.id,
        autoApplyEnabled: data.auto_apply_enabled,
        maxDailyApplications: data.max_daily_applications,
        minMatchScore: data.min_match_score,
      });
    } else {
      // Update existing settings
      await db
        .update(automationSettings)
        .set({
          autoApplyEnabled: data.auto_apply_enabled,
          maxDailyApplications: data.max_daily_applications,
          minMatchScore: data.min_match_score,
          updatedAt: new Date(),
        })
        .where(eq(automationSettings.userId, session.user.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving automation settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
