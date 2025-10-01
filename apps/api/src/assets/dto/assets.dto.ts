import { IsString, IsNumber, IsOptional, IsEnum, IsObject, IsInt, Min, Max, IsNotEmpty, IsDateString } from 'class-validator';
import { AssetStatus, AssetLicense } from '@prisma/client';
import { IsValid3DAssetType, IsValidAssetSize, IsValidCategoryKey } from '../../shared/decorators/transform-validation.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class AssetUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  @IsValid3DAssetType()
  contentType: string;

  @IsInt()
  @Min(1)
  @IsValidAssetSize(100) // 100MB max
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  @IsValidCategoryKey()
  category: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateAssetDto {
  @ApiProperty({
    description: 'Original filename of the uploaded asset',
    example: 'office_chair.glb',
  })
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty({
    description: 'MIME type of the asset file',
    example: 'model/gltf-binary',
  })
  @IsString()
  @IsNotEmpty()
  @IsValid3DAssetType()
  mimeType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048576,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  fileSize: number;

  @ApiProperty({
    description: 'Current processing status of the asset',
    enum: AssetStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiProperty({
    description: 'URL to the original uploaded file',
    example: 'https://storage.example.com/assets/original/123.glb',
    required: false,
  })
  @IsOptional()
  @IsString()
  originalUrl?: string;

  @ApiProperty({
    description: 'URL to the meshopt-compressed version',
    example: 'https://storage.example.com/assets/meshopt/123.glb',
    required: false,
  })
  @IsOptional()
  @IsString()
  meshoptUrl?: string;

  @ApiProperty({
    description: 'URL to the Draco-compressed version',
    example: 'https://storage.example.com/assets/draco/123.glb',
    required: false,
  })
  @IsOptional()
  @IsString()
  dracoUrl?: string;

  @ApiProperty({
    description: 'URL to the generated navigation mesh',
    example: 'https://storage.example.com/assets/navmesh/123.glb',
    required: false,
  })
  @IsOptional()
  @IsString()
  navmeshUrl?: string;

  @ApiProperty({
    description: 'Asset license type',
    enum: AssetLicense,
    required: false,
  })
  @IsOptional()
  @IsEnum(AssetLicense)
  license?: AssetLicense;

  @ApiProperty({
    description: 'Processing report in JSON format',
    example: { vertices: 1024, triangles: 2048, materials: 3 },
    required: false,
  })
  @IsOptional()
  @IsObject()
  reportJson?: Record<string, any>;

  @ApiProperty({
    description: 'Error message if processing failed',
    example: 'Invalid GLTF structure',
    required: false,
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({
    description: 'Timestamp when processing completed',
    example: '2023-09-02T12:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  processedAt?: string;
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
  @IsValidCategoryKey()
  category?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100) // Reasonable pagination limit
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