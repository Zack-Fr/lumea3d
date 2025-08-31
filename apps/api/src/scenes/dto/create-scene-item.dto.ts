import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { 
  IsValidPosition, 
  IsValidRotation, 
  IsValidScale, 
  IsValidCategoryKey 
} from '../../shared/decorators/transform-validation.decorator';

export class CreateSceneItemDto {
  @ApiProperty({
    description: 'Category key referencing project assets',
    example: 'chairs',
  })
  @IsValidCategoryKey()
  categoryKey: string;

  @ApiProperty({
    description: 'Optional model identifier within category',
    example: 'office_chair_01',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({
    description: 'Position X coordinate',
    example: 0.0,
    required: false,
  })
  @IsOptional()
  @IsValidPosition()
  positionX?: number;

  @ApiProperty({
    description: 'Position Y coordinate',
    example: 0.0,
    required: false,
  })
  @IsOptional()
  @IsValidPosition()
  positionY?: number;

  @ApiProperty({
    description: 'Position Z coordinate',
    example: 0.0,
    required: false,
  })
  @IsOptional()
  @IsValidPosition()
  positionZ?: number;

  @ApiProperty({
    description: 'Rotation X (pitch) in degrees',
    example: 0.0,
    minimum: -180,
    maximum: 180,
    required: false,
  })
  @IsOptional()
  @IsValidRotation()
  rotationX?: number;

  @ApiProperty({
    description: 'Rotation Y (yaw) in degrees',
    example: 0.0,
    minimum: -180,
    maximum: 180,
    required: false,
  })
  @IsOptional()
  @IsValidRotation()
  rotationY?: number;

  @ApiProperty({
    description: 'Rotation Z (roll) in degrees',
    example: 0.0,
    minimum: -180,
    maximum: 180,
    required: false,
  })
  @IsOptional()
  @IsValidRotation()
  rotationZ?: number;

  @ApiProperty({
    description: 'Scale X factor',
    example: 1.0,
    minimum: 0.01,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsValidScale()
  scaleX?: number;

  @ApiProperty({
    description: 'Scale Y factor',
    example: 1.0,
    minimum: 0.01,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsValidScale()
  scaleY?: number;

  @ApiProperty({
    description: 'Scale Z factor',
    example: 1.0,
    minimum: 0.01,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsValidScale()
  scaleZ?: number;

  @ApiProperty({
    description: 'Material variant identifier',
    example: 'wood_oak',
    required: false,
  })
  @IsOptional()
  @IsString()
  materialVariant?: string;

  @ApiProperty({
    description: 'Whether the item can be selected',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  selectable?: boolean;

  @ApiProperty({
    description: 'Whether the item is locked from editing',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @ApiProperty({
    description: 'Additional metadata as JSON',
    example: { tags: ['furniture'], priority: 1 },
    required: false,
  })
  @IsOptional()
  meta?: any;

  @ApiProperty({
    description: 'Material property overrides as JSON',
    example: { baseColor: '#ff0000', metallic: 0.8 },
    required: false,
  })
  @IsOptional()
  materialOverrides?: any;
}