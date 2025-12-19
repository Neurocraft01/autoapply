import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, varchar } from 'drizzle-orm/pg-core';

// Users table (managed by NextAuth)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: text('name'),
  password: text('password'), // For credentials authentication
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// NextAuth tables
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires').notNull(),
});

// User profiles
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name'),
  phone: varchar('phone', { length: 20 }),
  location: text('location'),
  currentTitle: text('current_title'),
  yearsOfExperience: integer('years_of_experience'),
  resumeUrl: text('resume_url'),
  linkedinUrl: text('linkedin_url'),
  githubUrl: text('github_url'),
  portfolioUrl: text('portfolio_url'),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Skills
export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category'),
  proficiencyLevel: integer('proficiency_level').default(3),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Job portals (master list of available platforms)
export const jobPortals = pgTable('job_portals', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  url: text('url').notNull(),
  logoUrl: text('logo_url'),
  isActive: boolean('is_active').default(true).notNull(),
  requiresAuth: boolean('requires_auth').default(true).notNull(),
  scrapingEnabled: boolean('scraping_enabled').default(true).notNull(),
  apiAvailable: boolean('api_available').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Portal credentials (user's login info for each platform)
export const portalCredentials = pgTable('portal_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  portalId: uuid('portal_id').notNull().references(() => jobPortals.id, { onDelete: 'cascade' }),
  username: text('username').notNull(),
  encryptedPassword: text('encrypted_password').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Jobs
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  portalId: uuid('portal_id').references(() => jobPortals.id),
  jobTitle: text('job_title').notNull(),
  companyName: text('company_name').notNull(),
  location: text('location'),
  jobType: text('job_type'),
  workplaceType: text('workplace_type'),
  description: text('description'),
  requirements: text('requirements'),
  salary: text('salary'),
  jobUrl: text('job_url').notNull(),
  companyLogo: text('company_logo'),
  isActive: boolean('is_active').default(true).notNull(),
  postedDate: timestamp('posted_date'),
  expiryDate: timestamp('expiry_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Job matches
export const jobMatches = pgTable('job_matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  matchScore: integer('match_score').notNull(),
  matchReasons: jsonb('match_reasons'),
  status: text('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Applications
export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  jobMatchId: uuid('job_match_id').references(() => jobMatches.id),
  status: text('status').default('pending').notNull(),
  appliedVia: text('applied_via'),
  appliedAt: timestamp('applied_at'),
  resumeUsed: text('resume_used'),
  coverLetter: text('cover_letter'),
  screeningAnswers: jsonb('screening_answers'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Automation settings
export const automationSettings = pgTable('automation_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  autoApplyEnabled: boolean('auto_apply_enabled').default(false).notNull(),
  maxDailyApplications: integer('max_daily_applications').default(10).notNull(),
  minMatchScore: integer('min_match_score').default(70).notNull(),
  preferredJobTypes: jsonb('preferred_job_types'),
  preferredLocations: jsonb('preferred_locations'),
  excludedCompanies: jsonb('excluded_companies'),
  salaryExpectations: jsonb('salary_expectations'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Notification settings
export const notificationSettings = pgTable('notification_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  matchNotifications: boolean('match_notifications').default(true).notNull(),
  applicationNotifications: boolean('application_notifications').default(true).notNull(),
  weeklyDigest: boolean('weekly_digest').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Automation logs
export const automationLogs = pgTable('automation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  status: text('status').notNull(),
  details: jsonb('details'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Job queue
export const jobQueue = pgTable('job_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  status: text('status').default('pending').notNull(),
  priority: integer('priority').default(5).notNull(),
  scheduledFor: timestamp('scheduled_for'),
  processedAt: timestamp('processed_at'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
