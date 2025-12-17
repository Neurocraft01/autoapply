-- Seed script for AutoApply.ai
-- Run this AFTER running the main schema migration (001_initial_schema.sql)

-- Insert popular job portals
INSERT INTO job_portals (name, url, base_url, logo_url, is_active, requires_captcha, supports_easy_apply) VALUES
('LinkedIn', 'https://www.linkedin.com/jobs', 'https://www.linkedin.com', 'https://logo.clearbit.com/linkedin.com', true, true, true),
('Indeed', 'https://www.indeed.com', 'https://www.indeed.com', 'https://logo.clearbit.com/indeed.com', true, false, false),
('Glassdoor', 'https://www.glassdoor.com/Job', 'https://www.glassdoor.com', 'https://logo.clearbit.com/glassdoor.com', true, true, false),
('ZipRecruiter', 'https://www.ziprecruiter.com', 'https://www.ziprecruiter.com', 'https://logo.clearbit.com/ziprecruiter.com', true, false, true),
('AngelList', 'https://wellfound.com/jobs', 'https://wellfound.com', 'https://logo.clearbit.com/wellfound.com', true, false, true),
('Monster', 'https://www.monster.com/jobs', 'https://www.monster.com', 'https://logo.clearbit.com/monster.com', true, false, false),
('CareerBuilder', 'https://www.careerbuilder.com', 'https://www.careerbuilder.com', 'https://logo.clearbit.com/careerbuilder.com', true, false, false),
('SimplyHired', 'https://www.simplyhired.com', 'https://www.simplyhired.com', 'https://logo.clearbit.com/simplyhired.com', true, false, false)
ON CONFLICT (name) DO UPDATE SET
  url = EXCLUDED.url,
  logo_url = EXCLUDED.logo_url,
  is_active = EXCLUDED.is_active;

-- Create a test user function (for development only)
-- DO NOT USE IN PRODUCTION
CREATE OR REPLACE FUNCTION create_test_profile(
  test_user_id UUID,
  test_email TEXT
)
RETURNS void AS $$
BEGIN
  -- Insert test profile
  INSERT INTO candidate_profiles (
    user_id,
    full_name,
    phone,
    location,
    linkedin_url,
    portfolio_url,
    bio
  ) VALUES (
    test_user_id,
    'Test User',
    '+1 (555) 123-4567',
    'San Francisco, CA',
    'https://linkedin.com/in/testuser',
    'https://testuser.com',
    'Experienced software developer looking for new opportunities in web development.'
  );

  -- Insert test skills
  INSERT INTO skills (profile_id, skill_name, proficiency_level, years_of_experience)
  SELECT 
    cp.id,
    unnest(ARRAY['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'AWS']),
    unnest(ARRAY['expert', 'expert', 'advanced', 'advanced', 'intermediate', 'advanced', 'expert', 'intermediate']),
    unnest(ARRAY[5, 4, 4, 3, 2, 4, 6, 2])
  FROM candidate_profiles cp
  WHERE cp.user_id = test_user_id;

  -- Insert test experience
  INSERT INTO experience (
    profile_id,
    job_title,
    company_name,
    location,
    start_date,
    end_date,
    is_current,
    description
  )
  SELECT 
    cp.id,
    'Senior Software Engineer',
    'Tech Company Inc.',
    'San Francisco, CA',
    '2020-01-01',
    NULL,
    true,
    'Leading development of web applications using React and Node.js. Mentoring junior developers and architecting scalable solutions.'
  FROM candidate_profiles cp
  WHERE cp.user_id = test_user_id;

  -- Insert test education
  INSERT INTO education (
    profile_id,
    institution_name,
    degree,
    field_of_study,
    start_date,
    end_date,
    gpa
  )
  SELECT 
    cp.id,
    'University of California, Berkeley',
    'Bachelor of Science',
    'Computer Science',
    '2012-09-01',
    '2016-05-31',
    3.8
  FROM candidate_profiles cp
  WHERE cp.user_id = test_user_id;

  -- Insert job preferences
  INSERT INTO job_preferences (
    profile_id,
    desired_job_titles,
    preferred_locations,
    min_salary,
    max_salary,
    job_types,
    work_modes,
    industries,
    company_sizes
  )
  SELECT 
    cp.id,
    ARRAY['Software Engineer', 'Full Stack Developer', 'Frontend Developer'],
    ARRAY['San Francisco, CA', 'Remote', 'New York, NY'],
    100000,
    180000,
    ARRAY['full-time', 'contract'],
    ARRAY['remote', 'hybrid'],
    ARRAY['Technology', 'Software', 'Internet'],
    ARRAY['startup', 'medium', 'large']
  FROM candidate_profiles cp
  WHERE cp.user_id = test_user_id;

  -- Insert automation settings
  INSERT INTO automation_settings (
    user_id,
    auto_apply_enabled,
    max_applications_per_day,
    application_interval_minutes,
    business_hours_only,
    min_match_score
  ) VALUES (
    test_user_id,
    false, -- Disabled by default
    25,
    30,
    true,
    70
  );

  RAISE NOTICE 'Test profile created successfully for user %', test_email;
END;
$$ LANGUAGE plpgsql;

-- Example usage (uncomment and modify with your test user ID):
-- SELECT create_test_profile('your-user-uuid-here'::uuid, 'test@example.com');

-- Sample job data for testing matching algorithm
-- Uncomment to create sample jobs
/*
INSERT INTO scraped_jobs (
  portal_id,
  job_title,
  company_name,
  location,
  job_url,
  job_description,
  salary_range,
  job_type,
  experience_level,
  required_skills,
  posted_date
)
SELECT 
  (SELECT id FROM job_portals WHERE name = 'LinkedIn' LIMIT 1),
  title,
  company,
  loc,
  'https://linkedin.com/jobs/view/' || floor(random() * 1000000),
  description,
  salary,
  'full-time',
  level,
  skills,
  NOW() - (random() * interval '7 days')
FROM (
  VALUES
    ('Senior Frontend Developer', 'Google', 'Mountain View, CA', 'Looking for an experienced React developer...', '$150,000 - $200,000', 'senior', ARRAY['React', 'TypeScript', 'JavaScript']),
    ('Full Stack Engineer', 'Meta', 'Menlo Park, CA', 'Join our team building the metaverse...', '$140,000 - $190,000', 'mid-senior', ARRAY['React', 'Node.js', 'GraphQL']),
    ('Software Engineer', 'Amazon', 'Seattle, WA', 'Build scalable systems at Amazon scale...', '$130,000 - $180,000', 'mid', ARRAY['Java', 'Python', 'AWS']),
    ('Frontend Developer', 'Netflix', 'Los Gatos, CA', 'Create amazing user experiences...', '$145,000 - $195,000', 'senior', ARRAY['React', 'JavaScript', 'CSS']),
    ('Backend Engineer', 'Stripe', 'San Francisco, CA', 'Build payment infrastructure...', '$150,000 - $210,000', 'senior', ARRAY['Python', 'Go', 'SQL'])
) AS jobs(title, company, loc, description, salary, level, skills);
*/

-- Verify data
SELECT 'Job Portals:', COUNT(*) FROM job_portals;
SELECT 'Profiles:', COUNT(*) FROM candidate_profiles;
SELECT 'Skills:', COUNT(*) FROM skills;
SELECT 'Jobs:', COUNT(*) FROM scraped_jobs;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Seed data inserted successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create a user account in your app';
  RAISE NOTICE '2. Use create_test_profile() function to add test data';
  RAISE NOTICE '3. Start testing job matching and applications';
END $$;
