import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { automationLogs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const logs = await db
      .select()
      .from(automationLogs)
      .where(eq(automationLogs.userId, session.user.id))
      .orderBy(desc(automationLogs.createdAt))
      .limit(limit);

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Automation logs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
