import { db } from '@/lib/db/client';
import { jobQueue as jobQueueTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export enum JobType {
  SCRAPE_JOBS = 'scrape_jobs',
  MATCH_JOBS = 'match_jobs',
  AUTO_APPLY = 'auto_apply',
  APPLY_TO_JOB = 'apply_to_job',
  SEND_DAILY_SUMMARY = 'send_daily_summary',
  CLEANUP_OLD_JOBS = 'cleanup_old_jobs',
}

export interface JobQueueItem {
  id: string;
  type: JobType;
  userId: string;
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: Date;
  processingAt?: Date;
  completedAt?: Date;
}

export class JobQueue {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-start processing
    this.startProcessing();
  }

  async addJob(type: JobType, userId: string, data: any): Promise<string> {
    const [job] = await db
      .insert(jobQueueTable)
      .values({
        userId,
        jobId: data.jobId || null,
        status: 'pending',
        priority: 5,
        retryCount: 0,
      })
      .returning();

    return job.id;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get pending jobs
      const jobs = await db
        .select()
        .from(jobQueueTable)
        .where(eq(jobQueueTable.status, 'pending'))
        .limit(10);

      if (!jobs || jobs.length === 0) {
        return;
      }

      // Process each job
      for (const job of jobs) {
        await this.processJob(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(job: any): Promise<void> {
    try {
      // Update status to processing
      await db
        .update(jobQueueTable)
        .set({
          status: 'processing',
          processedAt: new Date(),
          retryCount: job.retryCount + 1,
        })
        .where(eq(jobQueueTable.id, job.id));

      // TODO: Implement job processing logic

      // Mark as completed
      await db
        .update(jobQueueTable)
        .set({
          status: 'completed',
          processedAt: new Date(),
        })
        .where(eq(jobQueueTable.id, job.id));
    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error);

      // Update job with error
      await db.update(jobQueueTable).set({
        errorMessage: error.message,
        status: job.retryCount + 1 >= 3 ? 'failed' : 'pending',
        processedAt: new Date(),
      }).where(eq(jobQueueTable.id, job.id));
    }
  }

  startProcessing(intervalMs: number = 60000): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(() => {
      this.processQueue().catch(console.error);
    }, intervalMs);

    // Process immediately
    this.processQueue().catch(console.error);
  }

  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

