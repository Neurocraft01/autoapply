import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import EmailService from '@/lib/email/emailService';

const emailService = new EmailService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = await request.json();

    // Get user profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, session.user.id))
      .limit(1);

    const userName = profile?.fullName || session.user.name || 'User';
    const userEmail = session.user.email!;

    switch (type) {
      case 'welcome':
        await emailService.sendWelcomeEmail(userEmail, userName);
        break;

      case 'application':
        await emailService.sendApplicationConfirmation(
          userEmail,
          userName,
          data.jobTitle,
          data.companyName,
          data.jobUrl
        );
        break;

      case 'match':
        await emailService.sendJobMatchNotification(
          userEmail,
          userName,
          data.jobTitle,
          data.companyName,
          data.matchScore,
          data.jobUrl
        );
        break;

      case 'daily_summary':
        await emailService.sendDailySummary(
          userEmail,
          userName,
          data.stats
        );
        break;

      case 'error':
        await emailService.sendErrorNotification(
          userEmail,
          userName,
          data.errorMessage,
          data.context
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
