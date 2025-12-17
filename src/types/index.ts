// Database Types
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface CandidateProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  resume_url?: string;
  profile_photo_url?: string;
  summary?: string;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  profile_id: string;
  skill_name: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_of_experience: number;
  created_at: string;
}

export interface Experience {
  id: string;
  profile_id: string;
  company_name: string;
  position: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  description?: string;
  location?: string;
  created_at: string;
}

export interface Education {
  id: string;
  profile_id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  grade?: string;
  created_at: string;
}

export interface Certification {
  id: string;
  profile_id: string;
  name: string;
  issuing_organization: string;
  issue_date: string;
  expiry_date?: string;
  credential_url?: string;
  created_at: string;
}

export interface JobPreferences {
  id: string;
  profile_id: string;
  job_titles: string[];
  job_types: string[];
  industries: string[];
  locations: string[];
  salary_min?: number;
  salary_max?: number;
  work_authorization?: string;
  willing_to_relocate: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobPortal {
  id: string;
  name: string;
  base_url: string;
  is_active: boolean;
  requires_auth: boolean;
  scraping_enabled: boolean;
  api_available: boolean;
  created_at: string;
}

export interface PortalCredential {
  id: string;
  user_id: string;
  portal_id: string;
  username: string;
  password: string; // encrypted
  auth_token?: string;
  cookies?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_used?: string;
}

export interface ScrapedJob {
  id: string;
  portal_id: string;
  job_title: string;
  company_name: string;
  location?: string;
  job_type?: string;
  salary_range?: string;
  description?: string;
  requirements?: string;
  job_url: string;
  apply_url?: string;
  posted_date?: string;
  scraped_at: string;
  is_active: boolean;
  created_at: string;
}

export interface JobApplication {
  id: string;
  user_id: string;
  job_id: string;
  status: 'pending' | 'applied' | 'failed' | 'duplicate';
  applied_at: string;
  error_message?: string;
  application_data?: Record<string, any>;
  response_data?: Record<string, any>;
}

export interface AutomationLog {
  id: string;
  user_id?: string;
  action_type: 'scrape' | 'apply' | 'error' | 'system';
  portal_name?: string;
  status: string;
  message: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AutomationSettings {
  id: string;
  user_id: string;
  is_enabled: boolean;
  daily_application_limit: number;
  preferred_application_time: string;
  auto_apply_enabled: boolean;
  notification_email?: string;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  daily_summary: boolean;
  weekly_report: boolean;
  errors: boolean;
  matches: boolean;
}

export interface JobMatch {
  id: string;
  user_id: string;
  job_id: string;
  match_score: number;
  match_details?: MatchDetails;
  created_at: string;
}

export interface MatchDetails {
  skills_score: number;
  title_score: number;
  location_score: number;
  experience_score: number;
  salary_score: number;
  matched_skills: string[];
  total_skills: number;
}

// Form Types
export interface ProfileSetupStep1 {
  full_name: string;
  phone: string;
  location: string;
  linkedin_url?: string;
  portfolio_url?: string;
}

export interface ProfileSetupStep2 {
  resume_file?: File;
  resume_url?: string;
}

export interface ProfileSetupStep3 {
  skills: Skill[];
}

export interface ProfileSetupStep4 {
  experiences: Experience[];
}

export interface ProfileSetupStep5 {
  education: Education[];
}

export interface ProfileSetupStep6 {
  certifications: Certification[];
}

export interface ProfileSetupStep7 {
  job_preferences: Partial<JobPreferences>;
}

export interface ProfileSetupStep8 {
  portal_credentials: Partial<PortalCredential>[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Dashboard Stats
export interface DashboardStats {
  total_applications: number;
  this_week_applications: number;
  success_rate: number;
  active_portals: number;
  recent_applications: JobApplicationWithDetails[];
  top_matched_jobs: JobWithMatch[];
}

export interface JobApplicationWithDetails extends JobApplication {
  job: ScrapedJob;
  portal: JobPortal;
}

export interface JobWithMatch extends ScrapedJob {
  match_score: number;
  match_details?: MatchDetails;
}

// Scraping Types
export interface ScraperConfig {
  portal: JobPortal;
  credentials?: PortalCredential;
  searchParams: JobSearchParams;
}

export interface JobSearchParams {
  keywords: string[];
  locations: string[];
  jobType?: string;
  salaryMin?: number;
  experienceLevel?: string;
  datePosted?: 'day' | 'week' | 'month';
  limit?: number;
}

export interface ScraperResult {
  success: boolean;
  jobs: ScrapedJob[];
  error?: string;
  portal: string;
  scrapedCount: number;
  duplicateCount: number;
}

// Application Types
export interface ApplicationRequest {
  job_id: string;
  user_id: string;
  profile: CandidateProfile;
  resume_url: string;
}

export interface ApplicationResult {
  success: boolean;
  job_id: string;
  status: 'applied' | 'failed';
  error?: string;
  confirmation?: string;
}

// Resume Parsing Types
export interface ParsedResume {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills: string[];
  experience: Partial<Experience>[];
  education: Partial<Education>[];
  certifications: Partial<Certification>[];
}

// Job Matching Types
export interface MatchingCriteria {
  skills: string[];
  experience_years: number;
  preferred_titles: string[];
  preferred_locations: string[];
  salary_expectation: {
    min?: number;
    max?: number;
  };
}

export interface MatchScoreBreakdown {
  skills_match: number;
  title_match: number;
  location_match: number;
  experience_match: number;
  salary_match: number;
  total_score: number;
  matched_skills: string[];
  missing_skills: string[];
}
