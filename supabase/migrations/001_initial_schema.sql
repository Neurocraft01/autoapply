-- AutoApply.ai Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: users (handled by Supabase Auth)
-- =====================================================
-- Users table is automatically created by Supabase Auth
-- We'll extend it with a profiles table

-- =====================================================
-- TABLE: candidate_profiles
-- =====================================================
CREATE TABLE candidate_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  resume_url TEXT,
  profile_photo_url TEXT,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: skills
-- =====================================================
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  skill_name TEXT NOT NULL,
  proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_of_experience INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: experience
-- =====================================================
CREATE TABLE experience (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: education
-- =====================================================
CREATE TABLE education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field_of_study TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: certifications
-- =====================================================
CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  issuing_organization TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  credential_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: job_preferences
-- =====================================================
CREATE TABLE job_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  job_titles TEXT[] DEFAULT '{}',
  job_types TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  locations TEXT[] DEFAULT '{}',
  salary_min INTEGER,
  salary_max INTEGER,
  work_authorization TEXT,
  willing_to_relocate BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: job_portals
-- =====================================================
CREATE TABLE job_portals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  base_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  requires_auth BOOLEAN DEFAULT TRUE,
  scraping_enabled BOOLEAN DEFAULT TRUE,
  api_available BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default job portals
INSERT INTO job_portals (name, base_url, requires_auth, api_available) VALUES
  ('LinkedIn', 'https://www.linkedin.com/jobs', TRUE, TRUE),
  ('Indeed', 'https://www.indeed.com', TRUE, TRUE),
  ('Naukri', 'https://www.naukri.com', TRUE, FALSE),
  ('Monster', 'https://www.monster.com', TRUE, FALSE),
  ('Glassdoor', 'https://www.glassdoor.com', TRUE, FALSE),
  ('AngelList', 'https://angel.co/jobs', TRUE, FALSE),
  ('Dice', 'https://www.dice.com', TRUE, FALSE),
  ('SimplyHired', 'https://www.simplyhired.com', FALSE, FALSE);

-- =====================================================
-- TABLE: portal_credentials
-- =====================================================
CREATE TABLE portal_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  portal_id UUID REFERENCES job_portals(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL, -- encrypted
  auth_token TEXT,
  cookies JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, portal_id)
);

-- =====================================================
-- TABLE: scraped_jobs
-- =====================================================
CREATE TABLE scraped_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id UUID REFERENCES job_portals(id) ON DELETE CASCADE NOT NULL,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  job_type TEXT,
  salary_range TEXT,
  description TEXT,
  requirements TEXT,
  job_url TEXT UNIQUE NOT NULL,
  apply_url TEXT,
  posted_date DATE,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster job searches
CREATE INDEX idx_scraped_jobs_active ON scraped_jobs(is_active);
CREATE INDEX idx_scraped_jobs_portal ON scraped_jobs(portal_id);
CREATE INDEX idx_scraped_jobs_title ON scraped_jobs(job_title);
CREATE INDEX idx_scraped_jobs_company ON scraped_jobs(company_name);

-- =====================================================
-- TABLE: job_applications
-- =====================================================
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES scraped_jobs(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'applied', 'failed', 'duplicate')) DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  application_data JSONB,
  response_data JSONB,
  UNIQUE(user_id, job_id)
);

-- Create indexes for application queries
CREATE INDEX idx_applications_user ON job_applications(user_id);
CREATE INDEX idx_applications_status ON job_applications(status);
CREATE INDEX idx_applications_date ON job_applications(applied_at);

-- =====================================================
-- TABLE: automation_logs
-- =====================================================
CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('scrape', 'apply', 'error', 'system')),
  portal_name TEXT,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for log queries
CREATE INDEX idx_logs_user ON automation_logs(user_id);
CREATE INDEX idx_logs_date ON automation_logs(created_at);
CREATE INDEX idx_logs_type ON automation_logs(action_type);

-- =====================================================
-- TABLE: automation_settings
-- =====================================================
CREATE TABLE automation_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  daily_application_limit INTEGER DEFAULT 20 CHECK (daily_application_limit BETWEEN 5 AND 50),
  preferred_application_time TIME DEFAULT '09:00:00',
  auto_apply_enabled BOOLEAN DEFAULT TRUE,
  notification_email TEXT,
  notification_preferences JSONB DEFAULT '{"daily_summary": true, "weekly_report": true, "errors": true, "matches": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: job_matches (for caching match scores)
-- =====================================================
CREATE TABLE job_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES scraped_jobs(id) ON DELETE CASCADE NOT NULL,
  match_score DECIMAL(5,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_details JSONB, -- stores breakdown of scoring
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Create index for match queries
CREATE INDEX idx_matches_user ON job_matches(user_id);
CREATE INDEX idx_matches_score ON job_matches(match_score DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

-- Policies for candidate_profiles
CREATE POLICY "Users can view own profile" ON candidate_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON candidate_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON candidate_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON candidate_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for skills
CREATE POLICY "Users can manage own skills" ON skills
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
  );

-- Policies for experience
CREATE POLICY "Users can manage own experience" ON experience
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
  );

-- Policies for education
CREATE POLICY "Users can manage own education" ON education
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
  );

-- Policies for certifications
CREATE POLICY "Users can manage own certifications" ON certifications
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
  );

-- Policies for job_preferences
CREATE POLICY "Users can manage own preferences" ON job_preferences
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
  );

-- Policies for portal_credentials
CREATE POLICY "Users can manage own credentials" ON portal_credentials
  FOR ALL USING (auth.uid() = user_id);

-- Policies for job_applications
CREATE POLICY "Users can view own applications" ON job_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications" ON job_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for automation_logs
CREATE POLICY "Users can view own logs" ON automation_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policies for automation_settings
CREATE POLICY "Users can manage own settings" ON automation_settings
  FOR ALL USING (auth.uid() = user_id);

-- Policies for job_matches
CREATE POLICY "Users can view own matches" ON job_matches
  FOR ALL USING (auth.uid() = user_id);

-- Public read access to job portals
CREATE POLICY "Anyone can view job portals" ON job_portals
  FOR SELECT USING (true);

-- Public read access to scraped jobs
CREATE POLICY "Anyone can view scraped jobs" ON scraped_jobs
  FOR SELECT USING (is_active = true);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_candidate_profiles_updated_at
  BEFORE UPDATE ON candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_preferences_updated_at
  BEFORE UPDATE ON job_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_settings_updated_at
  BEFORE UPDATE ON automation_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create automation settings for new users
CREATE OR REPLACE FUNCTION create_default_automation_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO automation_settings (user_id, notification_email)
  VALUES (NEW.user_id, (SELECT email FROM auth.users WHERE id = NEW.user_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create automation settings when profile is created
CREATE TRIGGER create_automation_settings_on_profile
  AFTER INSERT ON candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_automation_settings();

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================
-- Run these commands in Supabase Dashboard > Storage

-- Create buckets for file storage
-- 1. resumes
-- 2. profile_photos
-- 3. documents

-- Storage policies will be:
-- Users can upload to their own folder
-- Users can read their own files
-- Public read for profile photos (optional)
