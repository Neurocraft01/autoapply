interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@autoapply.ai';
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (!this.apiKey) {
      console.warn('Email API key not configured. Email not sent.');
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject,
          html,
          text: text || this.stripHtml(html),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Welcome email
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    const template = this.getWelcomeTemplate(userName);
    await this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Application confirmation email
  async sendApplicationConfirmation(
    userEmail: string,
    userName: string,
    jobTitle: string,
    companyName: string,
    jobUrl: string
  ): Promise<void> {
    const template = this.getApplicationTemplate(userName, jobTitle, companyName, jobUrl);
    await this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // New job match email
  async sendJobMatchNotification(
    userEmail: string,
    userName: string,
    jobTitle: string,
    companyName: string,
    matchScore: number,
    jobUrl: string
  ): Promise<void> {
    const template = this.getJobMatchTemplate(userName, jobTitle, companyName, matchScore, jobUrl);
    await this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Daily summary email
  async sendDailySummary(
    userEmail: string,
    userName: string,
    stats: {
      applicationsToday: number;
      matchesToday: number;
      totalApplications: number;
    }
  ): Promise<void> {
    const template = this.getDailySummaryTemplate(userName, stats);
    await this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Error notification email
  async sendErrorNotification(
    userEmail: string,
    userName: string,
    errorMessage: string,
    context: string
  ): Promise<void> {
    const template = this.getErrorTemplate(userName, errorMessage, context);
    await this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Email Templates
  private getWelcomeTemplate(userName: string): EmailTemplate {
    const subject = 'Welcome to AutoApply.ai!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to AutoApply.ai!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Thank you for joining AutoApply.ai! We're excited to help you automate your job search and save hours every week.</p>
            <h3>Getting Started:</h3>
            <ol>
              <li>Complete your profile setup</li>
              <li>Upload your resume</li>
              <li>Add your skills and experience</li>
              <li>Set your job preferences</li>
              <li>Connect job portals</li>
              <li>Enable automation</li>
            </ol>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Go to Dashboard</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Happy job hunting!</p>
            <p>The AutoApply.ai Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 AutoApply.ai. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `Welcome to AutoApply.ai! Hi ${userName}, Thank you for joining AutoApply.ai...`;
    return { subject, html, text };
  }

  private getApplicationTemplate(
    userName: string,
    jobTitle: string,
    companyName: string,
    jobUrl: string
  ): EmailTemplate {
    const subject = `Application Submitted: ${jobTitle} at ${companyName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .job-details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✅ Application Submitted!</h2>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Great news! Your application has been successfully submitted:</p>
            <div class="job-details">
              <h3>${jobTitle}</h3>
              <p><strong>Company:</strong> ${companyName}</p>
              <p><strong>Applied:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            <a href="${jobUrl}" class="button">View Job Posting</a>
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Check your email for confirmation from the employer</li>
              <li>Prepare for potential interviews</li>
              <li>Research the company</li>
            </ul>
            <p>Good luck!</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `Application Submitted: ${jobTitle} at ${companyName}`;
    return { subject, html, text };
  }

  private getJobMatchTemplate(
    userName: string,
    jobTitle: string,
    companyName: string,
    matchScore: number,
    jobUrl: string
  ): EmailTemplate {
    const subject = `New Job Match (${matchScore}%): ${jobTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .match-score { font-size: 48px; font-weight: bold; color: #10b981; text-align: center; }
          .job-card { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎯 New Job Match Found!</h2>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>We found a great job match for you:</p>
            <div class="match-score">${matchScore}% Match</div>
            <div class="job-card">
              <h3>${jobTitle}</h3>
              <p><strong>Company:</strong> ${companyName}</p>
              <p>This job matches your skills, experience, and preferences.</p>
            </div>
            <a href="${jobUrl}" class="button">View Job Details</a>
            <p>Enable auto-apply to automatically apply to matching jobs!</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `New Job Match (${matchScore}%): ${jobTitle} at ${companyName}`;
    return { subject, html, text };
  }

  private getDailySummaryTemplate(
    userName: string,
    stats: {
      applicationsToday: number;
      matchesToday: number;
      totalApplications: number;
    }
  ): EmailTemplate {
    const subject = 'Your Daily Job Search Summary';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; background: white; padding: 20px; border-radius: 6px; flex: 1; margin: 0 10px; }
          .stat-value { font-size: 36px; font-weight: bold; color: #667eea; }
          .stat-label { color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📊 Your Daily Summary</h2>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Here's your job search activity for today:</p>
            <div class="stats">
              <div class="stat">
                <div class="stat-value">${stats.applicationsToday}</div>
                <div class="stat-label">Applications Today</div>
              </div>
              <div class="stat">
                <div class="stat-value">${stats.matchesToday}</div>
                <div class="stat-label">New Matches</div>
              </div>
              <div class="stat">
                <div class="stat-value">${stats.totalApplications}</div>
                <div class="stat-label">Total Applications</div>
              </div>
            </div>
            <p>Keep up the great work! Your dream job is closer than you think.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `Your Daily Summary: ${stats.applicationsToday} applications today, ${stats.matchesToday} new matches`;
    return { subject, html, text };
  }

  private getErrorTemplate(userName: string, errorMessage: string, context: string): EmailTemplate {
    const subject = 'AutoApply.ai - Action Required';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .error-box { background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⚠️ Automation Issue Detected</h2>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>We encountered an issue while processing your job applications:</p>
            <div class="error-box">
              <strong>Error:</strong> ${errorMessage}<br>
              <strong>Context:</strong> ${context}
            </div>
            <p><strong>What to do:</strong></p>
            <ul>
              <li>Check your portal credentials are still valid</li>
              <li>Verify your profile information is complete</li>
              <li>Review automation settings</li>
            </ul>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" class="button">Go to Settings</a>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `Automation Issue: ${errorMessage}`;
    return { subject, html, text };
  }
}

export default EmailService;
