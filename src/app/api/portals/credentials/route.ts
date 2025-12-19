import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { portalCredentials, jobPortals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { portal_id, username, password } = await request.json();

    if (!portal_id || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Encrypt password
    const encryptedPassword = encrypt(password, process.env.ENCRYPTION_KEY!);

    // Check if credentials already exist for this portal
    const existing = await db
      .select()
      .from(portalCredentials)
      .where(
        and(
          eq(portalCredentials.userId, session.user.id),
          eq(portalCredentials.portalId, portal_id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing credentials
      await db
        .update(portalCredentials)
        .set({
          username,
          encryptedPassword,
          updatedAt: new Date(),
        })
        .where(eq(portalCredentials.id, existing[0].id));
    } else {
      // Insert new credentials
      await db.insert(portalCredentials).values({
        userId: session.user.id,
        portalId: portal_id,
        username,
        encryptedPassword,
        isActive: true,
      });
    }

    return NextResponse.json({
      message: 'Portal credentials saved successfully',
    });
  } catch (error: any) {
    console.error('Portal credentials error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credentials = await db
      .select({
        id: portalCredentials.id,
        username: portalCredentials.username,
        is_active: portalCredentials.isActive,
        created_at: portalCredentials.createdAt,
        portal: {
          id: jobPortals.id,
          name: jobPortals.name,
          url: jobPortals.url,
          logo_url: jobPortals.logoUrl,
        },
      })
      .from(portalCredentials)
      .leftJoin(jobPortals, eq(portalCredentials.portalId, jobPortals.id))
      .where(eq(portalCredentials.userId, session.user.id));

    return NextResponse.json(credentials);
  } catch (error: any) {
    console.error('Get portal credentials error:', error);
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing credential ID' }, { status: 400 });
    }

    // Delete the portal credential
    await db
      .delete(portalCredentials)
      .where(
        and(
          eq(portalCredentials.id, id),
          eq(portalCredentials.userId, session.user.id)
        )
      );

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('Delete portal credentials error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
