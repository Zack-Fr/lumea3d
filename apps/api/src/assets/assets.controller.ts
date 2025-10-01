import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../auth/shared/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/shared/decorators/current-user.decorator';
import { User } from '@prisma/client';
import {
  AssetUploadUrlDto,
  CreateAssetDto,
  UpdateAssetDto,
  AssetQueryDto,
  GenerateDownloadUrlDto,
} from './dto/assets.dto';
import { ApiTags } from '@nestjs/swagger';
@ApiTags('Assets')
@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  /**
   * Generate presigned upload URL for a new asset
   * POST /assets/upload-url
   */
  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  async generateUploadUrl(
    @CurrentUser() user: User,
    @Body() dto: AssetUploadUrlDto,
  ) {
    return this.assetsService.generateUploadUrl(user.id, dto);
  }

  /**
   * Handle upload completion callback
   * POST /assets/:id/upload-complete
   */
  @Post(':id/upload-complete')
  @HttpCode(HttpStatus.OK)
  async handleUploadComplete(
    @CurrentUser() user: User,
    @Param('id') assetId: string,
  ) {
    return this.assetsService.handleUploadComplete(assetId, user.id);
  }

  /**
   * Create a new asset record
   * POST /assets
   */
  @Post()
  async createAsset(
    @CurrentUser() user: User,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetsService.createAsset(user.id, dto);
  }

  /**
   * Get all assets for the current user
   * GET /assets
   */
  @Get()
  async getUserAssets(
    @CurrentUser() user: User,
    @Query() query: AssetQueryDto,
  ) {
    return this.assetsService.getUserAssets(user.id);
  }

  /**
   * Get a specific asset by ID
   * GET /assets/:id
   */
  @Get(':id')
  async getAsset(
    @CurrentUser() user: User,
    @Param('id') assetId: string,
  ) {
    const asset = await this.assetsService.getAsset(assetId, user.id);
    
    // Build convenient URLs map
    const urls: Record<string, string> = {};
    if (asset.originalUrl) urls.original = asset.originalUrl;
    if (asset.meshoptUrl) urls.meshopt = asset.meshoptUrl;
    if (asset.dracoUrl) urls.draco = asset.dracoUrl;
    if (asset.ktx2Url) urls.ktx2 = asset.ktx2Url;
    if (asset.navmeshUrl) urls.navmesh = asset.navmeshUrl;
    
    return {
      ...asset,
      urls,
    };
  }

  /**
   * Update asset metadata
   * PUT /assets/:id
   */
  @Put(':id')
  async updateAsset(
    @CurrentUser() user: User,
    @Param('id') assetId: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.updateAsset(assetId, user.id, dto);
  }

  /**
   * Delete an asset
   * DELETE /assets/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAsset(
    @CurrentUser() user: User,
    @Param('id') assetId: string,
  ) {
    await this.assetsService.deleteAsset(assetId, user.id);
  }

  /**
   * Generate download URL for an asset variant
   * POST /assets/:id/download-url
   */
  @Post(':id/download-url')
  @HttpCode(HttpStatus.OK)
  async generateDownloadUrl(
    @CurrentUser() user: User,
    @Param('id') assetId: string,
    @Query('variant') variant: 'original' | 'meshopt' | 'draco' | 'ktx2' | 'navmesh' = 'original',
    @Body() dto: GenerateDownloadUrlDto,
  ) {
    return this.assetsService.generateDownloadUrl(
      assetId,
      user.id,
      variant,
      dto.expiresIn,
    );
  }

  /**
   * Get asset processing status
   * GET /assets/:id/status
   */
  @Get(':id/status')
  async getAssetStatus(
    @CurrentUser() user: User,
    @Param('id') assetId: string,
  ) {
    const asset = await this.assetsService.getAsset(assetId, user.id);
    
    return {
      id: asset.id,
      status: asset.status,
      originalUrl: asset.originalUrl,
      meshoptUrl: asset.meshoptUrl,
      dracoUrl: asset.dracoUrl,
      ktx2Url: asset.ktx2Url,
      navmeshUrl: asset.navmeshUrl,
      errorMessage: asset.errorMessage,
      processedAt: asset.processedAt,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }

  /**
   * Get available variants for an asset
   * GET /assets/:id/variants
   */
  @Get(':id/variants')
  async getAssetVariants(
    @CurrentUser() user: User,
    @Param('id') assetId: string,
  ) {
    const asset = await this.assetsService.getAsset(assetId, user.id);
    
    const variants = [];
    
    if (asset.originalUrl) {
      variants.push({
        type: 'original',
        url: asset.originalUrl,
        available: true,
      });
    }
    
    if (asset.meshoptUrl) {
      variants.push({
        type: 'meshopt',
        url: asset.meshoptUrl,
        available: true,
      });
    }
    
    if (asset.dracoUrl) {
      variants.push({
        type: 'draco',
        url: asset.dracoUrl,
        available: true,
      });
    }
    
    if (asset.navmeshUrl) {
      variants.push({
        type: 'navmesh',
        url: asset.navmeshUrl,
        available: true,
      });
    }
    
    if (asset.ktx2Url) {
      variants.push({
        type: 'ktx2',
        url: asset.ktx2Url,
        available: true,
      });
    }
    
    return { variants };
  }

  /**
   * Get detailed processing status for an asset
   * GET /assets/:id/processing-status
   */
  @Get(':id/processing-status')
  async getProcessingStatus(
    @CurrentUser() user: User,
    @Param('id') assetId: string,
  ) {
    return this.assetsService.getAssetProcessingStatus(assetId, user.id);
  }

  /**
   * Retry failed asset processing
   * POST /assets/:id/retry-processing
   */
  @Post(':id/retry-processing')
  @HttpCode(HttpStatus.OK)
  async retryProcessing(
    @CurrentUser() user: User,
    @Param('id') assetId: string,
  ) {
    const retried = await this.assetsService.retryAssetProcessing(assetId, user.id);
    return {
      success: retried,
      message: retried ? 'Processing retried successfully' : 'Failed to retry processing',
    };
  }
}