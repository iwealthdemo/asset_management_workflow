import { db } from '../db';
import { backgroundJobs, documents, type BackgroundJob, type InsertBackgroundJob } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { prepareAIService } from './prepareAIService';

export class BackgroundJobService {
  /**
   * Add a new background job to the queue
   */
  async addJob(jobData: InsertBackgroundJob): Promise<BackgroundJob> {
    const [job] = await db
      .insert(backgroundJobs)
      .values(jobData)
      .returning();
    return job;
  }

  /**
   * Get next pending job for processing
   */
  async getNextPendingJob(): Promise<BackgroundJob | null> {
    const [job] = await db
      .select()
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.status, 'pending'),
          eq(backgroundJobs.attempts, 0) // Start with jobs that haven't been attempted yet
        )
      )
      .orderBy(backgroundJobs.priority, backgroundJobs.createdAt)
      .limit(1);
    
    return job || null;
  }

  /**
   * Mark job as processing
   */
  async markJobAsProcessing(jobId: number): Promise<void> {
    await db
      .update(backgroundJobs)
      .set({
        status: 'processing',
        startedAt: new Date(),
        attempts: 1
      })
      .where(eq(backgroundJobs.id, jobId));
  }

  /**
   * Mark job as completed
   */
  async markJobAsCompleted(jobId: number, result?: string): Promise<void> {
    await db
      .update(backgroundJobs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        result: result
      })
      .where(eq(backgroundJobs.id, jobId));
  }

  /**
   * Mark job as failed
   */
  async markJobAsFailed(jobId: number, errorMessage: string): Promise<void> {
    const [job] = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.id, jobId))
      .limit(1);

    if (!job) return;

    const newAttempts = job.attempts + 1;
    const status = newAttempts >= job.maxAttempts ? 'failed' : 'pending';

    await db
      .update(backgroundJobs)
      .set({
        status,
        attempts: newAttempts,
        errorMessage,
        completedAt: status === 'failed' ? new Date() : null
      })
      .where(eq(backgroundJobs.id, jobId));
  }

  /**
   * Process a single job
   */
  async processJob(job: BackgroundJob): Promise<boolean> {
    console.log(`Processing job ${job.id} of type ${job.jobType}`);
    
    try {
      await this.markJobAsProcessing(job.id);

      switch (job.jobType) {
        case 'prepare-ai':
          await this.processPrepareAIJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }

      await this.markJobAsCompleted(job.id, 'Job completed successfully');
      console.log(`Job ${job.id} completed successfully`);
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Job ${job.id} failed:`, errorMessage);
      await this.markJobAsFailed(job.id, errorMessage);
      return false;
    }
  }

  /**
   * Process prepare-ai job
   */
  private async processPrepareAIJob(job: BackgroundJob): Promise<void> {
    if (!job.documentId) {
      throw new Error('Document ID is required for prepare-ai job');
    }

    // Get document details
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, job.documentId))
      .limit(1);

    if (!document) {
      throw new Error(`Document not found: ${job.documentId}`);
    }

    // Process with existing prepare AI service
    const result = await prepareAIService.prepareDocument(document);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to prepare document for AI');
    }
  }

  /**
   * Start background job processor
   */
  async startJobProcessor(): Promise<void> {
    console.log('Starting background job processor...');
    
    // Process jobs every 30 seconds (increased for large document processing)
    setInterval(async () => {
      try {
        const job = await this.getNextPendingJob();
        if (job) {
          await this.processJob(job);
        }
      } catch (error) {
        console.error('Error in job processor:', error);
      }
    }, 30000); // 30 seconds
  }

  /**
   * Check if a document has a pending or processing job
   */
  async getDocumentJob(documentId: number): Promise<BackgroundJob | null> {
    const [job] = await db
      .select()
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.documentId, documentId),
          eq(backgroundJobs.jobType, 'prepare-ai')
        )
      )
      .orderBy(backgroundJobs.createdAt, 'desc')
      .limit(1);

    return job || null;
  }
}

export const backgroundJobService = new BackgroundJobService();