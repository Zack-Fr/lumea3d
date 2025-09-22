import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsEnum, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { IsValidCategoryKey } from '../../shared/decorators/transform-validation.decorator';

export enum AssetVariant {
  ORIGINAL = 'original',
  MESHOPT = 'meshopt',
  DRACO = 'draco',
  NAVMESH = 'navmesh',
}

export class DownloadAssetDto {
  @ApiProperty({
    description: 'Asset variant to download',
    enum: AssetVariant,
    example: AssetVariant.MESHOPT,
    required: false,
  })
  @IsOptional()
  @IsEnum(AssetVariant)
  variant?: AssetVariant;

  @ApiProperty({
    description: 'Cache duration in seconds',
    example: 3600,
    minimum: 60,
    maximum: 86400,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(60) // 1 minute minimum
  @Max(86400) // 24 hours maximum
  cacheDuration?: number;

  @ApiProperty({
    description: 'Include CDN URLs if available',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeCdn?: boolean;
}

export class BatchDownloadDto {
  @ApiProperty({
    description: 'Category keys to include in batch download',
    example: ['chairs', 'tables', 'lamps'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsValidCategoryKey({ each: true })
  categoryKeys: string[];

  @ApiProperty({
    description: 'Asset variant to download for all items',
    enum: AssetVariant,
    example: AssetVariant.MESHOPT,
    required: false,
  })
  @IsOptional()
  @IsEnum(AssetVariant)
  variant?: AssetVariant;

  @ApiProperty({
    description: 'Cache duration in seconds',
    example: 3600,
    minimum: 60,
    maximum: 86400,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(60) // 1 minute minimum
  @Max(86400) // 24 hours maximum
  cacheDuration?: number;

  @ApiProperty({
    description: 'Include CDN URLs if available',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeCdn?: boolean;
}

export class AssetDownloadInfo {
  @ApiProperty({
    description: 'Asset ID',
    example: 'clabcd123...',
  })
  assetId: string;

  @ApiProperty({
    description: 'Category key',
    example: 'chairs',
  })
  categoryKey: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'office_chair.glb',
  })
  filename: string;

  @ApiProperty({
    description: 'Presigned download URL',
    example: 'https://minio.example.com/lumea-assets/optimized/chair_meshopt.glb?X-Amz-Signature=...',
  })
  downloadUrl: string;

  @ApiProperty({
    description: 'CDN URL if available',
    example: 'https://cdn.example.com/assets/chair_meshopt.glb',
    required: false,
  })
  cdnUrl?: string;

  @ApiProperty({
    description: 'Asset variant',
    enum: AssetVariant,
    example: AssetVariant.MESHOPT,
  })
  variant: AssetVariant;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048576,
  })
  fileSize: number;

  @ApiProperty({
    description: 'Content type',
    example: 'model/gltf-binary',
  })
  contentType: string;

  @ApiProperty({
    description: 'Cache headers',
  })
  cacheHeaders: {
    'Cache-Control': string;
    ETag: string;
    'Last-Modified': string;
  };

  @ApiProperty({
    description: 'URL expiration timestamp',
    example: '2025-08-31T12:00:00.000Z',
  })
  expiresAt: string;
}

export class BatchDownloadResponse {
  @ApiProperty({
    description: 'Scene ID',
    example: 'clabcd123...',
  })
  sceneId: string;

  @ApiProperty({
    description: 'Scene name',
    example: 'Living Room Layout',
  })
  sceneName: string;

  @ApiProperty({
    description: 'Assets available for download',
    type: [AssetDownloadInfo],
  })
  assets: AssetDownloadInfo[];

  @ApiProperty({
    description: 'Total file size in bytes',
    example: 10485760,
  })
  totalSize: number;

  @ApiProperty({
    description: 'Number of assets',
    example: 5,
  })
  assetCount: number;

  @ApiProperty({
    description: 'Batch generation timestamp',
    example: '2025-08-31T12:00:00.000Z',
  })
  generatedAt: string;
}