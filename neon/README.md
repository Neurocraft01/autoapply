# Neon Database Setup Instructions

## Prerequisites
- Neon account (https://neon.tech)
- Node.js installed

## Steps

### 1. Create Neon Project
1. Go to https://console.neon.tech
2. Click "Create Project"
3. Choose a name for your project
4. Select your region
5. Click "Create Project"

### 2. Get Database Connection String
1. In your Neon project dashboard
2. Go to "Connection Details"
3. Copy the connection string (it should look like):
   ```
   postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this for your environment variables

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Environment Variables
1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Update `.env.local` with your Neon credentials:
   ```env
   DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   NEXTAUTH_URL=http://localhost:3001
   NEXTAUTH_SECRET=your_nextauth_secret_key_min_32_chars
   ```

3. Generate a NEXTAUTH_SECRET:
   ```bash
   openssl rand -base64 32
   ```

### 5. Push Database Schema
Run the Drizzle migration to create all tables:
```bash
npx drizzle-kit push:pg
```

This will create all the necessary tables in your Neon database:
- users (managed by NextAuth)
- accounts (NextAuth)
- sessions (NextAuth)
- verification_tokens (NextAuth)
- profiles
- skills
- job_portals
- jobs
- job_matches
- applications
- automation_settings
- notification_settings
- automation_logs
- job_queue

### 6. Verify Database Setup
You can verify the tables were created by:
1. Going to your Neon console
2. Navigating to the SQL Editor
3. Running: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`

## Database Schema Overview

### Authentication Tables (NextAuth)
- **users**: User accounts
- **accounts**: OAuth provider accounts
- **sessions**: User sessions
- **verification_tokens**: Email verification tokens

### Application Tables
- **profiles**: User profile information
- **skills**: User skills and proficiency levels
- **job_portals**: Encrypted job portal credentials
- **jobs**: Job listings from scraped sources
- **job_matches**: AI-powered job matches with scores
- **applications**: Job application tracking
- **automation_settings**: User automation preferences
- **notification_settings**: User notification preferences
- **automation_logs**: Automation activity logs
- **job_queue**: Job application queue

## Drizzle Studio (Optional)
To visually explore and edit your database:
```bash
npx drizzle-kit studio
```

This will open a web interface at http://localhost:4983

## Migrations
If you need to modify the schema:
1. Update `src/lib/db/schema.ts`
2. Generate migration:
   ```bash
   npx drizzle-kit generate:pg
   ```
3. Push changes:
   ```bash
   npx drizzle-kit push:pg
   ```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | Your application URL |
| `NEXTAUTH_SECRET` | Yes | Secret for NextAuth (min 32 chars) |
| `GOOGLE_CLIENT_ID` | No | For Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | For Google OAuth |

## Next Steps
After completing Neon setup:
1. Run the development server: `npm run dev`
2. Visit http://localhost:3001
3. Sign up for an account
4. Complete your profile setup

## Troubleshooting

### Connection Issues
- Ensure your IP is whitelisted in Neon (Settings > IP Allow)
- Verify the connection string includes `?sslmode=require`
- Check that the DATABASE_URL is correctly set in `.env.local`

### Schema Issues
- If tables aren't created, try running `npx drizzle-kit push:pg` again
- Check Neon dashboard for any error messages
- Ensure your connection string has proper permissions

## Resources
- Neon Docs: https://neon.tech/docs
- Drizzle ORM Docs: https://orm.drizzle.team
- NextAuth.js Docs: https://next-auth.js.org
