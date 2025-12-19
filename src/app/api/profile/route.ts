import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, session.user.id))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile,
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      preferences: null,
    });
  } catch (error: any) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check if profile already exists
    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, session.user.id))
      .limit(1);

    let profile;

    if (existingProfile) {
      // Update existing profile
      [profile] = await db
        .update(profiles)
        .set({
          fullName: body.full_name,
          phone: body.phone,
          location: body.location,
          currentTitle: body.current_title,
          yearsOfExperience: body.years_of_experience,
          resumeUrl: body.resume_url,
          linkedinUrl: body.linkedin_url,
          githubUrl: body.github_url,
          portfolioUrl: body.portfolio_url,
          bio: body.bio,
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, session.user.id))
        .returning();
    } else {
      // Create new profile
      [profile] = await db
        .insert(profiles)
        .values({
          userId: session.user.id,
          fullName: body.full_name,
          phone: body.phone,
          location: body.location,
          currentTitle: body.current_title,
          yearsOfExperience: body.years_of_experience,
          resumeUrl: body.resume_url,
          linkedinUrl: body.linkedin_url,
          githubUrl: body.github_url,
          portfolioUrl: body.portfolio_url,
          bio: body.bio,
        })
        .returning();
    }

    return NextResponse.json({ profile }, { status: existingProfile ? 200 : 201 });
  } catch (error: any) {
    console.error('Profile error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Update profile
    const [profile] = await db
      .update(profiles)
      .set({
        fullName: body.full_name,
        phone: body.phone,
        location: body.location,
        linkedinUrl: body.linkedin_url,
        portfolioUrl: body.portfolio_url,
        bio: body.bio,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, session.user.id))
      .returning();

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
