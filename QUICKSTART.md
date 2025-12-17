# 🚀 Quick Start Guide - AutoApply.ai

This guide will help you set up and run your Job Auto-Apply Automation System in under 10 minutes.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Git installed

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create a New Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Name it "autoapply-ai"
4. Set a strong database password
5. Choose a region close to you

### 2.2 Run Database Migrations

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL Editor
5. Click "Run"

This creates all 13 tables, indexes, RLS policies, and storage buckets.

### 2.3 Get Your API Keys

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy the **Project URL**
3. Copy the **anon public** key
4. Copy the **service_role** key (keep this secret!)

## Step 3: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
ENCRYPTION_KEY=your_32_character_encryption_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Generate Encryption Key

```bash
# On macOS/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## Step 4: Seed Initial Data (Optional)

Run this SQL in Supabase SQL Editor to add popular job portals:

```sql
INSERT INTO job_portals (name, url, base_url, logo_url, is_active) VALUES
('LinkedIn', 'https://www.linkedin.com/jobs', 'https://www.linkedin.com', 'https://logo.clearbit.com/linkedin.com', true),
('Indeed', 'https://www.indeed.com', 'https://www.indeed.com', 'https://logo.clearbit.com/indeed.com', true),
('Glassdoor', 'https://www.glassdoor.com/Job', 'https://www.glassdoor.com', 'https://logo.clearbit.com/glassdoor.com', true),
('AngelList', 'https://angel.co/jobs', 'https://angel.co', 'https://logo.clearbit.com/angel.co', true),
('ZipRecruiter', 'https://www.ziprecruiter.com', 'https://www.ziprecruiter.com', 'https://logo.clearbit.com/ziprecruiter.com', true);
```

## Step 5: Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 6: Create Your Account

1. Click "Get Started" or "Sign Up"
2. Enter your email and password, or use Google OAuth
3. Complete the profile setup wizard:
   - Basic information
   - Upload resume (optional but recommended)
   - Add skills
   - Add experience
   - Set job preferences
   - Connect job portals

## Step 7: Configure Automation

1. Go to **Settings**
2. Configure automation preferences:
   - Enable Auto-Apply
   - Set max applications per day (recommended: 10-25)
   - Set application interval (recommended: 30 minutes)
   - Enable business hours only
   - Set minimum match score (recommended: 70%)

3. Add your job portal credentials:
   - LinkedIn (required for scraping)
   - Indeed
   - Other portals

## Step 8: Start Automation

### Manual Job Matching

```bash
# Call the matching API
curl -X POST http://localhost:3000/api/jobs/match \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Manual Job Application

```bash
# Call the auto-apply API
curl -X POST http://localhost:3000/api/automation/apply \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Scheduled Automation (Production)

Set up cron jobs or use Vercel Cron:

```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/jobs/match",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/automation/apply",
      "schedule": "0 9-17 * * 1-5"
    }
  ]
}
```

## 🎯 Quick Feature Tour

### Dashboard
- View application statistics
- See recent activity
- Quick actions for common tasks

### Applications Page
- Track all your applications
- Filter by status (applied, pending, failed)
- Export to CSV

### Profile Setup
- Multi-step wizard
- Resume upload & parsing
- Skills management
- Experience timeline
- Education history

### Settings
- Automation controls
- Notification preferences
- Portal management

## 🔧 Troubleshooting

### "Unauthorized" Errors
- Make sure you're logged in
- Check if your access token is valid
- Verify environment variables are set correctly

### Scraping Fails
- Verify portal credentials are correct
- LinkedIn may require solving a CAPTCHA manually first
- Check if you've been rate-limited

### Applications Not Working
- Ensure profile is complete
- Check automation settings are enabled
- Verify daily limit hasn't been reached
- Check automation logs in dashboard

### Database Errors
- Verify all migrations ran successfully
- Check RLS policies are enabled
- Ensure service role key is correct

## 📊 Architecture Overview

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
┌────────▼────────┐ ┌──────▼──────┐
│  Supabase Auth  │ │  API Routes │
│   + Database    │ │  + Matching │
└─────────────────┘ └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Scrapers   │
                    │ (Puppeteer) │
                    └─────────────┘
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

```bash
vercel --prod
```

### Environment Variables for Production

Add all variables from `.env.example` in your Vercel project settings.

## 🎉 You're All Set!

Your job automation system is now ready. The system will:
- ✅ Scrape jobs from connected portals
- ✅ Match jobs based on your profile
- ✅ Automatically apply to high-matching jobs
- ✅ Track all applications
- ✅ Send email notifications

## 📚 Next Steps

1. Review [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for detailed architecture
2. Check [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for feature overview
3. Customize email templates in `src/lib/email/`
4. Add more scrapers in `src/lib/scrapers/`
5. Enhance matching algorithm in `src/lib/matching/`

## 🆘 Need Help?

- Check the documentation files
- Review Supabase logs for errors
- Check browser console for frontend errors
- Review API response errors

---

**Happy Job Hunting! 🎯**
