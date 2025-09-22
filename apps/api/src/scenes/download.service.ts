import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  AssetVariant,
  DownloadAssetDto,
  BatchDownloadDto,
  AssetDownloadInfo,
  BatchDownloadResponse,
} from './dto/download-assets.dto';
import { createHash } from 'crypto';

@Injectable()
export class DownloadService {
  private readonly logger = new Logger(DownloadService.name);
  private readonly cdnBaseUrl: string;
  private readonly defaultCacheDuration = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {
    this.cdnBaseUrl = this.configService.get<string>('CDN_BASE_URL', '');
  }

  /**
   * Generate download URL for a specific asset
   */
  async generateAssetDownloadUrl(
    assetId: string,
    userId: string,
    downloadDto: DownloadAssetDto = {},
  ): Promise<AssetDownloadInfo> {
    // Verify asset ownership and get asset data
    const asset = await this.prisma.asset.findFirst({
      where: {
        id: assetId,
        uploaderId: userId,
        status: 'READY',
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found or not ready');
    }

    const variant = downloadDto.variant || AssetVariant.MESHOPT;
    const cacheDuration = downloadDto.cacheDuration || this.defaultCacheDuration;

    // Get the appropriate URL based on variant
    const assetUrl = this.getAssetUrlByVariant(asset, variant);
    if (!assetUrl) {
      throw new NotFoundException(`Asset variant '${variant}' not available`);
    }

    // Generate presigned download URL
    const presignedResult = await this.storageService.generatePresignedDownloadUrl(
      assetUrl,
      cacheDuration,
    );
    const downloadUrl = presignedResult.downloadUrl;

    // Generate ETag for caching
    const etag = this.generateETag(asset.id, variant, asset.updatedAt);

    // Build response
    const downloadInfo: AssetDownloadInfo = {
      assetId: asset.id,
      categoryKey: 'unknown', // Will be set by caller if needed
      filename: asset.originalName,
      downloadUrl,
      variant,
      fileSize: asset.fileSize,
      contentType: asset.mimeType,
      cacheHeaders: {
        'Cache-Control': `public, max-age=${cacheDuration}`,
        ETag: etag,
        'Last-Modified': asset.updatedAt.toUTCString(),
      },
      expiresAt: new Date(Date.now() + cacheDuration * 1000).toISOString(),
    };

    // Add CDN URL if available and requested
    if (downloadDto.includeCdn && this.cdnBaseUrl) {
      downloadInfo.cdnUrl = this.generateCdnUrl(assetUrl);
    }

    return downloadInfo;
  }

  /**
   * Generate download URLs for scene assets
   */
  async generateSceneDownloadUrls(
    projectId: string,
    sceneId: string,
    userId: string,
    batchDto: BatchDownloadDto,
  ): Promise<BatchDownloadResponse> {
    // Verify scene access
    const scene = await this.prisma.scene3D.findFirst({
      where: {
        id: sceneId,
        project: { id: projectId, userId: userId },
      },
      include: {
        items: {
          where: {
            categoryKey: { in: batchDto.categoryKeys },
          },
        },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found or access denied');
    }

    // Get unique category keys from scene items
    const categoryKeys = [...new Set(scene.items.map(item => item.categoryKey))];

    // Get project categories with assets
    const categories = await this.prisma.projectCategory3D.findMany({
      where: {
        projectId: projectId,
        categoryKey: { in: categoryKeys },
      },
      include: {
        asset: true,
      },
    });

    const assets: AssetDownloadInfo[] = [];
    let totalSize = 0;

    // Generate download URLs for each asset
    for (const category of categories) {
      if (!category.asset || category.asset.status !== 'READY') continue;

      try {
        const downloadInfo = await this.generateAssetDownloadUrl(
          category.asset.id,
          userId,
          {
            variant: batchDto.variant,
            cacheDuration: batchDto.cacheDuration,
            includeCdn: batchDto.includeCdn,
          },
        );

        downloadInfo.categoryKey = category.categoryKey;
        assets.push(downloadInfo);
        totalSize += downloadInfo.fileSize;
      } catch (error) {
        this.logger.warn(
          `Failed to generate download URL for asset ${category.asset.id}: ${error.message}`,
        );
      }
    }

    return {
      sceneId: scene.id,
      sceneName: scene.name,
      assets,
      totalSize,
      assetCount: assets.length,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate download URLs for all assets in a scene manifest
   */
  async generateManifestDownloadUrls(
    projectId: string,
    sceneId: string,
    userId: string,
    downloadDto: DownloadAssetDto = {},
  ): Promise<BatchDownloadResponse> {
    // Get all categories used in the scene
    const scene = await this.prisma.scene3D.findFirst({
      where: {
        id: sceneId,
        project: { id: projectId, userId: userId },
      },
      include: {
        items: true,
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found or access denied');
    }

    const categoryKeys = [...new Set(scene.items.map(item => item.categoryKey))];

    return this.generateSceneDownloadUrls(projectId, sceneId, userId, {
      categoryKeys,
      variant: downloadDto.variant,
      cacheDuration: downloadDto.cacheDuration,
      includeCdn: downloadDto.includeCdn,
    });
  }

  /**
   * Get asset URL by variant
   */
  private getAssetUrlByVariant(asset: any, variant: AssetVariant): string | null {
    switch (variant) {
      case AssetVariant.ORIGINAL:
        return asset.original_url;
      case AssetVariant.MESHOPT:
        return asset.meshopt_url;
      case AssetVariant.DRACO:
        return asset.draco_url;
      case AssetVariant.NAVMESH:
        return asset.navmesh_url;
      default:
        return asset.meshopt_url || asset.original_url;
    }
  }

  /**
   * Generate ETag for caching
   */
  private generateETag(assetId: string, variant: AssetVariant, updatedAt: Date): string {
    const data = `${assetId}-${variant}-${updatedAt.getTime()}`;
    return `"${createHash('md5').update(data).digest('hex')}"`;
  }

  /**
   * Generate CDN URL from storage URL
   */
  private generateCdnUrl(storageUrl: string): string {
    if (!this.cdnBaseUrl) return '';
    
    // Extract the object key from storage URL
    const url = new URL(storageUrl);
    const objectKey = url.pathname.substring(1); // Remove leading slash
    
    return `${this.cdnBaseUrl}/${objectKey}`;
  }

  /**
   * Validate asset variant availability
   */
  async validateAssetVariant(
    assetId: string,
    variant: AssetVariant,
    userId: string,
  ): Promise<boolean> {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id: assetId,
        uploaderId: userId,
        status: 'READY',
      },
    });

    if (!asset) return false;

    const url = this.getAssetUrlByVariant(asset, variant);
    return !!url;
  }

  /**
   * Get asset metadata for caching
   */
  async getAssetMetadata(assetId: string, userId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id: assetId,
        uploaderId: userId,
        status: 'READY',
      },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        updatedAt: true,
        originalUrl: true,
        meshoptUrl: true,
        dracoUrl: true,
        navmeshUrl: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }
}