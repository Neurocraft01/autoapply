import puppeteer, { Browser, Page } from 'puppeteer';

export interface ZipRecruiterJob {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  postedDate: Date;
  jobType?: string;
  remote?: boolean;
}

export class ZipRecruiterScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async searchJobs(
    query: string,
    location: string,
    maxPages: number = 3
  ): Promise<ZipRecruiterJob[]> {
    if (!this.page) {
      await this.initialize();
    }

    const jobs: ZipRecruiterJob[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const searchUrl = `https://www.ziprecruiter.com/jobs-search?search=${encodeURIComponent(
        query
      )}&location=${encodeURIComponent(location)}&page=${page}`;

      await this.page!.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Wait for job cards
      try {
        await this.page!.waitForSelector('.job_result', { timeout: 10000 });
      } catch (error) {
        console.warn('No job listings found on page', page);
        break;
      }

      // Extract job data
      const pageJobs = await this.page!.evaluate(() => {
        const jobCards = document.querySelectorAll('.job_result');
        const results: any[] = [];

        jobCards.forEach((card) => {
          const titleElement = card.querySelector('.job_title');
          const companyElement = card.querySelector('.hiring_company_text');
          const locationElement = card.querySelector('.location');
          const salaryElement = card.querySelector('.salary');
          const linkElement = card.querySelector('a.job_link');
          const postedElement = card.querySelector('.time');

          if (titleElement && companyElement && linkElement) {
            results.push({
              title: titleElement.textContent?.trim() || '',
              company: companyElement.textContent?.trim() || '',
              location: locationElement?.textContent?.trim() || '',
              salary: salaryElement?.textContent?.trim() || null,
              url: (linkElement as HTMLAnchorElement).href,
              posted: postedElement?.textContent?.trim() || '',
            });
          }
        });

        return results;
      });

      for (const jobData of pageJobs) {
        try {
          // Visit job detail page
          await this.page!.goto(jobData.url, { waitUntil: 'networkidle2', timeout: 30000 });
          await this.page!.waitForSelector('.job_description', { timeout: 5000 });

          const details = await this.page!.evaluate(() => {
            const descriptionElement = document.querySelector('.job_description');
            const jobTypeElement = document.querySelector('.job_type');

            return {
              description: descriptionElement?.textContent?.trim() || '',
              jobType: jobTypeElement?.textContent?.trim() || null,
            };
          });

          jobs.push({
            title: jobData.title,
            company: jobData.company,
            location: jobData.location,
            salary: jobData.salary,
            description: details.description,
            url: jobData.url,
            postedDate: this.parsePostedDate(jobData.posted),
            jobType: details.jobType || undefined,
            remote: jobData.location.toLowerCase().includes('remote'),
          });

          // Rate limiting
          await this.delay(2000);
        } catch (error) {
          console.error('Error fetching job details:', error);
          continue;
        }
      }

      // Rate limiting between pages
      await this.delay(3000);
    }

    return jobs;
  }

  async login(email: string, password: string): Promise<boolean> {
    if (!this.page) {
      await this.initialize();
    }

    try {
      await this.page!.goto('https://www.ziprecruiter.com/login', {
        waitUntil: 'networkidle2',
      });

      // Fill in credentials
      await this.page!.waitForSelector('input[name="email"]');
      await this.page!.type('input[name="email"]', email);
      await this.page!.type('input[name="password"]', password);

      // Click login button
      await this.page!.click('button[type="submit"]');

      // Wait for redirect after login
      await this.page!.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

      return true;
    } catch (error) {
      console.error('ZipRecruiter login failed:', error);
      return false;
    }
  }

  async applyToJob(
    jobUrl: string,
    resumePath: string,
    profileData?: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    }
  ): Promise<boolean> {
    if (!this.page) {
      await this.initialize();
    }

    try {
      await this.page!.goto(jobUrl, { waitUntil: 'networkidle2' });

      // Find and click the apply button
      const applyButton = await this.page!.$('button.apply_button, a.apply_button');
      if (!applyButton) {
        console.error('Apply button not found');
        return false;
      }

      await applyButton.click();
      await this.delay(2000);

      // Check if we're on ZipRecruiter or redirected
      const currentUrl = this.page!.url();
      if (!currentUrl.includes('ziprecruiter.com')) {
        console.log('Redirected to external application site');
        return false;
      }

      // Upload resume
      const fileInput = await this.page!.$('input[type="file"][name="resume"]');
      if (fileInput) {
        await fileInput.uploadFile(resumePath);
        await this.delay(2000);
      }

      // Fill application form if profile data provided
      if (profileData) {
        await this.fillApplicationForm(profileData);
      }

      // Submit application
      const submitButton = await this.page!.$('button[type="submit"].submit_application');
      if (submitButton) {
        await submitButton.click();
        await this.delay(2000);
        
        // Check for confirmation
        const confirmation = await this.page!.$('.application_confirmation');
        return !!confirmation;
      }

      return false;
    } catch (error) {
      console.error('Error applying to job:', error);
      return false;
    }
  }

  private async fillApplicationForm(profileData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }): Promise<void> {
    if (!this.page) return;

    try {
      // First name
      const firstNameInput = await this.page.$('input[name="first_name"]');
      if (firstNameInput) {
        await firstNameInput.type(profileData.firstName);
      }

      // Last name
      const lastNameInput = await this.page.$('input[name="last_name"]');
      if (lastNameInput) {
        await lastNameInput.type(profileData.lastName);
      }

      // Email
      const emailInput = await this.page.$('input[name="email"]');
      if (emailInput) {
        await emailInput.type(profileData.email);
      }

      // Phone
      const phoneInput = await this.page.$('input[name="phone"]');
      if (phoneInput) {
        await phoneInput.type(profileData.phone);
      }

      await this.delay(1000);
    } catch (error) {
      console.error('Error filling application form:', error);
    }
  }

  private parsePostedDate(postedText: string): Date {
    const now = new Date();
    const text = postedText.toLowerCase();

    if (text.includes('today') || text.includes('just now')) {
      return now;
    } else if (text.includes('yesterday')) {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (text.includes('day')) {
      const days = parseInt(text.match(/\d+/)?.[0] || '0');
      return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    } else if (text.includes('week')) {
      const weeks = parseInt(text.match(/\d+/)?.[0] || '0');
      return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
    } else if (text.includes('month')) {
      const months = parseInt(text.match(/\d+/)?.[0] || '0');
      return new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000);
    }

    return now;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getJobRecommendations(): Promise<ZipRecruiterJob[]> {
    if (!this.page) {
      await this.initialize();
    }

    try {
      await this.page!.goto('https://www.ziprecruiter.com/candidate/recommended-jobs', {
        waitUntil: 'networkidle2',
      });

      await this.page!.waitForSelector('.job_result', { timeout: 10000 });

      const jobs = await this.page!.evaluate(() => {
        const jobCards = document.querySelectorAll('.job_result');
        const results: any[] = [];

        jobCards.forEach((card) => {
          const titleElement = card.querySelector('.job_title');
          const companyElement = card.querySelector('.hiring_company_text');
          const locationElement = card.querySelector('.location');
          const linkElement = card.querySelector('a.job_link');

          if (titleElement && companyElement && linkElement) {
            results.push({
              title: titleElement.textContent?.trim() || '',
              company: companyElement.textContent?.trim() || '',
              location: locationElement?.textContent?.trim() || '',
              url: (linkElement as HTMLAnchorElement).href,
            });
          }
        });

        return results;
      });

      return jobs.map((job) => ({
        ...job,
        description: '',
        postedDate: new Date(),
        remote: job.location.toLowerCase().includes('remote'),
      }));
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }
}

export default ZipRecruiterScraper;
