import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ProcessingService } from './processing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetStatus } from '@prisma/client';

export interface AssetProcessingJob {
  assetId: string;
  userId: string;
  category: string;
  originalObjectKey: string;
  options?: {
    enableDraco?: boolean;
    enableMeshopt?: boolean;
    generateLODs?: boolean;
    textureFormat?: 'ktx2';
  };
}

@Processor('asset-processing')
@Injectable()
export class AssetProcessingProcessor {
  private readonly logger = new Logger(AssetProcessingProcessor.name);

  constructor(
    private processingService: ProcessingService,
    private prisma: PrismaService,
  ) {}

  @Process('process-asset')
  async processAsset(job: Job<AssetProcessingJob>): Promise<void> {
    const { assetId, userId, category, originalObjectKey, options } = job.data;
    
    this.logger.log(`Starting processing for asset ${assetId}`);
    
    try {
      // Update asset status to processing
      await this.prisma.asset.update({
        where: { id: assetId },
        data: { status: AssetStatus.PROCESSING },
      });

      // Process the asset
      const result = await this.processingService.processAsset(
        userId,
        category,
        assetId,
        originalObjectKey,
        {
          enableDraco: options?.enableDraco ?? true,
          enableMeshopt: options?.enableMeshopt ?? true,
          generateLODs: options?.generateLODs ?? false,
          textureFormat: options?.textureFormat ?? 'ktx2',
        }
      );

      if (result.success) {
        // Update asset with processing results
        const updateData: any = {
          status: AssetStatus.READY,
          processed_at: new Date(),
          report_json: {
            originalSize: result.originalSize,
            processedSize: result.processedSize,
            compressionRatio: result.compressionRatio,
            variants: result.variants.length,
            processedAt: new Date().toISOString(),
          },
        };

        // Set URLs for different variants
        for (const variant of result.variants) {
          switch (variant.name) {
            case 'optimized':
              updateData.meshopt_url = variant.objectKey;
              break;
            case 'draco':
            case 'optimized': // If using Draco compression
              updateData.draco_url = variant.objectKey;
              break;
            case 'ktx2_textures':
              // Store KTX2 variant info in report_json for now
              updateData.report_json.ktx2Url = variant.objectKey;
              break;
          }
        }

        await this.prisma.asset.update({
          where: { id: assetId },
          data: updateData,
        });

        this.logger.log(`Successfully processed asset ${assetId}. Compression ratio: ${result.compressionRatio.toFixed(2)}`);
      } else {
        // Processing failed
        await this.prisma.asset.update({
          where: { id: assetId },
          data: {
            status: AssetStatus.FAILED,
            errorMessage: result.error || 'Processing failed',
            reportJson: {
              error: result.error,
              failedAt: new Date().toISOString(),
            },
          },
        });

        this.logger.error(`Processing failed for asset ${assetId}: ${result.error}`);
      }

    } catch (error) {
      this.logger.error(`Processing error for asset ${assetId}:`, error);
      
      // Update asset status to failed
      await this.prisma.asset.update({
        where: { id: assetId },
        data: {
          status: AssetStatus.FAILED,
          errorMessage: error.message,
          reportJson: {
            error: error.message,
            stack: error.stack,
            failedAt: new Date().toISOString(),
          },
        },
      });

      throw error; // Re-throw to mark job as failed
    }
  }
}