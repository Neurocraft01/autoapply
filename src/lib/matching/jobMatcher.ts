import {
  Skill,
  ScrapedJob,
  JobPreferences,
  MatchScoreBreakdown,
  MatchingCriteria,
  Experience,
} from '@/types';

/**
 * Calculate job match score based on multiple criteria
 * 
 * Scoring weights:
 * - Skills match: 40%
 * - Job title match: 25%
 * - Location match: 15%
 * - Experience level: 10%
 * - Salary match: 10%
 */
export function calculateJobMatchScore(
  job: ScrapedJob,
  criteria: MatchingCriteria
): MatchScoreBreakdown {
  const skillsScore = calculateSkillsMatch(job, criteria.skills);
  const titleScore = calculateTitleMatch(job.job_title, criteria.preferred_titles);
  const locationScore = calculateLocationMatch(job.location, criteria.preferred_locations);
  const experienceScore = calculateExperienceMatch(job, criteria.experience_years);
  const salaryScore = calculateSalaryMatch(job.salary_range, criteria.salary_expectation);

  // Weighted total score
  const totalScore = Math.round(
    skillsScore.score * 0.40 +
    titleScore * 0.25 +
    locationScore * 0.15 +
    experienceScore * 0.10 +
    salaryScore * 0.10
  );

  return {
    skills_match: skillsScore.score,
    title_match: titleScore,
    location_match: locationScore,
    experience_match: experienceScore,
    salary_match: salaryScore,
    total_score: totalScore,
    matched_skills: skillsScore.matched,
    missing_skills: skillsScore.missing,
  };
}

/**
 * Calculate skills match percentage
 */
function calculateSkillsMatch(
  job: ScrapedJob,
  userSkills: string[]
): { score: number; matched: string[]; missing: string[] } {
  if (!job.requirements && !job.description) {
    return { score: 50, matched: [], missing: [] }; // Default score if no requirements
  }

  const jobText = `${job.requirements || ''} ${job.description || ''}`.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];

  // Normalize user skills
  const normalizedUserSkills = userSkills.map((skill) => skill.toLowerCase().trim());

  // Check each user skill against job requirements
  normalizedUserSkills.forEach((skill) => {
    if (jobText.includes(skill)) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  });

  // Extract potential required skills from job text (common tech skills)
  const commonSkills = [
    'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue',
    'node', 'express', 'django', 'flask', 'spring', 'sql', 'mongodb', 'postgresql',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'agile', 'scrum',
  ];

  const requiredSkills = commonSkills.filter((skill) => jobText.includes(skill));
  const skillsIntersection = requiredSkills.filter((skill) =>
    normalizedUserSkills.includes(skill)
  );

  // Calculate score based on matched vs required
  let score = 0;
  if (requiredSkills.length > 0) {
    score = (skillsIntersection.length / requiredSkills.length) * 100;
  } else if (matched.length > 0) {
    score = Math.min((matched.length / normalizedUserSkills.length) * 100, 100);
  } else {
    score = 40; // Default if no clear requirements
  }

  return {
    score: Math.round(score),
    matched,
    missing,
  };
}

/**
 * Calculate job title match using fuzzy matching
 */
function calculateTitleMatch(jobTitle: string, preferredTitles: string[]): number {
  if (preferredTitles.length === 0) return 50; // Default if no preferences

  const normalizedJobTitle = jobTitle.toLowerCase().trim();
  
  // Extract keywords from job title
  const jobKeywords = normalizedJobTitle
    .split(/[\s\-\/]+/)
    .filter((word) => word.length > 2);

  let maxScore = 0;

  preferredTitles.forEach((preferredTitle) => {
    const normalizedPreferred = preferredTitle.toLowerCase().trim();
    
    // Exact match
    if (normalizedJobTitle === normalizedPreferred) {
      maxScore = Math.max(maxScore, 100);
      return;
    }

    // Partial match
    if (normalizedJobTitle.includes(normalizedPreferred) || normalizedPreferred.includes(normalizedJobTitle)) {
      maxScore = Math.max(maxScore, 90);
      return;
    }

    // Keyword matching
    const preferredKeywords = normalizedPreferred.split(/[\s\-\/]+/);
    const matchedKeywords = preferredKeywords.filter((keyword) =>
      jobKeywords.some((jobKeyword) => 
        jobKeyword.includes(keyword) || keyword.includes(jobKeyword)
      )
    );

    const keywordScore = (matchedKeywords.length / preferredKeywords.length) * 80;
    maxScore = Math.max(maxScore, keywordScore);
  });

  return Math.round(maxScore);
}

/**
 * Calculate location match
 */
function calculateLocationMatch(
  jobLocation: string | undefined,
  preferredLocations: string[]
): number {
  if (!jobLocation) return 70; // Default for remote/unspecified
  if (preferredLocations.length === 0) return 70;

  const normalizedJobLocation = jobLocation.toLowerCase().trim();

  // Check for remote keywords
  if (normalizedJobLocation.includes('remote') || normalizedJobLocation.includes('anywhere')) {
    return 100;
  }

  // Check against preferred locations
  for (const preferred of preferredLocations) {
    const normalizedPreferred = preferred.toLowerCase().trim();
    
    // Exact match
    if (normalizedJobLocation === normalizedPreferred) return 100;
    
    // City/State match
    if (normalizedJobLocation.includes(normalizedPreferred) || normalizedPreferred.includes(normalizedJobLocation)) {
      return 90;
    }

    // Check if same country/region (basic check)
    const jobParts = normalizedJobLocation.split(',').map((s) => s.trim());
    const prefParts = normalizedPreferred.split(',').map((s) => s.trim());
    
    const commonParts = jobParts.filter((part) => prefParts.includes(part));
    if (commonParts.length > 0) {
      return 70;
    }
  }

  return 30; // Different location
}

/**
 * Calculate experience level match
 */
function calculateExperienceMatch(job: ScrapedJob, userExperienceYears: number): number {
  const jobText = `${job.requirements || ''} ${job.description || ''}`.toLowerCase();

  // Extract experience requirements from text
  const experiencePatterns = [
    /(\d+)\+?\s*years?\s*(of\s*)?experience/gi,
    /(\d+)\s*to\s*(\d+)\s*years/gi,
    /minimum\s*(\d+)\s*years/gi,
  ];

  let requiredYears: number | null = null;

  for (const pattern of experiencePatterns) {
    const match = pattern.exec(jobText);
    if (match) {
      requiredYears = parseInt(match[1], 10);
      break;
    }
  }

  // Check for entry-level/junior keywords
  if (!requiredYears) {
    if (jobText.includes('entry level') || jobText.includes('junior') || jobText.includes('graduate')) {
      requiredYears = 1;
    } else if (jobText.includes('senior') || jobText.includes('lead')) {
      requiredYears = 5;
    } else if (jobText.includes('mid-level') || jobText.includes('intermediate')) {
      requiredYears = 3;
    }
  }

  if (!requiredYears) return 70; // Default if can't determine

  // Calculate score based on experience gap
  const difference = Math.abs(userExperienceYears - requiredYears);
  
  if (difference === 0) return 100;
  if (difference <= 1) return 90;
  if (difference <= 2) return 75;
  if (difference <= 3) return 60;
  if (difference <= 5) return 40;
  return 20;
}

/**
 * Calculate salary match
 */
function calculateSalaryMatch(
  jobSalaryRange: string | undefined,
  userExpectation: { min?: number; max?: number }
): number {
  if (!jobSalaryRange) return 70; // Default if salary not specified
  if (!userExpectation.min && !userExpectation.max) return 70;

  // Extract salary numbers from range
  const numbers = jobSalaryRange.match(/\d+/g);
  if (!numbers || numbers.length === 0) return 70;

  let jobMin = parseInt(numbers[0], 10);
  let jobMax = numbers.length > 1 ? parseInt(numbers[1], 10) : jobMin;

  // Handle K notation
  if (jobSalaryRange.toLowerCase().includes('k')) {
    jobMin *= 1000;
    jobMax *= 1000;
  }

  const userMin = userExpectation.min || 0;
  const userMax = userExpectation.max || Infinity;

  // Check overlap
  const hasOverlap = !(jobMax < userMin || jobMin > userMax);
  if (!hasOverlap) return 20;

  // Calculate overlap percentage
  const overlapStart = Math.max(jobMin, userMin);
  const overlapEnd = Math.min(jobMax, userMax);
  const overlapRange = overlapEnd - overlapStart;
  
  const userRange = userMax - userMin;
  const jobRange = jobMax - jobMin;
  const avgRange = (userRange + jobRange) / 2;

  const overlapPercentage = (overlapRange / avgRange) * 100;

  return Math.min(Math.round(overlapPercentage), 100);
}

/**
 * Calculate total years of experience from experience array
 */
export function calculateTotalExperience(experiences: Experience[]): number {
  let totalMonths = 0;

  experiences.forEach((exp) => {
    const startDate = new Date(exp.start_date);
    const endDate = exp.end_date ? new Date(exp.end_date) : new Date();
    
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                   (endDate.getMonth() - startDate.getMonth());
    
    totalMonths += months;
  });

  return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal
}

/**
 * Extract skills from user's skill list for matching
 */
export function extractUserSkills(skills: Skill[]): string[] {
  return skills.map((skill) => skill.skill_name);
}

/**
 * Build matching criteria from user profile and preferences
 */
export function buildMatchingCriteria(
  skills: Skill[],
  experiences: Experience[],
  preferences: JobPreferences
): MatchingCriteria {
  return {
    skills: extractUserSkills(skills),
    experience_years: calculateTotalExperience(experiences),
    preferred_titles: preferences.job_titles,
    preferred_locations: preferences.locations,
    salary_expectation: {
      min: preferences.salary_min,
      max: preferences.salary_max,
    },
  };
}

/**
 * Filter jobs by minimum match score
 */
export function filterJobsByMatchScore(
  jobs: ScrapedJob[],
  criteria: MatchingCriteria,
  minScore: number = 60
): Array<ScrapedJob & { match_score: number; match_details: MatchScoreBreakdown }> {
  return jobs
    .map((job) => {
      const matchDetails = calculateJobMatchScore(job, criteria);
      return {
        ...job,
        match_score: matchDetails.total_score,
        match_details: matchDetails,
      };
    })
    .filter((job) => job.match_score >= minScore)
    .sort((a, b) => b.match_score - a.match_score);
}
