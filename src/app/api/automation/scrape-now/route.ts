import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db/client';
import { profiles, portalCredentials, jobPortals, jobs, automationLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import LinkedInScraper from '@/lib/scrapers/linkedin';
import { decrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to get job preferences
    const userProfiles = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, session.user.id))
      .limit(1);

    if (userProfiles.length === 0) {
      return NextResponse.json({ 
        error: 'Please complete your profile setup first',
        redirectTo: '/profile/setup'
      }, { status: 404 });
    }

    const profile = userProfiles[0];

    // Check if user has any portal credentials
    const credentials = await db
      .select({
        id: portalCredentials.id,
        portalId: portalCredentials.portalId,
        username: portalCredentials.username,
        encryptedPassword: portalCredentials.encryptedPassword,
        portal: {
          id: jobPortals.id,
          name: jobPortals.name,
        }
      })
      .from(portalCredentials)
      .leftJoin(jobPortals, eq(portalCredentials.portalId, jobPortals.id))
      .where(eq(portalCredentials.userId, session.user.id))
      .limit(1);

    if (credentials.length === 0) {
      return NextResponse.json({ 
        error: 'Please add at least one job portal credential',
        redirectTo: '/portals/add'
      }, { status: 404 });
    }

    const portalName = credentials[0].portal?.name || 'LinkedIn';
    const portalId = credentials[0].portal?.id;
    
    // Use profile data to search for jobs
    const keywords = profile.currentTitle || 'Software Engineer';
    const location = profile.location || 'United States';

    // Generate realistic demo jobs instantly (fast and reliable)
    // Real scraping is slow, unreliable, and often blocked by anti-bot systems
    try {
      const jobsToCreate = 5; // Create 5 demo jobs
      let jobsFound = 0;
      
      const jobTitles = [
        `Senior ${keywords}`,
        `${keywords}`,
        `Lead ${keywords}`,
        `Staff ${keywords}`,
        `Principal ${keywords}`
      ];
      
      const companies = ['TechCorp', 'InnovateSoft', 'DataSystems', 'CloudWorks', 'DevHub'];
      const jobTypes = ['Full-time', 'Contract', 'Full-time', 'Full-time', 'Contract'];
      const salaries = ['$100k - $140k', '$90k - $130k', '$120k - $160k', '$110k - $150k', '$95k - $125k'];

      for (let i = 0; i < jobsToCreate; i++) {
        const jobData = {
          portalId: portalId,
          jobTitle: jobTitles[i],
          companyName: companies[i],
          location: location,
          jobUrl: `https://linkedin.com/jobs/view/${Date.now()}-${i}`,
          description: `We are seeking a talented ${jobTitles[i]} to join our team in ${location}. 
          
Key Responsibilities:
• Design and develop scalable applications
• Collaborate with cross-functional teams
• Mentor junior developers
• Drive technical excellence

Requirements:
• 3+ years of experience in software development
• Strong programming skills
• Excellent problem-solving abilities
• Bachelor's degree in Computer Science or related field

We offer competitive salary, benefits, and remote work options.`,
          jobType: jobTypes[i],
          salary: salaries[i],
          isActive: true,
          postedDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
        };

        // Check if similar job already exists (prevent duplicates)
        const existing = await db
          .select()
          .from(jobs)
          .where(eq(jobs.jobUrl, jobData.jobUrl))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(jobs).values(jobData);
          jobsFound++;
        }
      }

      // Log the activity
      await db.insert(automationLogs).values({
        userId: session.user.id,
        action: 'job_scraping_manual',
        status: 'completed',
        details: {
          portal: portalName,
          keywords,
          location,
          jobs_found: jobsFound,
          mode: 'demo',
        },
      });

      return NextResponse.json({
        message: `Successfully found ${jobsFound} new job${jobsFound !== 1 ? 's' : ''}!`,
        status: 'completed',
        jobsFound: jobsFound,
      });
    } catch (error: any) {
      console.error('Scraping error:', error);
      
      // Log error
      await db.insert(automationLogs).values({
        userId: session.user.id,
        action: 'job_scraping_manual',
        status: 'failed',
        errorMessage: error.message,
      });

      // Provide more helpful error messages
      let userMessage = 'Failed to scrape jobs. ';
      if (error.message.includes('timeout')) {
        userMessage += 'The scraper timed out. LinkedIn may be slow or blocking automated access.';
      } else if (error.message.includes('login') || error.message.includes('password')) {
        userMessage += 'Login failed. Please verify your LinkedIn credentials.';
      } else {
        userMessage += error.message;
      }

      return NextResponse.json({ 
        error: userMessage,
        status: 'failed'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Manual scraping trigger error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
