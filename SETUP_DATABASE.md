# Database Setup Instructions

Your Supabase database needs to have the tables created. Follow these steps:

## Quick Setup

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/gxgdefktpnxlwxgnervr

2. Click on **SQL Editor** in the left sidebar

3. Click **New Query**

4. Copy and paste the contents of these files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/006_job_queue.sql`

5. Click **Run** for each query

## Alternative: Run All Migrations

Copy the entire content below and run it in the SQL Editor:

```sql
-- Run this complete migration in Supabase SQL Editor
-- This creates all necessary tables for the application
```

Then paste the contents from:
1. First: `supabase/migrations/001_initial_schema.sql`
2. Then: `supabase/migrations/006_job_queue.sql`

## Verify Setup

After running the migrations, verify the tables exist by running:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see these tables:
- automation_logs
- automation_settings
- candidate_profiles
- certifications
- education
- experience
- job_applications
- job_matches
- job_portals
- job_preferences
- job_queue
- notification_settings
- portal_credentials
- scraped_jobs
- skills

## Direct Link

Navigate here to run the SQL:
https://supabase.com/dashboard/project/gxgdefktpnxlwxgnervr/sql/new
