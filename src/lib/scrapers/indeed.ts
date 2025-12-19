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

export class IndeedScraper {
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

  async searchJobs(keywords: string, location: string = '', limit: number = 25): Promise<ScrapedJob[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const searchUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(
      keywords
    )}&l=${encodeURIComponent(location)}`;

    await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });

    const jobs: ScrapedJob[] = [];
    let processedCount = 0;

    while (processedCount < limit) {
      // Wait for job cards to load
      await this.page.waitForSelector('.job_seen_beacon', { timeout: 10000 }).catch(() => null);

      // Get job card elements
      const jobCards = await this.page.$$('.job_seen_beacon');

      for (const card of jobCards) {
        if (processedCount >= limit) break;

        try {
          // Click on job card
          await card.click();
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Extract job details
          const jobTitle = await this.page.$eval(
            '.jobsearch-JobInfoHeader-title',
            (el) => el.textContent?.trim() || ''
          ).catch(() => '');

          const companyName = await this.page.$eval(
            '[data-testid="company-name"]',
            (el) => el.textContent?.trim() || ''
          ).catch(() => '');

          const location = await this.page.$eval(
            '[data-testid="job-location"]',
            (el) => el.textContent?.trim() || ''
          ).catch(() => '');

          const jobUrl = this.page.url();

          const description = await this.page.$eval(
            '#jobDescriptionText',
            (el) => el.textContent?.trim() || ''
          ).catch(() => '');

          const salaryRange = await this.page.$eval(
            '.salary-snippet',
            (el) => el.textContent?.trim() || ''
          ).catch(() => undefined);

          const jobType = await this.page.$eval(
            '.jobsearch-JobMetadataHeader-item',
            (el) => {
              const text = el.textContent?.toLowerCase() || '';
              if (text.includes('full-time')) return 'full-time';
              if (text.includes('part-time')) return 'part-time';
              if (text.includes('contract')) return 'contract';
              return undefined;
            }
          ).catch(() => undefined);

          // Extract posting date
          const postedText = await this.page.$eval(
            '.date',
            (el) => el.textContent?.trim() || ''
          ).catch(() => '');

          const postedDate = this.parsePostedDate(postedText);

          if (jobTitle && companyName) {
            jobs.push({
              job_title: jobTitle,
              company_name: companyName,
              location: location,
              job_url: jobUrl,
              job_description: description,
              salary_range: salaryRange,
              job_type: jobType,
              posted_date: postedDate,
            });

            processedCount++;
          }
        } catch (error) {
          console.error('Error processing job card:', error);
        }
      }

      // Try to go to next page
      if (processedCount < limit) {
        try {
          const nextButton = await this.page.$('[aria-label="Next Page"]');
          if (nextButton) {
            await nextButton.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            break; // No more pages
          }
        } catch {
          break;
        }
      }
    }

    return jobs;
  }

  async applyToJob(jobUrl: string, resumePath: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Look for Apply button
      const applyButton = await this.page.$('[class*="apply"]');

      if (!applyButton) {
        return false; // No apply button found
      }

      await applyButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if redirected to external site
      const currentUrl = this.page.url();
      if (!currentUrl.includes('indeed.com')) {
        console.log('External application - cannot auto-apply');
        return false;
      }

      // Look for resume upload
      const fileInput = await this.page.$('input[type="file"]');
      if (fileInput && resumePath) {
        await fileInput.uploadFile(resumePath);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Fill out form fields if present
      const continueButton = await this.page.$('[id*="continue"]');
      if (continueButton) {
        await continueButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Look for submit button
      const submitButton = await this.page.$('[id*="submit"]');
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

  private parsePostedDate(postedText: string): Date {
    const now = new Date();

    if (postedText.includes('today') || postedText.includes('just posted')) {
      return now;
    }

    if (postedText.includes('day ago')) {
      const days = parseInt(postedText.match(/(\d+)/)?.[1] || '1');
      now.setDate(now.getDate() - days);
      return now;
    }

    if (postedText.includes('hour ago')) {
      const hours = parseInt(postedText.match(/(\d+)/)?.[1] || '1');
      now.setHours(now.getHours() - hours);
      return now;
    }

    return now;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

export default IndeedScraper;
