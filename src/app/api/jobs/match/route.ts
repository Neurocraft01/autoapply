import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { profiles, skills, jobs, jobMatches, automationSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { calculateJobMatchScore } from '@/lib/matching/jobMatcher';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, session.user.id))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get user skills
    const userSkills = await db
      .select()
      .from(skills)
      .where(eq(skills.userId, session.user.id));

    // Get automation settings for minimum match threshold
    const [settings] = await db
      .select()
      .from(automationSettings)
      .where(eq(automationSettings.userId, session.user.id))
      .limit(1);

    const minMatchThreshold = settings?.minMatchScore || 60;

    // Get all active jobs
    const allJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.isActive, true));

    // Calculate match scores for all jobs
    const matches = [];
    for (const job of allJobs) {
      const matchScoreBreakdown = calculateJobMatchScore(
        {
          id: job.id,
          portal_id: job.portalId || '',
          job_title: job.jobTitle,
          company_name: job.companyName,
          location: job.location || '',
          job_type: job.jobType || '',
          description: job.description || '',
          requirements: job.requirements || '',
          salary_range: job.salary || '',
          job_url: job.jobUrl,
          posted_date: job.postedDate?.toISOString() || new Date().toISOString(),
          scraped_at: job.createdAt.toISOString(),
          is_active: job.isActive,
          created_at: job.createdAt.toISOString(),
        },
        {
          preferred_titles: [profile.currentTitle].filter(Boolean) as string[],
          skills: userSkills.map(s => s.name),
          preferred_locations: [profile.location].filter(Boolean) as string[],
          salary_expectation: { min: 0, max: 0 }, // Can add to profile schema later
          experience_years: profile.yearsOfExperience || 0,
        }
      );

      if (matchScoreBreakdown.total_score >= minMatchThreshold) {
        matches.push({
          jobId: job.id,
          matchScore: matchScoreBreakdown.total_score,
          matchReasons: matchScoreBreakdown,
        });
      }
    }

    // Clear old matches for this user
    await db.delete(jobMatches).where(eq(jobMatches.userId, session.user.id));

    // Insert new matches
    if (matches.length > 0) {
      await db.insert(jobMatches).values(
        matches.map(m => ({
          userId: session.user.id!,
          jobId: m.jobId,
          matchScore: m.matchScore,
          matchReasons: '',
        }))
      );
    }

    return NextResponse.json({
      message: 'Match analysis complete',
      matchCount: matches.length,
      topMatches: matches.slice(0, 5),
    });
  } catch (error: any) {
    console.error('Job matching error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
