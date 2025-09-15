import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ProcessingService } from '../processing/processing.service';
import { ProcessingQueueService } from '../processing/processing-queue.service';
import { Asset, AssetStatus, AssetLicense } from '@prisma/client';
import { CreateAssetDto, UpdateAssetDto, AssetUploadUrlDto } from './dto/assets.dto';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  // File validation constants
  private readonly ALLOWED_MIME_TYPES = [
    'model/gltf-binary', // .glb
    'application/octet-stream', // Alternative for .glb
  ];
  
  private readonly MAX_FILE_SIZE = 200 * 1024 * 1024; // 100MB
  private readonly MIN_FILE_SIZE = 1024; // 1KB

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private processingService: ProcessingService,
    private processingQueueService: ProcessingQueueService,
  ) {}

  /**
   * Generate presigned upload URL for a new asset
   */
  async generateUploadUrl(
    userId: string,
    dto: AssetUploadUrlDto,
  ): Promise<{
    uploadUrl: string;
    assetId: string;
    objectKey: string;
    expiresIn: number;
  }> {
    // Validate file type
    if (!this.ALLOWED_MIME_TYPES.includes(dto.contentType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    // Validate file size
    if (dto.fileSize > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size: ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    if (dto.fileSize < this.MIN_FILE_SIZE) {
      throw new BadRequestException(
        `File too small. Minimum size: ${this.MIN_FILE_SIZE} bytes`
      );
    }

    // Create asset record in database (using PascalCase field names)
    const asset = await this.prisma.asset.create({
      data: {
        originalName: dto.filename,
        mimeType: dto.contentType,
        fileSize: dto.fileSize,
        status: AssetStatus.UPLOADED,
        uploaderId: userId,
        reportJson: dto.metadata || {},
      },
    });

    // Generate presigned upload URL
    const objectKey = this.storageService.generateObjectKey(
      userId,
      dto.category,
      asset.id,
      dto.filename,
    );

    const result = await this.storageService.generatePresignedUploadUrl(
      userId,
      dto.category,
      asset.id,
      dto.filename,
      dto.contentType,
    );

    // Update asset with storage URL
    await this.prisma.asset.update({
      where: { id: asset.id },
      data: { originalUrl: objectKey },
    });

    this.logger.log(`Generated upload URL for asset ${asset.id} by user ${userId}`);

    return {
      uploadUrl: result.uploadUrl,
      assetId: asset.id,
      objectKey: result.objectKey,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * Handle upload completion callback
   */
  async handleUploadComplete(assetId: string, userId: string): Promise<Asset> {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, uploaderId: userId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.status !== AssetStatus.UPLOADED) {
      throw new BadRequestException('Asset is not in uploaded state');
    }

    // Update asset status to processing
    const updatedAsset = await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        status: AssetStatus.PROCESSING,
        processedAt: new Date(),
      },
    });

    // Trigger background processing
    this.triggerAssetProcessing(assetId, userId);

    this.logger.log(`Upload completed for asset ${assetId} by user ${userId}`);

    return updatedAsset;
  }

  /**
   * Create a new asset record
   */
  async createAsset(userId: string, dto: CreateAssetDto): Promise<Asset> {
    return this.prisma.asset.create({
      data: {
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        status: dto.status || AssetStatus.UPLOADED,
        uploaderId: userId,
        license: dto.license,
        originalUrl: dto.originalUrl,
        meshoptUrl: dto.meshoptUrl,
        dracoUrl: dto.dracoUrl,
        navmeshUrl: dto.navmeshUrl,
        reportJson: dto.reportJson,
        errorMessage: dto.errorMessage,
        processedAt: dto.processedAt ? new Date(dto.processedAt) : undefined,
      },
    });
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string, userId: string): Promise<Asset> {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, uploaderId: userId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  /**
   * Get all assets for a user
   */
  async getUserAssets(userId: string): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      where: {
        uploaderId: userId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update asset metadata
   */
  async updateAsset(assetId: string, userId: string, dto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.getAsset(assetId, userId);

    return this.prisma.asset.update({
      where: { id: assetId },
      data: {
        originalName: dto.originalName,
        status: dto.status,
        originalUrl: dto.originalUrl,
        meshoptUrl: dto.meshoptUrl,
        dracoUrl: dto.dracoUrl,
        navmeshUrl: dto.navmeshUrl,
        license: dto.license,
        reportJson: dto.reportJson,
        errorMessage: dto.errorMessage,
      },
    });
  }

  /**
   * Delete an asset and its storage objects
   */
  async deleteAsset(assetId: string, userId: string): Promise<void> {
    const asset = await this.getAsset(assetId, userId);

    // Delete from storage
    if (asset.originalUrl) {
      try {
        await this.storageService.deleteAsset(asset.originalUrl);
      } catch (error) {
        this.logger.warn(`Failed to delete storage object for asset ${assetId}: ${error.message}`);
      }
    }

    // Delete processed variants from storage
    if (asset.meshoptUrl) {
      try {
        await this.storageService.deleteAsset(asset.meshoptUrl);
      } catch (error) {
        this.logger.warn(`Failed to delete meshopt variant: ${error.message}`);
      }
    }

    if (asset.dracoUrl) {
      try {
        await this.storageService.deleteAsset(asset.dracoUrl);
      } catch (error) {
        this.logger.warn(`Failed to delete draco variant: ${error.message}`);
      }
    }

    if (asset.ktx2Url) {
      try {
        await this.storageService.deleteAsset(asset.ktx2Url);
      } catch (error) {
        this.logger.warn(`Failed to delete ktx2 variant: ${error.message}`);
      }
    }

    if (asset.navmeshUrl) {
      try {
        await this.storageService.deleteAsset(asset.navmeshUrl);
      } catch (error) {
        this.logger.warn(`Failed to delete navmesh variant: ${error.message}`);
      }
    }

    // Delete from database
    await this.prisma.asset.delete({
      where: { id: assetId },
    });

    this.logger.log(`Deleted asset ${assetId} by user ${userId}`);
  }

  /**
   * Generate download URL for an asset
   */
  async generateDownloadUrl(
    assetId: string,
    userId: string,
    variant: 'original' | 'meshopt' | 'draco' | 'ktx2' | 'navmesh' = 'original',
    expiresIn: number = 3600,
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    const asset = await this.getAsset(assetId, userId);

    let objectKey: string | null = null;
    
    switch (variant) {
      case 'original':
        objectKey = asset.originalUrl;
        break;
      case 'meshopt':
        objectKey = asset.meshoptUrl;
        break;
      case 'draco':
        objectKey = asset.dracoUrl;
        break;
      case 'ktx2':
        objectKey = asset.ktx2Url;
        break;
      case 'navmesh':
        objectKey = asset.navmeshUrl;
        break;
    }

    if (!objectKey) {
      throw new BadRequestException(`Asset variant '${variant}' is not available`);
    }

    if (asset.status === AssetStatus.FAILED) {
      throw new BadRequestException('Asset processing failed');
    }

    // Return public download URL instead of presigned URL to avoid MinIO permission issues
    const publicUrl = this.storageService.generatePublicDownloadUrl(objectKey);
    return {
      downloadUrl: publicUrl,
      expiresIn: expiresIn, // Keep the interface consistent
    };
  }

  /**
   * Get asset processing status including queue information
   */
  async getAssetProcessingStatus(assetId: string, userId: string): Promise<{
    assetStatus: AssetStatus;
    queueStatus?: {
      status: string;
      progress?: number;
      error?: string;
    };
    variants: {
      original?: string;
      meshopt?: string;
      draco?: string;
      ktx2?: string;
      navmesh?: string;
    };
  }> {
    const asset = await this.getAsset(assetId, userId);
    
    // Get queue status if asset is processing
    let queueStatus = undefined;
    if (asset.status === AssetStatus.PROCESSING) {
      queueStatus = await this.processingQueueService.getJobStatus(assetId);
    }

    // Build variants object
    const variants: any = {};
    if (asset.originalUrl) variants.original = asset.originalUrl;
    if (asset.meshoptUrl) variants.meshopt = asset.meshoptUrl;
    if (asset.dracoUrl) variants.draco = asset.dracoUrl;
    if (asset.ktx2Url) variants.ktx2 = asset.ktx2Url;
    if (asset.navmeshUrl) variants.navmesh = asset.navmeshUrl;

    return {
      assetStatus: asset.status,
      queueStatus: queueStatus || undefined,
      variants,
    };
  }

  /**
   * Retry failed asset processing
   */
  async retryAssetProcessing(assetId: string, userId: string): Promise<boolean> {
    const asset = await this.getAsset(assetId, userId);
    
    if (asset.status !== AssetStatus.FAILED) {
      throw new BadRequestException('Asset is not in failed state');
    }

    // Try to retry the queue job first
    const retried = await this.processingQueueService.retryAssetProcessing(assetId);
    
    if (retried) {
      // Update asset status back to processing
      await this.prisma.asset.update({
        where: { id: assetId },
        data: {
          status: AssetStatus.PROCESSING,
          errorMessage: null,
        },
      });
      
      this.logger.log(`Retrying processing for asset ${assetId}`);
      return true;
    } else {
      // No existing job found, trigger new processing
      await this.prisma.asset.update({
        where: { id: assetId },
        data: {
          status: AssetStatus.PROCESSING,
          errorMessage: null,
        },
      });
      
      await this.triggerAssetProcessing(assetId, userId);
      return true;
    }
  }

  /**
   * Trigger background asset processing
   */
  private async triggerAssetProcessing(assetId: string, userId: string): Promise<void> {
    try {
      const asset = await this.prisma.asset.findUnique({
        where: { id: assetId },
      });

      if (!asset || !asset.originalUrl) {
        throw new Error('Asset or originalUrl not found');
      }

      // Determine category from the original filename or default to 'glb'
      const category = 'glb'; // Default category

      // Queue the asset for processing with default options
      await this.processingQueueService.queueAssetProcessing(
        assetId,
        userId,
        category,
        asset.originalUrl,
        {
          enableDraco: true,
          enableMeshopt: true,
          generateLODs: false, // Can be enabled based on requirements
          textureFormat: 'ktx2',
        }
      );

      this.logger.log(`Successfully queued asset ${assetId} for processing`);

    } catch (error) {
      this.logger.error(`Failed to queue asset ${assetId} for processing:`, error);
      
      // Mark asset as failed if we can't even queue it
      await this.prisma.asset.update({
        where: { id: assetId },
        data: { 
          status: AssetStatus.FAILED,
          errorMessage: `Failed to queue for processing: ${error.message}`,
        },
      });
    }
  }

  /**
   * Validate GLB file format (basic validation)
   */
  private validateGLBFile(buffer: Buffer): boolean {
    // GLB files start with 'glTF' magic number (0x46546C67)
    if (buffer.length < 12) return false;
    
    const magic = buffer.readUInt32LE(0);
    return magic === 0x46546C67;
  }
}