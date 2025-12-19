import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { parseResume } from '@/lib/resume/parser';
import { db } from '@/lib/db/client';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF and DOCX files are allowed' }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // For now, store as base64 in database (in production, use cloud storage like Vercel Blob or S3)
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Parse resume
    const resumeFile = new File([buffer], file.name, { type: file.type });
    const parsedData = await parseResume(resumeFile);

    // Update profile with resume data
    const [profile] = await db
      .update(profiles)
      .set({
        resumeUrl: dataUrl, // Store base64 data URL
        fullName: parsedData.name || undefined,
        phone: parsedData.phone || undefined,
        bio: parsedData.summary || undefined,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, session.user.id))
      .returning();

    return NextResponse.json({
      success: true,
      parsed: parsedData,
      message: 'Resume uploaded and parsed successfully',
    });
  } catch (error: any) {
    console.error('Resume upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
