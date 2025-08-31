import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUrl, Min, Max } from 'class-validator';

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
    minimum: 0.1,
    maximum: 5.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5.0)
  exposure?: number;

  @ApiProperty({
    description: 'Environment HDRI texture URL',
    example: 'https://example.com/hdri/studio.hdr',
    required: false,
  })
  @IsOptional()
  @IsUrl()
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
  @IsNumber()
  spawnPositionX?: number;

  @ApiProperty({
    description: 'Spawn position Y coordinate (height)',
    example: 1.7,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  spawnPositionY?: number;

  @ApiProperty({
    description: 'Spawn position Z coordinate',
    example: 5.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
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
}