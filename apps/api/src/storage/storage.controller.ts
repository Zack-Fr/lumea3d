import { Controller, Get, Head, Options, Param, Query, UseGuards, Req, Res, Logger, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/shared/guards/jwt-auth.guard';
import { StorageService } from './storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GetObjectCommand } from '@aws-sdk/client-s3';

@ApiTags('Storage')
@Controller('storage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('assets/:assetId')
  @ApiOperation({ summary: 'Get presigned download URL for an asset' })
  @ApiResponse({ status: 200, description: 'Presigned URL generated successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async getAssetDownloadUrl(
    @Param('assetId') assetId: string,
    @Query('variant') variant: string = 'original',
    @Req() req: any,
  ) {
    const userId = req.user.id;

    this.logger.log(`Generating download URL for asset ${assetId}, variant: ${variant}, user: ${userId}`);

    // Find the asset in database
    const asset = await this.prisma.asset.findFirst({
      where: {
        id: assetId,
        uploaderId: userId,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found or access denied');
    }

    // Get the appropriate URL based on variant
    let assetUrl: string | null = null;
    let objectKey: string;

    switch (variant) {
      case 'meshopt':
        assetUrl = asset.meshoptUrl;
        objectKey = asset.originalUrl?.replace('original', 'meshopt') || '';
        break;
      case 'draco':
        assetUrl = asset.dracoUrl;
        objectKey = asset.originalUrl?.replace('original', 'draco') || '';
        break;
      case 'navmesh':
        assetUrl = asset.navmeshUrl;
        objectKey = asset.originalUrl?.replace('original', 'navmesh') || '';
        break;
      case 'original':
      default:
        assetUrl = asset.originalUrl;
        objectKey = asset.originalUrl || '';
        break;
    }

    if (!assetUrl) {
      throw new NotFoundException(`Asset variant '${variant}' not available`);
    }

    // If it's already a full URL (from cloud storage), return it directly
    if (assetUrl.startsWith('http')) {
      return {
        downloadUrl: assetUrl,
        expiresIn: 3600, // Assume cloud URLs are valid for 1 hour
      };
    }

    // Otherwise, generate a presigned URL from the object key
    const result = await this.storageService.generatePresignedDownloadUrl(objectKey);

    return result;
  }

  @Get('assets/:assetId/download')
  @ApiOperation({ summary: 'Download asset file directly' })
  @ApiResponse({ status: 200, description: 'Asset file stream' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async downloadAsset(
    @Param('assetId') assetId: string,
    @Query('variant') variant: string = 'original',
    @Req() req: any,
  ) {
    const userId = req.user.id;

    this.logger.log(`Downloading asset ${assetId}, variant: ${variant}, user: ${userId}`);

    // Find the asset in database
    const asset = await this.prisma.asset.findFirst({
      where: {
        id: assetId,
        uploaderId: userId,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found or access denied');
    }

    // Get the appropriate URL based on variant
    let assetUrl: string | null = null;

    switch (variant) {
      case 'meshopt':
        assetUrl = asset.meshoptUrl;
        break;
      case 'draco':
        assetUrl = asset.dracoUrl;
        break;
      case 'navmesh':
        assetUrl = asset.navmeshUrl;
        break;
      case 'original':
      default:
        assetUrl = asset.originalUrl;
        break;
    }

    if (!assetUrl) {
      throw new NotFoundException(`Asset variant '${variant}' not available`);
    }

    // For now, redirect to the asset URL
    // In production, this would stream the file directly
    return {
      redirectUrl: assetUrl,
      message: 'Use the redirect URL to download the asset',
    };
  }

}

// Public asset serving (no authentication required)
@Controller('public/storage')
export class PublicStorageController {
  private readonly logger = new Logger(PublicStorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Get('serve/:bucketName/:objectKey(*)')
  @Head('serve/:bucketName/:objectKey(*)')
  @Options('serve/:bucketName/:objectKey(*)')
  @ApiOperation({ summary: 'Serve asset file directly (public endpoint for 3D viewer)' })
  @ApiResponse({ status: 200, description: 'Asset file content' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async serveAsset(
    @Param('bucketName') bucketName: string,
    @Param('objectKey') encodedObjectKey: string,
    @Res() res: any,
    @Req() req: any,
  ) {
    try {
      // Decode the object key
      const objectKey = decodeURIComponent(encodedObjectKey);
      this.logger.log(`[DEBUG] PublicStorageController - method: ${req.method}`);
      this.logger.log(`[DEBUG] PublicStorageController - bucketName: ${bucketName}`);
      this.logger.log(`[DEBUG] PublicStorageController - encodedObjectKey: ${encodedObjectKey}`);
      this.logger.log(`[DEBUG] PublicStorageController - decodedObjectKey: ${objectKey}`);
      this.logger.log(`Public serving asset: ${objectKey}`);
      
      // Extract filename from object key for temp file and content type
      const filename = objectKey.split('/').pop() || 'asset';
      
      // Set appropriate headers first
      if (filename.endsWith('.glb') || filename.endsWith('.gltf')) {
        res.set('Content-Type', 'model/gltf-binary');
      } else {
        res.set('Content-Type', 'application/octet-stream');
      }
      
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
      
      // For OPTIONS requests (CORS preflight), just return headers
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      
      // For HEAD requests, just return headers without body
      if (req.method === 'HEAD') {
        // Check if file exists first
        const exists = await this.storageService.objectExists(objectKey);
        if (!exists) {
          throw new NotFoundException('Asset not found');
        }
        return res.status(200).end();
      }
      
      // For GET requests, download and serve the file
      const tempFile = `/tmp/${Date.now()}-${filename}`;
      await this.storageService.downloadAssetToFile(objectKey, tempFile);
      
      // Send the file
      res.sendFile(tempFile, (err) => {
        if (err) {
          this.logger.error(`Error sending file: ${err.message}`);
        }
        // Clean up temp file
        require('fs').unlink(tempFile, () => {});
      });
      
    } catch (error) {
      this.logger.error(`Failed to serve asset: ${error.message}`);
      throw new NotFoundException('Asset not found or inaccessible');
    }
  }
}