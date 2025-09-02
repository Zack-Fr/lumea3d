import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsNotEmpty, IsOptional, Min, Max } from 'class-validator';

export class CreatePlacementAdjustmentDto {
  @ApiProperty({
    description: 'Scene ID where the placement adjustment occurred',
    example: 'clabcd123...',
  })
  @IsString()
  @IsNotEmpty()
  sceneId: string;

  @ApiProperty({
    description: 'Placement ID that was adjusted',
    example: 'clabcd456...',
  })
  @IsString()
  @IsNotEmpty()
  placementId: string;

  @ApiProperty({
    description: 'Previous X position in centimeters',
    example: 250,
    minimum: -100000,
    maximum: 100000,
  })
  @IsInt()
  @Min(-100000)
  @Max(100000)
  oldXCm: number;

  @ApiProperty({
    description: 'Previous Y position in centimeters',
    example: 0,
    minimum: -100000,
    maximum: 100000,
  })
  @IsInt()
  @Min(-100000)
  @Max(100000)
  oldYCm: number;

  @ApiProperty({
    description: 'New X position in centimeters',
    example: 300,
    minimum: -100000,
    maximum: 100000,
  })
  @IsInt()
  @Min(-100000)
  @Max(100000)
  newXCm: number;

  @ApiProperty({
    description: 'New Y position in centimeters',
    example: 10,
    minimum: -100000,
    maximum: 100000,
  })
  @IsInt()
  @Min(-100000)
  @Max(100000)
  newYCm: number;

  @ApiProperty({
    description: 'Previous rotation in degrees',
    example: 0,
    minimum: -180,
    maximum: 180,
  })
  @IsInt()
  @Min(-180)
  @Max(180)
  oldRotation: number;

  @ApiProperty({
    description: 'New rotation in degrees',
    example: 90,
    minimum: -180,
    maximum: 180,
  })
  @IsInt()
  @Min(-180)
  @Max(180)
  newRotation: number;
}

export class UpdatePlacementAdjustmentDto {
  @ApiProperty({
    description: 'Previous X position in centimeters',
    example: 250,
    minimum: -100000,
    maximum: 100000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(-100000)
  @Max(100000)
  oldXCm?: number;

  @ApiProperty({
    description: 'Previous Y position in centimeters',
    example: 0,
    minimum: -100000,
    maximum: 100000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(-100000)
  @Max(100000)
  oldYCm?: number;

  @ApiProperty({
    description: 'New X position in centimeters',
    example: 300,
    minimum: -100000,
    maximum: 100000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(-100000)
  @Max(100000)
  newXCm?: number;

  @ApiProperty({
    description: 'New Y position in centimeters',
    example: 10,
    minimum: -100000,
    maximum: 100000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(-100000)
  @Max(100000)
  newYCm?: number;

  @ApiProperty({
    description: 'Previous rotation in degrees',
    example: 0,
    minimum: -180,
    maximum: 180,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(-180)
  @Max(180)
  oldRotation?: number;

  @ApiProperty({
    description: 'New rotation in degrees',
    example: 90,
    minimum: -180,
    maximum: 180,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(-180)
  @Max(180)
  newRotation?: number;
}

export class PlacementAdjustmentQueryDto {
  @ApiProperty({
    description: 'Filter by scene ID',
    example: 'clabcd123...',
    required: false,
  })
  @IsOptional()
  @IsString()
  sceneId?: string;

  @ApiProperty({
    description: 'Filter by placement ID',
    example: 'clabcd456...',
    required: false,
  })
  @IsOptional()
  @IsString()
  placementId?: string;

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: 50,
    minimum: 1,
    maximum: 500,
    required: false,
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
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

  @ApiProperty({
    description: 'Filter by minimum movement distance in centimeters',
    example: 5,
    minimum: 0,
    maximum: 100000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  minMovementCm?: number;
}