import puppeteer, { Browser, Page } from 'puppeteer';

export interface ScrapedJob {
  job_title: string;
  company_name: string;
  location: string;
  job_url: string;
  job_description: string;
  salary_range?: string;
  job_type?: string;
  experience_level?: string;
  required_skills?: string[];
  posted_date?: Date;
}

export class LinkedInScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );
  }

  async login(email: string, password: string) {
    if (!this.page) throw new Error('Browser not initialized');

    await this.page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2', timeout: 60000 });
    
    await this.page.type('#username', email);
    await this.page.type('#password', password);
    await this.page.click('button[type="submit"]');
    
    await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    
    // Check if login was successful
    const currentUrl = this.page.url();
    if (currentUrl.includes('login') || currentUrl.includes('challenge')) {
      throw new Error('Login failed - check credentials or solve challenge');
    }
  }

  async searchJobs(keywords: string, location: string = '', limit: number = 25): Promise<ScrapedJob[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
      keywords
    )}&location=${encodeURIComponent(location)}`;

    await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for job listings to load
    await this.page.waitForSelector('.jobs-search__results-list', { timeout: 15000 });

    const jobs: ScrapedJob[] = [];
    let processedCount = 0;

    while (processedCount < limit) {
      // Get job card elements
      const jobCards = await this.page.$$('.jobs-search__results-list li');
      
      for (const card of jobCards) {
        if (processedCount >= limit) break;

        try {
          // Click on job card to load details
          await card.click();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for details to load

          // Extract job details
          const jobTitle = await this.page.$eval(
            '.job-details-jobs-unified-top-card__job-title',
            (el) => el.textContent?.trim() || ''
          ).catch(() => '');

          const companyName = await this.page.$eval(
            '.job-details-jobs-unified-top-card__company-name',
            (el) => el.textContent?.trim() || ''
          ).catch(() => '');

          const location = await this.page.$eval(
            '.job-details-jobs-unified-top-card__bullet',
            (el) => el.textContent?.trim() || ''
          ).catch(() => '');

          const jobUrl = await this.page.url();

          const description = await this.page.$eval(
            '.jobs-description__content',
            (el) => el.textContent?.trim() || ''
          ).catch(() => '');

          const experienceLevel = await this.page.$eval(
            '.job-details-jobs-unified-top-card__job-insight span',
            (el) => el.textContent?.trim() || ''
          ).catch(() => undefined);

          if (jobTitle && companyName) {
            jobs.push({
              job_title: jobTitle,
              company_name: companyName,
              location: location,
              job_url: jobUrl,
              job_description: description,
              experience_level: experienceLevel,
              posted_date: new Date(),
            });

            processedCount++;
          }
        } catch (error) {
          console.error('Error processing job card:', error);
        }
      }

      // Try to load more jobs if needed
      if (processedCount < limit) {
        try {
          const loadMoreButton = await this.page.$('button[aria-label="Load more results"]');
          if (loadMoreButton) {
            await loadMoreButton.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            break; // No more jobs to load
          }
        } catch {
          break;
        }
      }
    }

    return jobs;
  }

  async applyToJob(jobUrl: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Look for Easy Apply button
      const easyApplyButton = await this.page.$('button[aria-label*="Easy Apply"]');
      
      if (!easyApplyButton) {
        return false; // Not an Easy Apply job
      }

      await easyApplyButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Handle multi-step application form
      let continueButton = await this.page.$('button[aria-label="Continue to next step"]');
      
      while (continueButton) {
        await continueButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        continueButton = await this.page.$('button[aria-label="Continue to next step"]');
      }

      // Look for submit/review button
      const submitButton = await this.page.$('button[aria-label*="Submit application"]');
      
      if (submitButton) {
        await submitButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error applying to job:', error);
      return false;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

export default LinkedInScraper;
