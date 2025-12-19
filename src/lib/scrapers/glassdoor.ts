import puppeteer, { Browser, Page } from 'puppeteer';

export interface GlassdoorJob {
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

export class GlassdoorScraper {
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
  ): Promise<GlassdoorJob[]> {
    if (!this.page) {
      await this.initialize();
    }

    const jobs: GlassdoorJob[] = [];
    
    for (let page = 1; page <= maxPages; page++) {
      const searchUrl = `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(
        query
      )}&locT=C&locId=${encodeURIComponent(location)}&pageNum=${page}`;

      await this.page!.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Wait for job listings to load
      try {
        await this.page!.waitForSelector('li[data-test="jobListing"]', { timeout: 10000 });
      } catch (error) {
        console.warn('No job listings found on page', page);
        break;
      }

      // Extract job data
      const pageJobs = await this.page!.evaluate(() => {
        const jobElements = document.querySelectorAll('li[data-test="jobListing"]');
        const results: any[] = [];

        jobElements.forEach((element) => {
          const titleElement = element.querySelector('[data-test="job-title"]');
          const companyElement = element.querySelector('[data-test="employer-name"]');
          const locationElement = element.querySelector('[data-test="emp-location"]');
          const salaryElement = element.querySelector('[data-test="detailSalary"]');
          const linkElement = element.querySelector('a[data-test="job-link"]');

          if (titleElement && companyElement && linkElement) {
            results.push({
              title: titleElement.textContent?.trim() || '',
              company: companyElement.textContent?.trim() || '',
              location: locationElement?.textContent?.trim() || '',
              salary: salaryElement?.textContent?.trim() || null,
              url: (linkElement as HTMLAnchorElement).href,
            });
          }
        });

        return results;
      });

      for (const jobData of pageJobs) {
        try {
          // Visit job detail page to get full description
          await this.page!.goto(jobData.url, { waitUntil: 'networkidle2', timeout: 60000 });
          await this.page!.waitForSelector('[data-test="jobDescriptionText"]', { timeout: 5000 });

          const details = await this.page!.evaluate(() => {
            const descriptionElement = document.querySelector('[data-test="jobDescriptionText"]');
            const jobTypeElement = document.querySelector('[data-test="employmentType"]');

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
            postedDate: new Date(), // Glassdoor doesn't always show posted date
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
      await this.page!.goto('https://www.glassdoor.com/profile/login_input.htm', {
        waitUntil: 'networkidle2',
      });

      // Fill in credentials
      await this.page!.waitForSelector('input[name="username"]');
      await this.page!.type('input[name="username"]', email);
      await this.page!.click('button[type="submit"]');

      await this.page!.waitForSelector('input[name="password"]');
      await this.page!.type('input[name="password"]', password);
      await this.page!.click('button[type="submit"]');

      // Wait for redirect after login
      await this.page!.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });

      return true;
    } catch (error) {
      console.error('Glassdoor login failed:', error);
      return false;
    }
  }

  async applyToJob(jobUrl: string, resumePath: string): Promise<boolean> {
    if (!this.page) {
      await this.initialize();
    }

    try {
      await this.page!.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Click apply button
      const applyButton = await this.page!.$('[data-test="apply-button"]');
      if (!applyButton) {
        console.error('Apply button not found');
        return false;
      }

      await applyButton.click();
      await this.delay(2000);

      // Check if redirected to external site
      const currentUrl = this.page!.url();
      if (!currentUrl.includes('glassdoor.com')) {
        console.log('Redirected to external application site');
        return false; // Cannot auto-apply on external sites
      }

      // Upload resume if needed
      const fileInput = await this.page!.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(resumePath);
        await this.delay(1000);
      }

      // Fill basic application fields
      await this.fillApplicationForm();

      // Submit application
      const submitButton = await this.page!.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await this.delay(2000);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error applying to job:', error);
      return false;
    }
  }

  private async fillApplicationForm(): Promise<void> {
    if (!this.page) return;

    // This is a generic form filler - customize based on actual Glassdoor form structure
    const inputs = await this.page.$$('input[type="text"], input[type="email"], input[type="tel"]');

    for (const input of inputs) {
      const name = await input.evaluate((el) => el.getAttribute('name') || '');
      const placeholder = await input.evaluate((el) => el.getAttribute('placeholder') || '');

      // You would customize this based on user profile data
      // For now, this is a placeholder
      if (name.includes('firstName') || placeholder.includes('First')) {
        await input.type('John');
      } else if (name.includes('lastName') || placeholder.includes('Last')) {
        await input.type('Doe');
      } else if (name.includes('email') || placeholder.includes('Email')) {
        await input.type('john.doe@example.com');
      } else if (name.includes('phone') || placeholder.includes('Phone')) {
        await input.type('555-123-4567');
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default GlassdoorScraper;
