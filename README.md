# AutoApply.ai - Job Auto-Apply Automation Platform

A full-stack Next.js application that automates job applications across multiple job portals with intelligent matching, secure credential management, and comprehensive analytics.

![AutoApply.ai](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Neon](https://img.shields.io/badge/Neon-PostgreSQL-green)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-orange)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8)

## 🚀 Features

### Core Features
- ✅ **User Authentication** - Email/password + OAuth (Google, LinkedIn)
- ✅ **8-Step Profile Wizard** - Comprehensive profile setup with resume parsing
- ✅ **Resume Parser** - Automatic extraction of skills, experience, education
- ✅ **Multi-Portal Integration** - LinkedIn, Indeed, Naukri, Monster, Glassdoor
- ✅ **Intelligent Job Matching** - AI-powered matching with 40% skills, 25% title, 15% location weighting
- ✅ **Automated Applications** - Daily automated job applications with configurable limits
- ✅ **Real-time Dashboard** - Analytics, application tracking, job feed
- ✅ **Secure Credential Storage** - AES-256 encryption for portal credentials
- ✅ **Activity Logs** - Complete audit trail of all automation activities
- ✅ **Notification System** - Email and in-app notifications

### Security Features
- 🔒 Bank-level AES-256 encryption for sensitive data
- 🔒 NextAuth.js for secure authentication
- 🔒 CSRF protection
- 🔒 Input validation with Zod schemas
- 🔒 SQL injection prevention with Drizzle ORM
- 🔒 XSS protection

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Neon account (https://neon.tech)
- Git

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd job-auto-apply-platform
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Neon Database

1. Create a new project at [neon.tech](https://neon.tech)
2. Get your connection string from the dashboard
3. Push the database schema:
   ```bash
   npm run db:push
   ```
4. See `neon/README.md` for detailed setup instructions

### 4. Configure Environment Variables

Create `.env.local` file:
```env
# Neon Database
DATABASE_URL=postgresql://user:pass@project.neon.tech/neondb?sslmode=require

# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_secret_min_32_chars

# Encryption (generate a secure 32-char key)
ENCRYPTION_KEY=your_32_character_encryption_key

# OpenAI (for AI screening questions)
OPENAI_API_KEY=your_openai_key

# Email Service
RESEND_API_KEY=your_resend_key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
job-auto-apply-platform/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Main dashboard
│   │   ├── profile/           # Profile management
│   │   ├── applications/      # Application history
│   │   └── settings/          # User settings
│   ├── components/            # Reusable React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── dashboard/        # Dashboard components
│   │   └── profile/          # Profile components
│   ├── lib/                   # Utility libraries
│   │   ├── db/               # Database client & schema
│   │   ├── auth/             # NextAuth configuration
│   │   ├── encryption.ts     # Encryption utilities
│   │   ├── matching/         # Job matching algorithm
│   │   ├── resume/           # Resume parsing
│   │   └── utils.ts          # General utilities
│   ├── types/                 # TypeScript type definitions
│   └── hooks/                 # Custom React hooks
├── neon/
│   └── README.md             # Neon setup guide
├── drizzle/                   # Database migrations
├── public/                    # Static files
└── package.json

```

## 🗄️ Database Schema

### Main Tables:
- `users` - User accounts (managed by NextAuth)
- `profiles` - User profile information
- `skills` - User skills with proficiency levels
- `job_portals` - Encrypted portal credentials
- `jobs` - Jobs scraped from portals
- `job_matches` - AI-powered job matches
- `applications` - Application tracking
- `automation_logs` - Activity logs
- `automation_settings` - User automation preferences
- `notification_settings` - Notification preferences
- `job_queue` - Application queue

See `src/lib/db/schema.ts` for complete schema.

## 🤖 Job Matching Algorithm

The intelligent matching system uses weighted scoring:

```typescript
Total Score = 
  Skills Match (40%) +
  Job Title Match (25%) +
  Location Match (15%) +
  Experience Level (10%) +
  Salary Match (10%)
```

**Match Categories:**
- 90-100%: Excellent Match (auto-apply recommended)
- 75-89%: Good Match
- 60-74%: Fair Match
- <60%: Not displayed

## 📊 Key Features Breakdown

### 1. Profile Setup Wizard
8-step guided process:
1. Basic Information
2. Resume Upload & Parsing
3. Skills & Proficiency
4. Work Experience
5. Education
6. Certifications
7. Job Preferences
8. Portal Credentials

### 2. Automated Application System
- Daily cron jobs scrape new jobs
- Matches jobs based on user preferences
- Automatically fills application forms
- Handles screening questions with AI
- Tracks success/failure rates
- Respects daily application limits (5-50 configurable)

### 3. Dashboard Analytics
- Total applications submitted
- Weekly application trends
- Success rate metrics
- Application status breakdown
- Recent activity feed
- Top matched jobs

### 4. Security Measures
- All portal credentials encrypted with AES-256
- Row Level Security (RLS) on all database tables
- Users can only access their own data
- Secure file upload with virus scanning
- HTTPS only in production
- Environment variable protection

## 🔧 API Routes

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `POST /api/profile/resume` - Upload resume
- `POST /api/profile/parse-resume` - Parse uploaded resume

### Jobs
- `GET /api/jobs/matched` - Get matched jobs
- `GET /api/jobs/search` - Search jobs
- `POST /api/jobs/scrape` - Trigger manual scrape

### Applications
- `GET /api/applications` - Get user applications
- `POST /api/applications/apply` - Apply to job
- `POST /api/applications/batch-apply` - Batch apply

### Automation
- `GET /api/automation/settings` - Get settings
- `PUT /api/automation/settings` - Update settings
- `POST /api/automation/toggle` - Enable/disable automation
- `GET /api/automation/logs` - Get activity logs

### Cron Jobs
- `POST /api/cron/daily-scraping` - Daily job scraping
- `POST /api/cron/auto-apply` - Automated applications

## 🎨 UI Components

Built with shadcn/ui and Tailwind CSS:
- Button, Input, Textarea
- Select, Checkbox, Switch
- Card, Dialog, Dropdown
- Toast, Alert, Badge
- Progress, Skeleton
- Charts (Chart.js/Recharts)

## 🧪 Testing

```bash
# Run type check
npm run type-check

# Run linter
npm run lint

# Build for production
npm run build
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Manual Deployment

```bash
npm run build
npm start
```

## 📝 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | Your application URL |
| `NEXTAUTH_SECRET` | Yes | Secret for NextAuth (min 32 chars) |
| `ENCRYPTION_KEY` | Yes | 32-character encryption key |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GEMINI_API_KEY` | No | Google Gemini for AI features |
| `RESEND_API_KEY` | No | Resend API for emails |
| `TWOCAPTCHA_API_KEY` | No | 2Captcha for solving captchas |
| `REDIS_URL` | No | Redis URL for Bull Queue |

## 🔐 Security Best Practices

1. **Never commit `.env.local`** - Keep credentials secret
2. **Use strong encryption key** - Generate with secure random generator
3. **Use NextAuth best practices** - Secure session management
4. **Rotate credentials** - Regularly update API keys and secrets
5. **Monitor logs** - Check `automation_logs` for suspicious activity
6. **Limit permissions** - Use least privilege principle
7. **HTTPS only** - Never use HTTP in production

## 🐛 Troubleshooting

### Database connection issues
- Verify Neon connection string
- Check DATABASE_URL in .env.local
- Ensure database schema is pushed (npm run db:push)

### Authentication errors
- Clear browser cookies and cache
- Check email verification status
- Verify OAuth redirect URLs

### Resume parsing fails
- Ensure file is PDF or DOCX
- Check file size (<5MB)
- Try manual entry as fallback

### Application submission fails
- Verify portal credentials are valid
- Check automation logs for errors
- Ensure daily limit not reached

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 💬 Support

For support:
- Email: support@autoapply.ai
- Documentation: Check `docs/` folder
- Issues: Create GitHub issue

## 🎯 Roadmap

### Phase 1 (Current)
- [x] Core authentication
- [x] Profile setup wizard
- [x] Resume parsing
- [x] Job matching algorithm
- [x] Dashboard analytics

### Phase 2 (Next)
- [ ] AI cover letter generator
- [ ] Application status tracking
- [ ] Chrome extension
- [ ] Mobile app (React Native)
- [ ] Interview preparation tools

### Phase 3 (Future)
- [ ] Referral network
- [ ] Salary negotiation helper
- [ ] Company research assistant
- [ ] Multi-language support
- [ ] Advanced analytics

## ⚠️ Disclaimer

This tool is designed to assist with job applications. Users are responsible for:
- Ensuring compliance with job portal Terms of Service
- Verifying application accuracy
- Responding to interview requests promptly
- Following up on applications

Automated applications should supplement, not replace, personal job search efforts.

---

**Built with ❤️ using Next.js, TypeScript, Supabase, and TailwindCSS**
