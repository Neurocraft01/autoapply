# 🚀 Quick Start Guide - AutoApply.ai

This guide will help you set up and run your Job Auto-Apply Automation System in under 10 minutes.

## Prerequisites

- Node.js 18+ installed
- A Neon account (free tier works - https://neon.tech)
- Git installed

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Neon Database

### 2.1 Create a New Neon Project

1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Click "Create Project"
3. Name it "autoapply-ai"
4. Choose a region close to you
5. Click "Create Project"

### 2.2 Get Your Connection String

1. In your Neon dashboard, you'll see the connection string
2. Copy the connection string (looks like):
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

## Step 3: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```env
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_generated_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Generate NextAuth Secret and Encryption Key

```bash
# On macOS/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Run this twice - once for `NEXTAUTH_SECRET` and once for `ENCRYPTION_KEY`.

## Step 4: Push Database Schema

Run Drizzle to create all tables in your Neon database:

```bash
npm run db:push
```

This creates all necessary tables:
- users, accounts, sessions (NextAuth)
- profiles, skills
- job_portals, jobs, job_matches
- applications, automation_settings
- notification_settings, automation_logs, job_queue

### Verify Database

You can verify tables were created:
```bash
npm run db:studio
```

This opens Drizzle Studio at http://localhost:4983

## Step 5: Run the Application

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Step 6: Create Your Account

1. Click "Get Started" or "Sign Up"
2. Enter your email and password
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
- Verify database schema was pushed (npm run db:push)
- Check DATABASE_URL is correct in .env.local
- Ensure Neon project is active
- Use Drizzle Studio to inspect database (npm run db:studio)

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
│  NextAuth.js    │ │  API Routes │
│   + Neon DB     │ │  + Matching │
│  (Drizzle ORM)  │ └──────┬──────┘
└─────────────────┘        │
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

- Check the documentation files (MIGRATION.md, neon/README.md)
- Review Neon dashboard for database errors
- Check browser console for frontend errors
- Review API response errors
- Use Drizzle Studio to inspect database

---

**Happy Job Hunting! 🎯**
