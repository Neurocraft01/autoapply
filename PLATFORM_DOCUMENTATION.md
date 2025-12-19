# Job Application Automation Platform

A comprehensive job search and application automation platform built with Next.js, Neon PostgreSQL, and Drizzle ORM.

## 🚀 Features

### ✅ Completed Features

#### Authentication & Authorization
- NextAuth.js integration with credentials and OAuth (Google)
- Secure password hashing with bcryptjs
- Protected routes and API endpoints
- Session management

#### User Profile Management
- Complete profile setup and editing
- Resume upload and storage (Base64)
- Skills tracking with proficiency levels
- Job preferences and requirements
- Professional summary

#### Job Portals Integration
- Multi-portal support (LinkedIn, Indeed, Glassdoor, ZipRecruiter, Monster, Dice)
- Encrypted credential storage for portal logins
- Portal management and configuration

#### Job Scraping
- Automated job scraping from multiple portals
- LinkedIn scraper with full implementation
- Indeed scraper with Puppeteer
- Manual trigger for immediate scraping
- Demo mode for testing without credentials

#### Intelligent Job Matching
- Advanced matching algorithm with weighted scoring:
  - Skills match: 40%
  - Title match: 25%
  - Location match: 15%
  - Experience match: 10%
  - Salary match: 10%
- Minimum match threshold configuration
- Match reasons and detailed scoring

#### Auto-Apply System
- Automated job application submission
- Daily application limits
- Business hours restrictions
- Resume requirement validation
- Application status tracking

#### Dashboard & UI
- Real-time statistics (applications, success rate, active portals)
- Quick actions for job discovery
- Jobs listing with filtering (all, full-time, part-time, contract)
- Matches page with scored recommendations
- Automation control center
- Responsive design with Tailwind CSS

#### Automation & Logging
- Automation logs for all actions
- Success/error tracking
- Manual scraping triggers
- Auto-apply toggle controls
- Activity timeline

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── applications/        # Application management
│   │   ├── automation/
│   │   │   ├── apply/           # Auto-apply endpoint
│   │   │   ├── logs/            # Automation logs
│   │   │   └── scrape-now/      # Manual scraping trigger
│   │   ├── jobs/
│   │   │   └── match/           # Job matching algorithm
│   │   ├── matches/             # User matches API
│   │   ├── portals/             # Portal management
│   │   │   ├── credentials/     # User portal credentials
│   │   │   └── list/            # Available portals
│   │   ├── profile/             # Profile CRUD
│   │   │   └── resume/          # Resume upload
│   │   ├── scrape/
│   │   │   ├── linkedin/        # LinkedIn scraper
│   │   │   └── indeed/          # Indeed scraper
│   │   ├── settings/
│   │   │   └── automation/      # Automation settings
│   │   └── stats/               # Dashboard statistics
│   ├── applications/            # Applications page
│   ├── automation/              # Automation control center
│   ├── auth/                    # Authentication pages
│   ├── dashboard/               # Main dashboard
│   ├── jobs/                    # Jobs listing
│   ├── matches/                 # Job matches page
│   ├── portals/                 # Portal management
│   ├── profile/                 # Profile pages
│   └── settings/                # Settings pages
├── components/
│   ├── layout/
│   │   └── DashboardLayout.tsx  # Main layout with sidebar
│   ├── providers/
│   │   └── Providers.tsx        # NextAuth provider
│   └── ui/                      # Reusable UI components
├── lib/
│   ├── ai/
│   │   └── gemini.ts            # Gemini AI integration
│   ├── db/
│   │   ├── client.ts            # Neon database client
│   │   └── schema.ts            # Drizzle schema
│   ├── email/
│   │   └── emailService.ts      # Email notifications
│   ├── matching/
│   │   └── jobMatcher.ts        # Job matching algorithm
│   ├── scrapers/
│   │   ├── linkedin.ts          # LinkedIn scraper
│   │   ├── indeed.ts            # Indeed scraper
│   │   ├── glassdoor.ts         # Glassdoor scraper
│   │   └── ziprecruiter.ts      # ZipRecruiter scraper
│   └── encryption.ts            # Credential encryption
└── types/
    └── index.ts                 # TypeScript types
```

## 🗄️ Database Schema

### Tables
1. **users** - User accounts and authentication
2. **accounts** - OAuth provider accounts
3. **sessions** - User sessions
4. **profiles** - User profiles with resume and preferences
5. **skills** - User skills with proficiency levels
6. **jobPortals** - Platform catalog (LinkedIn, Indeed, etc.)
7. **portalCredentials** - Encrypted user credentials for each portal
8. **jobs** - Scraped job listings
9. **jobMatches** - Scored job matches for users
10. **applications** - User job applications
11. **automationSettings** - User automation preferences
12. **automationLogs** - Automation activity logs
13. **jobQueue** - Job processing queue

## 🔧 Setup Instructions

### 1. Environment Variables

Create a `.env.local` file:

```env
# Neon Database
DATABASE_URL=postgresql://user:password@host/database

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Gemini AI (optional)
GEMINI_API_KEY=your-gemini-api-key

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Push Database Schema

```bash
npx drizzle-kit push
```

### 4. Seed Job Portals

```bash
npx tsx scripts/setup-portals.ts
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 🎯 Usage Guide

### Getting Started

1. **Sign Up / Login**
   - Create account with email/password or Google OAuth
   - Access authentication at `/auth/signup` or `/auth/login`

2. **Complete Profile**
   - Add current title, location, experience
   - Upload resume (PDF, DOC, or DOCX)
   - Add skills with proficiency levels
   - Set job preferences

3. **Add Portal Credentials**
   - Navigate to Settings → Portals
   - Add encrypted credentials for LinkedIn, Indeed, etc.
   - Enable/disable portals as needed

### Job Discovery

1. **Manual Scraping**
   - Go to Dashboard
   - Click "Find New Jobs Now"
   - Jobs are scraped based on your profile

2. **View Jobs**
   - Navigate to Jobs page
   - Filter by type (full-time, part-time, contract)
   - View job details and portal badges
   - Click to view original posting

3. **Find Matches**
   - On Jobs page, click "Find My Matches"
   - Algorithm scores jobs against your profile
   - View matched jobs on Matches page

### Auto-Apply

1. **Enable Auto-Apply**
   - Go to Automation page
   - Toggle "Auto-Apply" on
   - Set daily limits in Settings

2. **Configure Settings**
   - Go to Settings → Automation
   - Set daily application limit
   - Set minimum match score
   - Configure business hours

3. **Apply to Jobs**
   - Manually: Click "Apply Now" on match cards
   - Automatically: System applies to top matches daily

### Monitoring

1. **Dashboard Statistics**
   - Total applications
   - Weekly applications
   - Success rate
   - Active portals

2. **Automation Logs**
   - View recent activity
   - Check success/error status
   - See scraping history

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login

### Profile
- `GET /api/profile` - Get user profile
- `POST /api/profile` - Create profile
- `PUT /api/profile` - Update profile
- `POST /api/profile/resume` - Upload resume

### Jobs
- `GET /api/jobs` - List all jobs
- `POST /api/jobs/match` - Run matching algorithm

### Matches
- `GET /api/matches` - Get user's job matches

### Applications
- `GET /api/applications` - List user applications
- `POST /api/automation/apply` - Apply to a job

### Scraping
- `POST /api/scrape/linkedin` - Scrape LinkedIn jobs
- `POST /api/scrape/indeed` - Scrape Indeed jobs
- `POST /api/automation/scrape-now` - Manual scraping trigger

### Portals
- `GET /api/portals` - List available portals
- `POST /api/portals/credentials` - Add portal credentials
- `PUT /api/portals/credentials` - Update credentials

### Settings
- `GET /api/settings/automation` - Get automation settings
- `POST /api/settings/automation` - Update automation settings

### Automation
- `GET /api/automation/logs` - Get automation logs

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Neon PostgreSQL (Serverless)
- **ORM**: Drizzle ORM
- **Authentication**: NextAuth.js v4
- **UI**: Tailwind CSS + shadcn/ui
- **Scraping**: Puppeteer
- **AI**: Google Gemini
- **Encryption**: crypto (AES-256-GCM)
- **Password Hashing**: bcryptjs
- **Notifications**: React Toastify

## 📊 Matching Algorithm

The job matching algorithm uses a weighted scoring system:

```typescript
Total Score = (
  Skills Match × 0.40 +
  Title Match × 0.25 +
  Location Match × 0.15 +
  Experience Match × 0.10 +
  Salary Match × 0.10
) × 100
```

### Scoring Details

1. **Skills Match (40%)**
   - Compares user skills with job requirements
   - Weights by proficiency level
   - Considers skill relevance

2. **Title Match (25%)**
   - Compares current title with job title
   - Uses fuzzy string matching
   - Considers synonyms and variations

3. **Location Match (15%)**
   - Exact location match
   - Remote work consideration
   - Commute distance (if available)

4. **Experience Match (10%)**
   - Years of experience alignment
   - Seniority level matching

5. **Salary Match (10%)**
   - Salary range overlap
   - Expected vs. offered comparison

## 🔐 Security Features

- Password hashing with bcryptjs
- Portal credentials encrypted with AES-256-GCM
- Protected API routes with session validation
- HTTPS enforcement in production
- Secure cookie handling
- SQL injection prevention with Drizzle

## 🚧 Future Enhancements

- [ ] Additional portal integrations (Monster, Dice)
- [ ] Advanced AI-powered resume optimization
- [ ] Interview scheduling automation
- [ ] Application follow-up reminders
- [ ] Success analytics and insights
- [ ] Mobile app (React Native)
- [ ] Browser extension for quick applications
- [ ] Salary negotiation assistant
- [ ] Company research integration
- [ ] Network referral tracking

## 📝 License

MIT License

## 👥 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📧 Support

For support, email support@autoapply.ai or open an issue on GitHub.

---

Built with ❤️ by the AutoApply.ai team
