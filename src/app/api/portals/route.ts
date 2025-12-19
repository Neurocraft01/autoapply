import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { jobPortals } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portals = await db
      .select()
      .from(jobPortals)
      .where(eq(jobPortals.isActive, true));

    return NextResponse.json(portals || []);
  } catch (error: any) {
    console.error('Get portals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
