import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Header,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { DownloadService } from './download.service';
import {
  DownloadAssetDto,
  BatchDownloadDto,
  AssetDownloadInfo,
  BatchDownloadResponse,
} from './dto/download-assets.dto';
import { JwtAuthGuard } from '../auth/shared/guards/jwt-auth.guard';

@ApiTags('Scene Downloads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/scenes/:sceneId/download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  @Get('manifest')
  @ApiOperation({
    summary: 'Download all assets in scene manifest',
    description: 'Generates presigned download URLs for all assets referenced in the scene',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiQuery({
    name: 'variant',
    description: 'Asset variant to download',
    required: false,
    enum: ['original', 'meshopt', 'draco', 'navmesh'],
  })
  @ApiQuery({
    name: 'cacheDuration',
    description: 'Cache duration in seconds',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'includeCdn',
    description: 'Include CDN URLs if available',
    required: false,
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'Manifest download URLs generated successfully',
    type: BatchDownloadResponse,
  })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  async downloadManifest(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Query() downloadDto: DownloadAssetDto,
    @Request() req: any,
  ): Promise<BatchDownloadResponse> {
    return this.downloadService.generateManifestDownloadUrls(
      projectId,
      sceneId,
      req.user.id,
      downloadDto,
    );
  }

  @Post('batch')
  @ApiOperation({
    summary: 'Download specific scene assets',
    description: 'Generates presigned download URLs for specified asset categories in the scene',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({
    status: 200,
    description: 'Batch download URLs generated successfully',
    type: BatchDownloadResponse,
  })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  async downloadBatch(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Body() batchDto: BatchDownloadDto,
    @Request() req: any,
  ): Promise<BatchDownloadResponse> {
    return this.downloadService.generateSceneDownloadUrls(
      projectId,
      sceneId,
      req.user.id,
      batchDto,
    );
  }

  @Get('assets/:assetId')
  @ApiOperation({
    summary: 'Download specific asset',
    description: 'Generates presigned download URL for a specific asset with caching headers',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiParam({ name: 'assetId', description: 'Asset ID' })
  @ApiQuery({
    name: 'variant',
    description: 'Asset variant to download',
    required: false,
    enum: ['original', 'meshopt', 'draco', 'navmesh'],
  })
  @ApiQuery({
    name: 'cacheDuration',
    description: 'Cache duration in seconds',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'includeCdn',
    description: 'Include CDN URLs if available',
    required: false,
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'Asset download URL generated successfully',
    type: AssetDownloadInfo,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async downloadAsset(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Param('assetId') assetId: string,
    @Query() downloadDto: DownloadAssetDto,
    @Request() req: any,
  ): Promise<AssetDownloadInfo> {
    return this.downloadService.generateAssetDownloadUrl(
      assetId,
      req.user.id,
      downloadDto,
    );
  }

  @Get('assets/:assetId/redirect')
  @ApiOperation({
    summary: 'Direct asset download with redirect',
    description: 'Redirects to the presigned URL for immediate download with proper cache headers',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiParam({ name: 'assetId', description: 'Asset ID' })
  @ApiQuery({
    name: 'variant',
    description: 'Asset variant to download',
    required: false,
    enum: ['original', 'meshopt', 'draco', 'navmesh'],
  })
  @ApiResponse({ status: 302, description: 'Redirect to asset download URL' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async redirectToAsset(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Param('assetId') assetId: string,
    @Query() downloadDto: DownloadAssetDto,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const downloadInfo = await this.downloadService.generateAssetDownloadUrl(
      assetId,
      req.user.id,
      downloadDto,
    );

    // Set caching headers
    res.set(downloadInfo.cacheHeaders);
    
    // Set content disposition for download
    res.set(
      'Content-Disposition',
      `attachment; filename="${downloadInfo.filename}"`,
    );

    // Redirect to the presigned URL
    res.redirect(302, downloadInfo.downloadUrl);
  }

  @Get('assets/:assetId/metadata')
  @ApiOperation({
    summary: 'Get asset metadata for caching',
    description: 'Returns asset metadata including ETag and Last-Modified for client-side caching',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiParam({ name: 'assetId', description: 'Asset ID' })
  @ApiResponse({ status: 200, description: 'Asset metadata retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async getAssetMetadata(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Param('assetId') assetId: string,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const metadata = await this.downloadService.getAssetMetadata(
      assetId,
      req.user.id,
    );

    // Set caching headers
    res.set({
      'Cache-Control': 'public, max-age=3600',
      ETag: `"${metadata.id}-${metadata.updatedAt.getTime()}"`,
      'Last-Modified': metadata.updatedAt.toUTCString(),
    });

    res.json({
      id: metadata.id,
      filename: metadata.originalName,
      contentType: metadata.mimeType,
      fileSize: metadata.fileSize,
      lastModified: metadata.updatedAt.toISOString(),
      variants: {
        original: !!metadata.originalUrl,
        meshopt: !!metadata.meshoptUrl,
        draco: !!metadata.dracoUrl,
        navmesh: !!metadata.navmeshUrl,
      },
    });
  }
}