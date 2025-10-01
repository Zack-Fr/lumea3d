import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AssetProcessingJob } from './asset-processing.processor';

@Injectable()
export class ProcessingQueueService {
  private readonly logger = new Logger(ProcessingQueueService.name);

  constructor(
    @InjectQueue('asset-processing') private assetProcessingQueue: Queue<AssetProcessingJob>,
  ) {}

  /**
   * Queue an asset for processing
   */
  async queueAssetProcessing(
    assetId: string,
    userId: string,
    category: string,
    originalObjectKey: string,
    options?: {
      enableDraco?: boolean;
      enableMeshopt?: boolean;
      generateLODs?: boolean;
      textureFormat?: 'ktx2';
    }
  ): Promise<void> {
    const jobData: AssetProcessingJob = {
      assetId,
      userId,
      category,
      originalObjectKey,
      options,
    };

    // Add job to queue with retry options
    const job = await this.assetProcessingQueue.add('process-asset', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 seconds
      },
      removeOnComplete: 10, // Keep last 10 completed jobs
      removeOnFail: 50,     // Keep last 50 failed jobs for debugging
    });

    this.logger.log(`Queued asset processing job ${job.id} for asset ${assetId}`);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.assetProcessingQueue.getWaiting(),
      this.assetProcessingQueue.getActive(),
      this.assetProcessingQueue.getCompleted(),
      this.assetProcessingQueue.getFailed(),
      this.assetProcessingQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  /**
   * Get job status by asset ID
   */
  async getJobStatus(assetId: string): Promise<{
    status: string;
    progress?: number;
    error?: string;
  } | null> {
    // Search for job in different states
    const states = ['waiting', 'active', 'completed', 'failed'];
    
    for (const state of states) {
      const jobs = await this.assetProcessingQueue.getJobs([state as any]);
      const job = jobs.find(j => j.data.assetId === assetId);
      
      if (job) {
        return {
          status: await job.getState(),
          progress: job.progress(),
          error: job.failedReason,
        };
      }
    }

    return null;
  }

  /**
   * Retry failed job for an asset
   */
  async retryAssetProcessing(assetId: string): Promise<boolean> {
    const failedJobs = await this.assetProcessingQueue.getFailed();
    const job = failedJobs.find(j => j.data.assetId === assetId);
    
    if (job) {
      await job.retry();
      this.logger.log(`Retrying processing job for asset ${assetId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Clean up old jobs
   */
  async cleanupOldJobs(): Promise<void> {
    await this.assetProcessingQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Remove completed jobs older than 24 hours
    await this.assetProcessingQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Remove failed jobs older than 7 days
    this.logger.log('Cleaned up old processing jobs');
  }
}