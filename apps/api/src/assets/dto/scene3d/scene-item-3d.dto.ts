import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsObject, IsNotEmpty, Min, IsInt } from 'class-validator';
import { 
  IsValidPosition, 
  IsValidRotation, 
  IsValidScale, 
  IsValidCategoryKey 
} from '../../../shared/decorators/transform-validation.decorator';

export class CreateSceneItem3DDto {
  @ApiProperty({
    description: 'Category key referencing project assets',
    example: 'office_chairs',
  })
  @IsString()
  @IsValidCategoryKey()
  categoryKey: string;

  @ApiProperty({
    description: 'Optional model identifier within category',
    example: 'executive_chair_leather',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({
    description: 'Position X coordinate in meters',
    example: 2.5,
    required: false,
    default: 0.0,
  })
  @IsOptional()
  @IsValidPosition()
  positionX?: number;

  @ApiProperty({
    description: 'Position Y coordinate in meters',
    example: 0.0,
    required: false,
    default: 0.0,
  })
  @IsOptional()
  @IsValidPosition()
  positionY?: number;

  @ApiProperty({
    description: 'Position Z coordinate in meters',
    example: -1.2,
    required: false,
    default: 0.0,
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
    default: 0.0,
  })
  @IsOptional()
  @IsValidRotation()
  rotationX?: number;

  @ApiProperty({
    description: 'Rotation Y (yaw) in degrees',
    example: 90.0,
    minimum: -180,
    maximum: 180,
    required: false,
    default: 0.0,
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
    default: 0.0,
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
    default: 1.0,
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
    default: 1.0,
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
    default: 1.0,
  })
  @IsOptional()
  @IsValidScale()
  scaleZ?: number;

  @ApiProperty({
    description: 'Material variant identifier',
    example: 'leather_brown',
    required: false,
  })
  @IsOptional()
  @IsString()
  materialVariant?: string;

  @ApiProperty({
    description: 'Material property overrides as JSON',
    example: { baseColor: '#8B4513', metallic: 0.1, roughness: 0.8 },
    required: false,
  })
  @IsOptional()
  @IsObject()
  materialOverrides?: Record<string, any>;

  @ApiProperty({
    description: 'Whether the item can be selected in the scene',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  selectable?: boolean;

  @ApiProperty({
    description: 'Whether the item is locked from editing',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @ApiProperty({
    description: 'Additional metadata as JSON',
    example: { tags: ['furniture', 'seating'], priority: 1, layer: 'foreground' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}

export class UpdateSceneItem3DDto {
  @ApiProperty({
    description: 'Category key referencing project assets',
    example: 'office_desks',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsValidCategoryKey()
  categoryKey?: string;

  @ApiProperty({
    description: 'Optional model identifier within category',
    example: 'standing_desk_bamboo',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({
    description: 'Position X coordinate in meters',
    example: 1.5,
    required: false,
  })
  @IsOptional()
  @IsValidPosition()
  positionX?: number;

  @ApiProperty({
    description: 'Position Y coordinate in meters',
    example: 0.0,
    required: false,
  })
  @IsOptional()
  @IsValidPosition()
  positionY?: number;

  @ApiProperty({
    description: 'Position Z coordinate in meters',
    example: -2.0,
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
    example: 180.0,
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
    example: 1.2,
    minimum: 0.01,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsValidScale()
  scaleX?: number;

  @ApiProperty({
    description: 'Scale Y factor',
    example: 1.2,
    minimum: 0.01,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsValidScale()
  scaleY?: number;

  @ApiProperty({
    description: 'Scale Z factor',
    example: 1.2,
    minimum: 0.01,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsValidScale()
  scaleZ?: number;

  @ApiProperty({
    description: 'Material variant identifier',
    example: 'wood_bamboo',
    required: false,
  })
  @IsOptional()
  @IsString()
  materialVariant?: string;

  @ApiProperty({
    description: 'Material property overrides as JSON',
    example: { baseColor: '#D2B48C', metallic: 0.0, roughness: 0.6 },
    required: false,
  })
  @IsOptional()
  @IsObject()
  materialOverrides?: Record<string, any>;

  @ApiProperty({
    description: 'Whether the item can be selected in the scene',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  selectable?: boolean;

  @ApiProperty({
    description: 'Whether the item is locked from editing',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @ApiProperty({
    description: 'Additional metadata as JSON',
    example: { tags: ['furniture', 'workspace'], priority: 2, layer: 'background' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}

export class SceneItem3DQueryDto {
  @ApiProperty({
    description: 'Filter by scene ID',
    example: 'clabcd123...',
    required: false,
  })
  @IsOptional()
  @IsString()
  sceneId?: string;

  @ApiProperty({
    description: 'Filter by category key',
    example: 'office_chairs',
    required: false,
  })
  @IsOptional()
  @IsValidCategoryKey()
  categoryKey?: string;

  @ApiProperty({
    description: 'Filter by model identifier',
    example: 'executive_chair',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({
    description: 'Filter by selectable status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  selectable?: boolean;

  @ApiProperty({
    description: 'Filter by locked status',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: 50,
    minimum: 1,
    maximum: 1000,
    required: false,
    default: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
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