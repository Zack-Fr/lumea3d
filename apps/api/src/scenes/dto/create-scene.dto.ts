import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUrl, IsBoolean, Min, Max } from 'class-validator';
import { IsValidPosition, IsValidExposure } from '../../shared/decorators/transform-validation.decorator';

export class CreateSceneDto {
  @ApiProperty({
    description: 'Name of the 3D scene',
    example: 'Living Room Layout',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Scene scale factor',
    example: 1.0,
    minimum: 0.1,
    maximum: 10.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10.0)
  scale?: number;

  @ApiProperty({
    description: 'Scene exposure level',
    example: 1.0,
    minimum: -10,
    maximum: 10,
    required: false,
  })
  @IsOptional()
  @IsValidExposure()
  exposure?: number;

  @ApiProperty({
    description: 'Environment HDRI texture URL',
    example: 'https://example.com/hdri/studio.hdr',
    required: false,
  })
  @IsOptional()
  @IsString() // Temporarily using IsString instead of IsUrl to test validation issue
  envHdriUrl?: string;

  @ApiProperty({
    description: 'Environment light intensity',
    example: 1.0,
    minimum: 0.0,
    maximum: 10.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(10.0)
  envIntensity?: number;

  @ApiProperty({
    description: 'Spawn position X coordinate',
    example: 0.0,
    required: false,
  })
  @IsOptional()
  @IsValidPosition()
  spawnPositionX?: number;

  @ApiProperty({
    description: 'Spawn position Y coordinate (height)',
    example: 1.7,
    required: false,
  })
  @IsOptional()
  @IsValidPosition()
  spawnPositionY?: number;

  @ApiProperty({
    description: 'Spawn position Z coordinate',
    example: 5.0,
    required: false,
  })
  @IsOptional()
  @IsValidPosition()
  spawnPositionZ?: number;

  @ApiProperty({
    description: 'Spawn rotation yaw in degrees',
    example: 0.0,
    minimum: -180,
    maximum: 180,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  spawnYawDeg?: number;

  @ApiProperty({
    description: 'Navmesh asset ID for pathfinding',
    example: 'clabcd123...',
    required: false,
  })
  @IsOptional()
  @IsString()
  navmeshAssetId?: string;

  @ApiProperty({
    description: 'Shell asset ID for scene container/environment',
    example: 'clabcd456...',
    required: false,
  })
  @IsOptional()
  @IsString()
  shellAssetId?: string;

  @ApiProperty({
    description: 'Whether the shell should cast shadows',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  shellCastShadow?: boolean;

  @ApiProperty({
    description: 'Whether the shell should receive shadows',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  shellReceiveShadow?: boolean;
}