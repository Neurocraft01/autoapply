# Implementation Guide

## Quick Start Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Supabase

1. **Create Supabase Project**
   - Go to https://app.supabase.com
   - Click "New Project"
   - Name: `autoapply-ai`
   - Database Password: (save this!)
   - Region: Choose closest to your users

2. **Run Database Migration**
   - Navigate to SQL Editor in Supabase Dashboard
   - Copy entire content from `supabase/migrations/001_initial_schema.sql`
   - Paste and click "Run"
   - Should see "Success. No rows returned"

3. **Create Storage Buckets**
   - Go to Storage section
   - Create bucket: `resumes`
     - Public: No
     - File size limit: 5MB
     - Allowed types: PDF, DOC, DOCX
   
   - Create bucket: `profile_photos`
     - Public: Yes
     - File size limit: 2MB
     - Allowed types: JPG, PNG, WEBP
   
   - Create bucket: `documents`
     - Public: No
     - File size limit: 10MB

4. **Setup Storage Policies**
   - Go back to SQL Editor
   - Run the storage policy SQL from `supabase/README.md`

5. **Get API Keys**
   - Go to Settings > API
   - Copy:
     - Project URL
     - `anon` public key
     - `service_role` secret key (keep safe!)

### 3. Configure Environment

1. Copy example env file:
```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENCRYPTION_KEY=generate-a-32-char-random-key-here!@#
```

3. Generate encryption key (run in terminal):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## Testing the Application

### Test User Flow

1. **Sign Up**
   - Go to http://localhost:3000
   - Click "Get Started"
   - Fill in registration form
   - Check email for verification link

2. **Complete Profile**
   - After login, you'll be redirected to profile setup
   - Follow 8-step wizard:
     - Step 1: Enter basic info
     - Step 2: Upload resume (PDF/DOCX)
     - Step 3: Add skills
     - Step 4: Add work experience
     - Step 5: Add education
     - Step 6: Add certifications (optional)
     - Step 7: Set job preferences
     - Step 8: Add portal credentials

3. **View Dashboard**
   - See matched jobs
   - View application statistics
   - Check activity logs

---

## Feature Implementation Status

### ✅ Completed Features

- [x] Next.js 14 project setup with TypeScript
- [x] Tailwind CSS configuration
- [x] Supabase database schema (13 tables)
- [x] Row Level Security policies
- [x] Storage buckets configuration
- [x] Authentication pages (Login/Signup)
- [x] Encryption utilities (AES-256)
- [x] Job matching algorithm
- [x] Resume parsing utilities
- [x] Type definitions
- [x] Utility functions
- [x] Global styles and CSS
- [x] Landing page
- [x] Documentation

### 🚧 Needs Implementation

The following files need to be created for full functionality:

#### Dashboard & Profile
- `src/app/dashboard/page.tsx` - Main dashboard
- `src/app/profile/setup/page.tsx` - Profile wizard
- `src/app/profile/edit/page.tsx` - Edit profile
- `src/app/applications/page.tsx` - Application history
- `src/app/settings/page.tsx` - User settings

#### UI Components (shadcn/ui)
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/progress.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/avatar.tsx`

#### Dashboard Components
- `src/components/dashboard/StatsCards.tsx`
- `src/components/dashboard/RecentApplications.tsx`
- `src/components/dashboard/JobMatchFeed.tsx`
- `src/components/dashboard/ActivityLog.tsx`
- `src/components/dashboard/Charts.tsx`

#### Profile Components
- `src/components/profile/ProfileWizard.tsx`
- `src/components/profile/ResumeUpload.tsx`
- `src/components/profile/SkillsEditor.tsx`
- `src/components/profile/ExperienceEditor.tsx`
- `src/components/profile/EducationEditor.tsx`

#### API Routes
- `src/app/api/auth/[...nextauth]/route.ts` - Auth callbacks
- `src/app/api/profile/route.ts` - Profile CRUD
- `src/app/api/profile/resume/route.ts` - Resume upload/parse
- `src/app/api/jobs/matched/route.ts` - Get matched jobs
- `src/app/api/jobs/scrape/route.ts` - Manual scraping
- `src/app/api/applications/route.ts` - Applications CRUD
- `src/app/api/applications/apply/route.ts` - Apply to job
- `src/app/api/automation/settings/route.ts` - Automation settings
- `src/app/api/automation/logs/route.ts` - Activity logs
- `src/app/api/cron/daily-scraping/route.ts` - Cron job
- `src/app/api/cron/auto-apply/route.ts` - Auto-apply cron

#### Job Scrapers
- `src/lib/scrapers/linkedin.ts` - LinkedIn scraper
- `src/lib/scrapers/indeed.ts` - Indeed scraper
- `src/lib/scrapers/naukri.ts` - Naukri scraper
- `src/lib/scrapers/monster.ts` - Monster scraper
- `src/lib/scrapers/base.ts` - Base scraper class

#### Automation
- `src/lib/automation/jobQueue.ts` - Bull queue setup
- `src/lib/automation/applicationHandler.ts` - Application logic
- `src/lib/automation/scheduler.ts` - Cron scheduling

---

## Next Steps for Development

### Phase 1: Core UI Components (Week 1)

1. **Install shadcn/ui components**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card dialog select progress tabs badge avatar
```

2. **Create Dashboard Page**
   - Stats cards showing total applications, success rate
   - Recent applications table
   - Job match feed with filtering
   - Activity log

3. **Create Profile Setup Wizard**
   - Multi-step form with progress indicator
   - Resume upload with drag-and-drop
   - Skills, experience, education forms
   - Form validation with Zod

### Phase 2: API Integration (Week 2)

1. **Profile API Routes**
   - GET/PUT `/api/profile`
   - POST `/api/profile/resume` - Upload and parse
   - GET/POST `/api/profile/skills`
   - GET/POST `/api/profile/experience`

2. **Jobs API Routes**
   - GET `/api/jobs/matched` - Get matched jobs with scores
   - POST `/api/jobs/scrape` - Trigger manual scrape
   - GET `/api/jobs/search` - Search with filters

3. **Applications API Routes**
   - GET `/api/applications` - List applications
   - POST `/api/applications/apply` - Submit application
   - GET `/api/applications/stats` - Get statistics

### Phase 3: Job Scraping (Week 3)

1. **Implement Base Scraper**
   - Abstract scraper class
   - Common utilities (auth, parsing, error handling)
   - Rate limiting and retry logic

2. **Portal-Specific Scrapers**
   - LinkedIn (using API if available)
   - Indeed (web scraping)
   - Naukri (web scraping)
   - Add more portals incrementally

3. **Job Storage & Deduplication**
   - Save scraped jobs to database
   - Detect duplicate jobs across portals
   - Mark old jobs as inactive

### Phase 4: Automation (Week 4)

1. **Application Handler**
   - Navigate to job application page
   - Fill forms with profile data
   - Upload resume
   - Handle screening questions
   - Capture confirmation

2. **Cron Jobs**
   - Daily scraping at configured time
   - Auto-apply to matched jobs
   - Respect daily limits
   - Error handling and logging

3. **Notifications**
   - Email integration (Resend/SendGrid)
   - Daily summary emails
   - Error alerts
   - Weekly reports

---

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful commit messages

### Component Structure
```typescript
// Example component structure
'use client';

import { useState } from 'react';
import { Component } from '@/components/ui/component';

interface Props {
  // Define props
}

export function MyComponent({ props }: Props) {
  // State
  const [state, setState] = useState();

  // Handlers
  const handleAction = () => {
    // Logic
  };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### API Route Structure
```typescript
// Example API route
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // Get user session
    // Fetch data from Supabase
    // Return response
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error message' },
      { status: 500 }
    );
  }
}
```

### Database Queries
```typescript
// Example Supabase query
const { data, error } = await supabase
  .from('candidate_profiles')
  .select('*, skills(*), experience(*)')
  .eq('user_id', userId)
  .single();

if (error) throw error;
```

---

## Testing Checklist

### Before Deployment
- [ ] All migrations run successfully
- [ ] RLS policies working
- [ ] Storage buckets created with policies
- [ ] Environment variables set
- [ ] Authentication flow works
- [ ] Profile creation works
- [ ] Resume parsing works
- [ ] Job matching algorithm tested
- [ ] Application submission tested
- [ ] Email notifications work
- [ ] Error handling tested
- [ ] Performance optimized
- [ ] Security audit done
- [ ] HTTPS enabled in production

---

## Deployment

### Vercel Deployment

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

2. **Deploy on Vercel**
   - Go to vercel.com
   - Import GitHub repository
   - Add environment variables
   - Deploy

3. **Configure Supabase**
   - Update redirect URLs in Supabase Auth settings
   - Add production domain to allowed origins

4. **Setup Cron Jobs**
   - Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-scraping",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/auto-apply",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

## Common Issues & Solutions

### Issue: Supabase connection fails
**Solution:**
- Check URL and API keys are correct
- Verify keys in Supabase dashboard match .env.local
- Ensure no trailing slashes in URL

### Issue: Resume parsing doesn't work
**Solution:**
- Check file type is PDF or DOCX
- Verify file size is under 5MB
- Check pdf-parse and mammoth packages installed
- Try with a well-formatted resume first

### Issue: RLS policies block access
**Solution:**
- Verify user is authenticated
- Check `auth.uid()` returns correct user ID
- Review policy SQL in Supabase dashboard
- Test policies with different users

### Issue: Job matching returns no results
**Solution:**
- Verify scraped_jobs table has data
- Check job_preferences are set
- Lower match threshold temporarily
- Review matching algorithm weights

---

## Performance Optimization

### Database
- Add indexes on frequently queried columns
- Use database functions for complex queries
- Implement pagination for large datasets
- Cache frequently accessed data

### Frontend
- Use Next.js Image component
- Implement lazy loading
- Code splitting for large components
- Optimize bundle size

### Scraping
- Implement rate limiting
- Use concurrent requests where allowed
- Cache portal sessions
- Retry failed requests

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Discord**: Join our community server
- **Email**: support@autoapply.ai

---

**Happy Coding! 🚀**
