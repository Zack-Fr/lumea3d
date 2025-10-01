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
    textureFormat?: 'ktx2' | 'webp' | 'avif';
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

  /**
   * Determine if an asset should skip GLB processing based on type and category
   */
  private shouldSkipProcessing(mimeType?: string, category?: string, fileName?: string): boolean {
    // Skip processing for HDR/environment files
    if (category === 'lighting' || category === 'environment') {
      return true;
    }
    
    // Skip processing for HDR files by MIME type
    if (mimeType && (
      mimeType.includes('radiance') || 
      mimeType.includes('x-exr') ||
      mimeType === 'image/vnd.radiance' ||
      mimeType === 'image/x-exr'
    )) {
      return true;
    }
    
    // Skip processing for HDR files by extension
    if (fileName && (
      fileName.toLowerCase().endsWith('.hdr') ||
      fileName.toLowerCase().endsWith('.exr')
    )) {
      return true;
    }
    
    // Skip processing for image files that shouldn't be GLB processed
    if (mimeType && mimeType.startsWith('image/') && !mimeType.includes('gltf')) {
      return true;
    }
    
    // Only process GLB/GLTF files
    const isGlbFile = mimeType && (
      mimeType === 'model/gltf-binary' ||
      mimeType === 'model/gltf+json' ||
      mimeType === 'application/octet-stream'
    );
    
    const isGlbByExtension = fileName && (
      fileName.toLowerCase().endsWith('.glb') ||
      fileName.toLowerCase().endsWith('.gltf')
    );
    
    // Skip if it's not a GLB/GLTF file
    return !(isGlbFile || isGlbByExtension);
  }

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

      // Check if this asset needs GLB processing
      const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
      const skipProcessing = this.shouldSkipProcessing(asset?.mimeType, category, asset?.originalName);
      
      if (skipProcessing) {
        this.logger.log(`Skipping GLB processing for asset ${assetId} (${asset?.mimeType}, category: ${category})`);
        
        // Mark as ready without processing
        await this.prisma.asset.update({
          where: { id: assetId },
          data: {
            status: AssetStatus.READY,
            processedAt: new Date(),
            reportJson: {
              skipped: true,
              reason: 'Non-GLB asset type',
              mimeType: asset?.mimeType,
              category,
              processedAt: new Date().toISOString(),
            },
          },
        });
        
        this.logger.log(`Asset ${assetId} marked as ready without GLB processing`);
        return;
      }

      // Process the asset
      const result = await this.processingService.processAsset(
        userId,
        category,
        assetId,
        originalObjectKey,
        {
          enableDraco: false, // Draco compression disabled due to compatibility issues
          enableMeshopt: false, // Disable Meshopt due to encoder issues
          generateLODs: false, // Disable LODs for now
          // textureFormat: 'webp', // Disabled for now to focus on basic processing
        }
      );

      if (result.success) {
        // Update asset with processing results
        const updateData: any = {
          status: AssetStatus.READY,
          processedAt: new Date(),
          reportJson: {
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
              updateData.meshoptUrl = variant.objectKey;
              break;
            case 'draco':
            case 'optimized': // If using Draco compression
              updateData.dracoUrl = variant.objectKey;
              break;
            case 'ktx2_textures':
              // Store KTX2 variant info in report_json for now
              updateData.reportJson.ktx2Url = variant.objectKey;
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