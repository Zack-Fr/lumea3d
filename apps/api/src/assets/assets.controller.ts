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
    return this.assetsService.getAsset(assetId, user.id);
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
    @Query('variant') variant: 'original' | 'meshopt' | 'draco' | 'navmesh' = 'original',
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
      originalUrl: asset.original_url,
      meshoptUrl: asset.meshopt_url,
      dracoUrl: asset.draco_url,
      navmeshUrl: asset.navmesh_url,
      errorMessage: asset.error_message,
      processedAt: asset.processed_at,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at,
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
    
    if (asset.original_url) {
      variants.push({
        type: 'original',
        url: asset.original_url,
        available: true,
      });
    }
    
    if (asset.meshopt_url) {
      variants.push({
        type: 'meshopt',
        url: asset.meshopt_url,
        available: true,
      });
    }
    
    if (asset.draco_url) {
      variants.push({
        type: 'draco',
        url: asset.draco_url,
        available: true,
      });
    }
    
    if (asset.navmesh_url) {
      variants.push({
        type: 'navmesh',
        url: asset.navmesh_url,
        available: true,
      });
    }
    
    return { variants };
  }
}