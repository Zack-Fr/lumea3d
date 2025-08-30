import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ProcessingService } from '../processing/processing.service';
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
  
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly MIN_FILE_SIZE = 1024; // 1KB

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private processingService: ProcessingService,
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

    // Create asset record in database (using snake_case field names)
    const asset = await this.prisma.asset.create({
      data: {
        original_name: dto.filename,
        mime_type: dto.contentType,
        file_size: dto.fileSize,
        status: AssetStatus.UPLOADED,
        uploader_id: userId,
        report_json: dto.metadata || {},
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
      data: { original_url: objectKey },
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
      where: { id: assetId, uploader_id: userId },
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
        processed_at: new Date(),
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
        original_name: dto.originalName,
        mime_type: dto.mimeType,
        file_size: dto.fileSize,
        status: dto.status || AssetStatus.UPLOADED,
        uploader_id: userId,
        license: dto.license,
        original_url: dto.originalUrl,
        report_json: dto.reportJson,
        error_message: dto.errorMessage,
      },
    });
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string, userId: string): Promise<Asset> {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, uploader_id: userId },
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
        uploader_id: userId,
      },
      orderBy: { created_at: 'desc' },
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
        original_name: dto.originalName,
        status: dto.status,
        original_url: dto.originalUrl,
        meshopt_url: dto.meshoptUrl,
        draco_url: dto.dracoUrl,
        navmesh_url: dto.navmeshUrl,
        license: dto.license,
        report_json: dto.reportJson,
        error_message: dto.errorMessage,
      },
    });
  }

  /**
   * Delete an asset and its storage objects
   */
  async deleteAsset(assetId: string, userId: string): Promise<void> {
    const asset = await this.getAsset(assetId, userId);

    // Delete from storage
    if (asset.original_url) {
      try {
        await this.storageService.deleteAsset(asset.original_url);
      } catch (error) {
        this.logger.warn(`Failed to delete storage object for asset ${assetId}: ${error.message}`);
      }
    }

    // Delete processed variants from storage
    if (asset.meshopt_url) {
      try {
        await this.storageService.deleteAsset(asset.meshopt_url);
      } catch (error) {
        this.logger.warn(`Failed to delete meshopt variant: ${error.message}`);
      }
    }

    if (asset.draco_url) {
      try {
        await this.storageService.deleteAsset(asset.draco_url);
      } catch (error) {
        this.logger.warn(`Failed to delete draco variant: ${error.message}`);
      }
    }

    if (asset.navmesh_url) {
      try {
        await this.storageService.deleteAsset(asset.navmesh_url);
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
    variant: 'original' | 'meshopt' | 'draco' | 'navmesh' = 'original',
    expiresIn: number = 3600,
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    const asset = await this.getAsset(assetId, userId);

    let objectKey: string | null = null;
    
    switch (variant) {
      case 'original':
        objectKey = asset.original_url;
        break;
      case 'meshopt':
        objectKey = asset.meshopt_url;
        break;
      case 'draco':
        objectKey = asset.draco_url;
        break;
      case 'navmesh':
        objectKey = asset.navmesh_url;
        break;
    }

    if (!objectKey) {
      throw new BadRequestException(`Asset variant '${variant}' is not available`);
    }

    if (asset.status === AssetStatus.FAILED) {
      throw new BadRequestException('Asset processing failed');
    }

    return this.storageService.generatePresignedDownloadUrl(objectKey, expiresIn);
  }

  /**
   * Trigger background asset processing
   */
  private async triggerAssetProcessing(assetId: string, userId: string): Promise<void> {
    try {
      // This will be fully implemented in the next task (processing pipeline)
      // For now, we just mark the asset as ready
      setTimeout(async () => {
        await this.prisma.asset.update({
          where: { id: assetId },
          data: { status: AssetStatus.READY },
        });
        this.logger.log(`Marked asset ${assetId} as ready (processing pipeline will be implemented)`);
      }, 2000); // Simulate processing delay

    } catch (error) {
      this.logger.error(`Failed to process asset ${assetId}:`, error);
      
      await this.prisma.asset.update({
        where: { id: assetId },
        data: { 
          status: AssetStatus.FAILED,
          error_message: error.message,
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