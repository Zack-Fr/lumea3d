import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUrl, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { IsValidPosition, IsValidExposure, IsValidRotation } from '../../../shared/decorators/transform-validation.decorator';

export class CreateScene3DDto {
  @ApiProperty({
    description: 'Name of the 3D scene',
    example: 'Living Room Layout v2',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Scene version number',
    example: 1,
    minimum: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiProperty({
    description: 'Global scene scale factor',
    example: 1.0,
    minimum: 0.01,
    maximum: 100.0,
    required: false,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100.0)
  scale?: number;

  @ApiProperty({
    description: 'Scene exposure level for HDR rendering',
    example: 1.0,
    minimum: -10,
    maximum: 10,
    required: false,
    default: 1.0,
  })
  @IsOptional()
  @IsValidExposure()
  exposure?: number;

  @ApiProperty({
    description: 'Environment HDRI texture URL for IBL lighting',
    example: 'https://storage.example.com/hdri/studio.hdr',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  envHdriUrl?: string;

  @ApiProperty({
    description: 'Environment light intensity multiplier',
    example: 1.0,
    minimum: 0.0,
    maximum: 50.0,
    required: false,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(50.0)
  envIntensity?: number;

  @ApiProperty({
    description: 'Default spawn position X coordinate (meters)',
    example: 0.0,
    required: false,
    default: 0.0,
  })
  @IsOptional()
  @IsValidPosition()
  spawnPositionX?: number;

  @ApiProperty({
    description: 'Default spawn position Y coordinate (height in meters)',
    example: 1.7,
    required: false,
    default: 1.7,
  })
  @IsOptional()
  @IsValidPosition()
  spawnPositionY?: number;

  @ApiProperty({
    description: 'Default spawn position Z coordinate (meters)',
    example: 5.0,
    required: false,
    default: 5.0,
  })
  @IsOptional()
  @IsValidPosition()
  spawnPositionZ?: number;

  @ApiProperty({
    description: 'Default spawn rotation yaw in degrees',
    example: 0.0,
    minimum: -180,
    maximum: 180,
    required: false,
    default: 0.0,
  })
  @IsOptional()
  @IsValidRotation()
  spawnYawDeg?: number;

  @ApiProperty({
    description: 'Asset ID for the navigation mesh (optional)',
    example: 'clabcd123...',
    required: false,
  })
  @IsOptional()
  @IsString()
  navmeshAssetId?: string;
}

export class UpdateScene3DDto {
  @ApiProperty({
    description: 'Name of the 3D scene',
    example: 'Living Room Layout v3',
    minLength: 1,
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({
    description: 'Scene version number',
    example: 2,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiProperty({
    description: 'Global scene scale factor',
    example: 1.2,
    minimum: 0.01,
    maximum: 100.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100.0)
  scale?: number;

  @ApiProperty({
    description: 'Scene exposure level for HDR rendering',
    example: 0.5,
    minimum: -10,
    maximum: 10,
    required: false,
  })
  @IsOptional()
  @IsValidExposure()
  exposure?: number;

  @ApiProperty({
    description: 'Environment HDRI texture URL for IBL lighting',
    example: 'https://storage.example.com/hdri/sunset.hdr',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  envHdriUrl?: string;

  @ApiProperty({
    description: 'Environment light intensity multiplier',
    example: 2.0,
    minimum: 0.0,
    maximum: 50.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(50.0)
  envIntensity?: number;

  @ApiProperty({
    description: 'Default spawn position X coordinate (meters)',
    example: 1.0,
    required: false,
  })
  @IsOptional()
  @IsValidPosition()
  spawnPositionX?: number;

  @ApiProperty({
    description: 'Default spawn position Y coordinate (height in meters)',
    example: 1.8,
    required: false,
  })
  @IsOptional()
  @IsValidPosition()
  spawnPositionY?: number;

  @ApiProperty({
    description: 'Default spawn position Z coordinate (meters)',
    example: 3.0,
    required: false,
  })
  @IsOptional()
  @IsValidPosition()
  spawnPositionZ?: number;

  @ApiProperty({
    description: 'Default spawn rotation yaw in degrees',
    example: 45.0,
    minimum: -180,
    maximum: 180,
    required: false,
  })
  @IsOptional()
  @IsValidRotation()
  spawnYawDeg?: number;

  @ApiProperty({
    description: 'Asset ID for the navigation mesh (optional)',
    example: 'clabcd456...',
    required: false,
  })
  @IsOptional()
  @IsString()
  navmeshAssetId?: string;
}

export class Scene3DQueryDto {
  @ApiProperty({
    description: 'Filter by project ID',
    example: 'clabcd123...',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Filter by scene name (partial match)',
    example: 'Living Room',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Filter by minimum version number',
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  minVersion?: number;

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: 20,
    minimum: 1,
    maximum: 100,
    required: false,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({
    description: 'Number of results to skip for pagination',
    example: 0,
    minimum: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}