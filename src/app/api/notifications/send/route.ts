import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import EmailService from '@/lib/email/emailService';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const emailService = new EmailService();

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

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const userName = profile?.full_name || 'User';

    switch (type) {
      case 'welcome':
        await emailService.sendWelcomeEmail(user.email!, userName);
        break;

      case 'application':
        await emailService.sendApplicationConfirmation(
          user.email!,
          userName,
          data.jobTitle,
          data.companyName,
          data.jobUrl
        );
        break;

      case 'match':
        await emailService.sendJobMatchNotification(
          user.email!,
          userName,
          data.jobTitle,
          data.companyName,
          data.matchScore,
          data.jobUrl
        );
        break;

      case 'daily_summary':
        await emailService.sendDailySummary(
          user.email!,
          userName,
          data.stats
        );
        break;

      case 'error':
        await emailService.sendErrorNotification(
          user.email!,
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
