import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { ParsedResume } from '@/types';

/**
 * Parse resume file and extract structured information
 */
export async function parseResume(file: File): Promise<ParsedResume> {
  const fileType = file.type;
  let text = '';

  try {
    if (fileType === 'application/pdf') {
      text = await parsePDF(file);
    } else if (
      fileType === 'application/msword' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      text = await parseDOCX(file);
    } else {
      throw new Error('Unsupported file type. Please upload PDF or DOCX');
    }

    return extractResumeData(text);
  } catch (error) {
    console.error('Resume parsing error:', error);
    throw new Error('Failed to parse resume. Please try again or enter details manually.');
  }
}

/**
 * Parse PDF file
 */
async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const data = await pdf(buffer);
  return data.text;
}

/**
 * Parse DOCX file
 */
async function parseDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Extract structured data from resume text
 */
function extractResumeData(text: string): ParsedResume {
  return {
    name: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    location: extractLocation(text),
    summary: extractSummary(text),
    skills: extractSkills(text),
    experience: extractExperience(text),
    education: extractEducation(text),
    certifications: extractCertifications(text),
  };
}

/**
 * Extract name from resume (usually first line)
 */
function extractName(text: string): string | undefined {
  const lines = text.split('\n').filter((line) => line.trim());
  
  // Name is typically the first line and has certain characteristics
  const firstLine = lines[0]?.trim();
  if (firstLine && firstLine.length > 2 && firstLine.length < 50 && /^[a-zA-Z\s.]+$/.test(firstLine)) {
    return firstLine;
  }

  return undefined;
}

/**
 * Extract email address
 */
function extractEmail(text: string): string | undefined {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : undefined;
}

/**
 * Extract phone number
 */
function extractPhone(text: string): string | undefined {
  const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const matches = text.match(phoneRegex);
  return matches ? matches[0] : undefined;
}

/**
 * Extract location/address
 */
function extractLocation(text: string): string | undefined {
  // Look for common location patterns
  const locationPatterns = [
    /(?:City|Location|Address):\s*([^\n]+)/i,
    /([A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5})/,
    /([A-Z][a-z]+,\s*[A-Z]{2})/,
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract professional summary
 */
function extractSummary(text: string): string | undefined {
  const summaryPatterns = [
    /(?:Summary|Profile|About|Objective)[\s:]*\n([^\n]+(?:\n[^\n]+){0,3})/i,
  ];

  for (const pattern of summaryPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract skills
 */
function extractSkills(text: string): string[] {
  const skills: Set<string> = new Set();

  // Common tech skills to look for
  const commonSkills = [
    // Programming languages
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go', 'Rust',
    // Frameworks
    'React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel',
    // Databases
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'Cassandra',
    // Cloud & DevOps
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'Git', 'GitHub', 'GitLab',
    // Other
    'REST API', 'GraphQL', 'Microservices', 'Agile', 'Scrum', 'TDD', 'Unit Testing',
  ];

  const normalizedText = text.toLowerCase();

  commonSkills.forEach((skill) => {
    const skillLower = skill.toLowerCase();
    if (normalizedText.includes(skillLower)) {
      skills.add(skill);
    }
  });

  // Look for skills section
  const skillsSectionMatch = text.match(/(?:Skills|Technologies|Technical Skills)[\s:]*\n([^\n]+(?:\n[^\n]+){0,5})/i);
  if (skillsSectionMatch && skillsSectionMatch[1]) {
    const skillsText = skillsSectionMatch[1];
    const extractedSkills = skillsText.split(/[,•\-\n]/).map((s) => s.trim()).filter((s) => s.length > 2);
    extractedSkills.forEach((skill) => skills.add(skill));
  }

  return Array.from(skills);
}

/**
 * Extract work experience
 */
function extractExperience(text: string): Partial<any>[] {
  const experiences: Partial<any>[] = [];
  
  // Look for experience section
  const experienceSection = text.match(/(?:Experience|Work History|Employment)[\s:]*\n([\s\S]+?)(?=\n(?:Education|Skills|Certifications|$))/i);
  
  if (!experienceSection) return experiences;

  const experienceText = experienceSection[1];
  const entries = experienceText.split(/\n\s*\n/);

  entries.forEach((entry) => {
    const lines = entry.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return;

    // Extract company and position
    const position = lines[0]?.trim();
    const company = lines[1]?.trim();

    // Extract dates
    const dateMatch = entry.match(/(\d{4})\s*-\s*(\d{4}|present|current)/i);
    const startDate = dateMatch ? `${dateMatch[1]}-01-01` : undefined;
    const endDate = dateMatch && !['present', 'current'].includes(dateMatch[2].toLowerCase())
      ? `${dateMatch[2]}-12-31`
      : undefined;

    // Extract description
    const description = lines.slice(2).join('\n').trim();

    if (position && company) {
      experiences.push({
        position,
        company_name: company,
        start_date: startDate,
        end_date: endDate,
        is_current: !endDate,
        description: description || undefined,
      });
    }
  });

  return experiences;
}

/**
 * Extract education
 */
function extractEducation(text: string): Partial<any>[] {
  const education: Partial<any>[] = [];

  // Look for education section
  const educationSection = text.match(/(?:Education|Academic|Qualifications)[\s:]*\n([\s\S]+?)(?=\n(?:Experience|Skills|Certifications|$))/i);
  
  if (!educationSection) return education;

  const educationText = educationSection[1];
  const entries = educationText.split(/\n\s*\n/);

  entries.forEach((entry) => {
    const lines = entry.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return;

    const degree = lines[0]?.trim();
    const institution = lines[1]?.trim();

    // Extract dates
    const dateMatch = entry.match(/(\d{4})\s*-\s*(\d{4})/);
    const startDate = dateMatch ? `${dateMatch[1]}-09-01` : undefined;
    const endDate = dateMatch ? `${dateMatch[2]}-06-01` : undefined;

    // Extract field of study
    const fieldMatch = degree?.match(/in\s+([^,\n]+)/i);
    const field = fieldMatch ? fieldMatch[1].trim() : 'Not specified';

    if (degree && institution) {
      education.push({
        degree,
        institution,
        field_of_study: field,
        start_date: startDate,
        end_date: endDate,
      });
    }
  });

  return education;
}

/**
 * Extract certifications
 */
function extractCertifications(text: string): Partial<any>[] {
  const certifications: Partial<any>[] = [];

  // Look for certifications section
  const certSection = text.match(/(?:Certifications|Licenses|Credentials)[\s:]*\n([\s\S]+?)(?=\n(?:Experience|Education|Skills|$))/i);
  
  if (!certSection) return certifications;

  const certText = certSection[1];
  const entries = certText.split(/\n/).filter((line) => line.trim() && line.length > 5);

  entries.forEach((entry) => {
    // Extract certification name
    const name = entry.split(/\d{4}/)[0]?.trim();
    
    // Extract date
    const dateMatch = entry.match(/(\d{4})/);
    const issueDate = dateMatch ? `${dateMatch[1]}-01-01` : undefined;

    if (name) {
      certifications.push({
        name,
        issuing_organization: 'Not specified',
        issue_date: issueDate,
      });
    }
  });

  return certifications;
}

/**
 * Validate parsed resume data
 */
export function validateParsedResume(resume: ParsedResume): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!resume.email) {
    errors.push('Email not found in resume');
  }

  if (!resume.name) {
    errors.push('Name not found in resume');
  }

  if (resume.skills.length === 0) {
    errors.push('No skills found in resume');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
