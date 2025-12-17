import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('GEMINI_API_KEY not set. AI features will be disabled.');
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Generate AI responses using Google Gemini
 */
export async function generateWithGemini(
  prompt: string,
  model: string = 'gemini-pro'
): Promise<string> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const geminiModel = genAI.getGenerativeModel({ model });
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

/**
 * Parse resume content and extract structured information
 */
export async function parseResumeWithGemini(resumeText: string): Promise<{
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
}> {
  const prompt = `
You are a resume parsing assistant. Extract structured information from the following resume text.

Resume:
${resumeText}

Please extract and return the following information in JSON format:
{
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2020 - Dec 2022",
      "description": "Brief description"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University Name",
      "year": "2020"
    }
  ]
}

Only return valid JSON, no additional text.
`;

  const response = await generateWithGemini(prompt);
  
  // Clean up response to extract JSON
  let jsonText = response.trim();
  
  // Remove markdown code blocks if present
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
  }
  
  return JSON.parse(jsonText);
}

/**
 * Generate answers to screening questions
 */
export async function answerScreeningQuestion(
  question: string,
  resumeContext: string
): Promise<string> {
  const prompt = `
You are helping a job applicant answer a screening question based on their resume.

Resume context:
${resumeContext}

Screening question:
${question}

Please provide a professional, concise answer (2-3 sentences) based on the resume information. If the resume doesn't contain relevant information, provide a professional generic answer.
`;

  return await generateWithGemini(prompt);
}

/**
 * Optimize resume for a specific job posting
 */
export async function optimizeResumeForJob(
  resumeText: string,
  jobDescription: string
): Promise<{
  suggestions: string[];
  keywords: string[];
  matchScore: number;
}> {
  const prompt = `
You are a resume optimization expert. Analyze the resume against the job description and provide suggestions.

Resume:
${resumeText}

Job Description:
${jobDescription}

Provide your analysis in JSON format:
{
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "keywords": ["keyword1", "keyword2", ...],
  "matchScore": 85
}

The matchScore should be 0-100 based on how well the resume matches the job requirements.
Only return valid JSON, no additional text.
`;

  const response = await generateWithGemini(prompt);
  
  let jsonText = response.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
  }
  
  return JSON.parse(jsonText);
}

/**
 * Generate a cover letter for a job application
 */
export async function generateCoverLetter(
  resumeText: string,
  jobTitle: string,
  companyName: string,
  jobDescription: string
): Promise<string> {
  const prompt = `
You are a professional cover letter writer. Generate a compelling cover letter for a job application.

Candidate Resume:
${resumeText}

Job Details:
- Position: ${jobTitle}
- Company: ${companyName}
- Description: ${jobDescription}

Write a professional, personalized cover letter (250-300 words) that:
1. Highlights relevant skills and experience from the resume
2. Shows enthusiasm for the role and company
3. Explains why the candidate is a great fit
4. Has a professional tone

Do not include placeholder text like [Your Name] or [Date]. Just write the cover letter body.
`;

  return await generateWithGemini(prompt);
}

/**
 * Extract skills from job description
 */
export async function extractSkillsFromJobDescription(
  jobDescription: string
): Promise<string[]> {
  const prompt = `
Extract all technical skills, tools, technologies, and qualifications mentioned in this job description.

Job Description:
${jobDescription}

Return only a JSON array of skills, like: ["skill1", "skill2", "skill3"]
No additional text, just the JSON array.
`;

  const response = await generateWithGemini(prompt);
  
  let jsonText = response.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
  }
  
  return JSON.parse(jsonText);
}

export default {
  generateWithGemini,
  parseResumeWithGemini,
  answerScreeningQuestion,
  optimizeResumeForJob,
  generateCoverLetter,
  extractSkillsFromJobDescription,
};
