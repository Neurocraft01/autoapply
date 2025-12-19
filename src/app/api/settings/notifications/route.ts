import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { notificationSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [settings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, session.user.id))
      .limit(1);

    if (!settings) {
      // Return default settings
      return NextResponse.json({
        emailNotifications: true,
        matchNotifications: true,
        applicationNotifications: true,
        weeklyDigest: true,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
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
    const [existing] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, session.user.id))
      .limit(1);

    if (!existing) {
      // Insert new settings
      await db.insert(notificationSettings).values({
        userId: session.user.id,
        emailNotifications: data.emailNotifications,
        matchNotifications: data.matchNotifications,
        applicationNotifications: data.applicationNotifications,
        weeklyDigest: data.weeklyDigest,
      });
    } else {
      // Update existing settings
      await db
        .update(notificationSettings)
        .set({
          emailNotifications: data.emailNotifications,
          matchNotifications: data.matchNotifications,
          applicationNotifications: data.applicationNotifications,
          weeklyDigest: data.weeklyDigest,
          updatedAt: new Date(),
        })
        .where(eq(notificationSettings.userId, session.user.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
