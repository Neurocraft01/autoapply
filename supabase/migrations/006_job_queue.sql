-- Create job_queue table for background job processing
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_user_id ON job_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_job_queue_type ON job_queue(type);
CREATE INDEX IF NOT EXISTS idx_job_queue_created_at ON job_queue(created_at);

-- Add matched_at column to jobs table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'matched_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN matched_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  application_confirmations BOOLEAN DEFAULT true,
  job_matches BOOLEAN DEFAULT true,
  daily_summary BOOLEAN DEFAULT true,
  error_alerts BOOLEAN DEFAULT true,
  match_threshold INTEGER DEFAULT 80 CHECK (match_threshold >= 0 AND match_threshold <= 100),
  daily_summary_time TIME DEFAULT '09:00:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- Create automation_settings table
CREATE TABLE IF NOT EXISTS automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_apply_enabled BOOLEAN DEFAULT false,
  auto_scrape_enabled BOOLEAN DEFAULT false,
  auto_match_enabled BOOLEAN DEFAULT true,
  min_match_score INTEGER DEFAULT 70 CHECK (min_match_score >= 0 AND min_match_score <= 100),
  max_applications_per_day INTEGER DEFAULT 10 CHECK (max_applications_per_day >= 0),
  scrape_frequency_hours INTEGER DEFAULT 24 CHECK (scrape_frequency_hours > 0),
  preferred_portals TEXT[] DEFAULT ARRAY['LinkedIn', 'Indeed'],
  excluded_companies TEXT[] DEFAULT ARRAY[]::TEXT[],
  auto_apply_hours_start TIME DEFAULT '09:00:00',
  auto_apply_hours_end TIME DEFAULT '17:00:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_automation_settings_user_id ON automation_settings(user_id);

-- Row Level Security for job_queue
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue jobs"
  ON job_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue jobs"
  ON job_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Row Level Security for notification_settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification settings"
  ON notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Row Level Security for automation_settings
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own automation settings"
  ON automation_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own automation settings"
  ON automation_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own automation settings"
  ON automation_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-create default settings on user signup
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO automation_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default settings
DROP TRIGGER IF EXISTS create_user_default_settings ON auth.users;
CREATE TRIGGER create_user_default_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_user_settings();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_automation_settings_updated_at ON automation_settings;
CREATE TRIGGER update_automation_settings_updated_at
  BEFORE UPDATE ON automation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE job_queue IS 'Queue for background job processing';
COMMENT ON TABLE notification_settings IS 'User email notification preferences';
COMMENT ON TABLE automation_settings IS 'User automation configuration';
