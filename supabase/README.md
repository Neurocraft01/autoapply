# Supabase Setup Instructions

## Prerequisites
- Supabase account (https://supabase.com)
- Project created in Supabase

## Setup Steps

### 1. Create Supabase Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in project details
4. Wait for project to be provisioned

### 2. Run Database Migration
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `migrations/001_initial_schema.sql`
4. Paste into SQL Editor
5. Click "Run" to execute the migration

### 3. Create Storage Buckets
1. Go to Storage in Supabase Dashboard
2. Create the following buckets:

#### Bucket: `resumes`
- **Public**: No
- **File size limit**: 5MB
- **Allowed MIME types**: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

#### Bucket: `profile_photos`
- **Public**: Yes (for displaying avatars)
- **File size limit**: 2MB
- **Allowed MIME types**: image/jpeg, image/png, image/webp

#### Bucket: `documents`
- **Public**: No
- **File size limit**: 10MB
- **Allowed MIME types**: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

### 4. Configure Storage Policies

Run these SQL commands in the SQL Editor:

```sql
-- Resumes bucket policies
CREATE POLICY "Users can upload own resumes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own resumes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own resumes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Profile photos bucket policies
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile_photos');

CREATE POLICY "Users can upload own profile photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile_photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own profile photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile_photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own profile photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile_photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Documents bucket policies
CREATE POLICY "Users can manage own documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 5. Configure Authentication

1. Go to Authentication > Settings
2. Enable Email provider
3. Configure email templates (optional)
4. Enable Google OAuth (optional):
   - Add Google OAuth credentials
   - Configure redirect URLs
5. Enable LinkedIn OAuth (optional)

### 6. Get API Keys

1. Go to Settings > API
2. Copy the following:
   - **Project URL**: Your Supabase URL
   - **anon/public key**: For client-side usage
   - **service_role key**: For server-side usage (keep secure!)

### 7. Update Environment Variables

Create `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 8. Test Connection

Run this in your terminal:
```bash
npm install
npm run dev
```

Then test the connection by signing up a new user.

## Database Schema Overview

### Tables Created:
- `candidate_profiles` - User profile information
- `skills` - User skills with proficiency levels
- `experience` - Work experience entries
- `education` - Educational qualifications
- `certifications` - Professional certifications
- `job_preferences` - Job search preferences
- `job_portals` - Available job portals
- `portal_credentials` - Encrypted portal login credentials
- `scraped_jobs` - Jobs scraped from portals
- `job_applications` - Application tracking
- `automation_logs` - System activity logs
- `automation_settings` - User automation preferences
- `job_matches` - Cached job match scores

### Security Features:
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Users can only access their own data
- ✅ Secure storage policies
- ✅ Encrypted sensitive data
- ✅ Automatic timestamp triggers

## Troubleshooting

### Issue: Migration fails
- Check if UUID extension is enabled
- Ensure you're using PostgreSQL 12+
- Run migrations one section at a time

### Issue: RLS policies not working
- Verify user is authenticated
- Check auth.uid() is returning correct user ID
- Review policy definitions

### Issue: Storage upload fails
- Check bucket exists
- Verify storage policies are created
- Ensure file size is within limits
- Check MIME type is allowed

## Next Steps

After completing Supabase setup:
1. Install npm dependencies: `npm install`
2. Copy `.env.local.example` to `.env.local`
3. Add your Supabase credentials
4. Run development server: `npm run dev`
5. Test authentication flow
6. Create test profile

## Support

For issues:
- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: Create an issue in the project repo
