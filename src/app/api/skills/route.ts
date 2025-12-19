import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { skills, profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, category, proficiencyLevel } = await request.json();

    // Add skill
    const [skill] = await db
      .insert(skills)
      .values({
        userId: session.user.id,
        name,
        category: category || 'General',
        proficiencyLevel: proficiencyLevel || 'intermediate',
      })
      .returning();

    return NextResponse.json({ skill });
  } catch (error: any) {
    console.error('Add skill error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get('id');

    if (!skillId) {
      return NextResponse.json({ error: 'Skill ID required' }, { status: 400 });
    }

    await db.delete(skills).where(eq(skills.id, skillId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete skill error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
