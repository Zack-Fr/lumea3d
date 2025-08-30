import { IsString, IsNumber, IsOptional, IsEnum, IsObject, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { AssetStatus, AssetLicense } from '@prisma/client';

export class AssetUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;

  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100MB
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsInt()
  @Min(1)
  fileSize: number;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsString()
  originalUrl?: string;

  @IsOptional()
  @IsEnum(AssetLicense)
  license?: AssetLicense;

  @IsOptional()
  @IsObject()
  reportJson?: Record<string, any>;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  originalName?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsString()
  originalUrl?: string;

  @IsOptional()
  @IsString()
  meshoptUrl?: string;

  @IsOptional()
  @IsString()
  dracoUrl?: string;

  @IsOptional()
  @IsString()
  navmeshUrl?: string;

  @IsOptional()
  @IsEnum(AssetLicense)
  license?: AssetLicense;

  @IsOptional()
  @IsObject()
  reportJson?: Record<string, any>;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class AssetQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class GenerateDownloadUrlDto {
  @IsOptional()
  @IsInt()
  @Min(300) // 5 minutes minimum
  @Max(86400) // 24 hours maximum
  expiresIn?: number = 3600; // 1 hour default
}