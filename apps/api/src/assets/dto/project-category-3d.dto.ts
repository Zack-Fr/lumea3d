import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';
import { IsValidCategoryKey } from '../../shared/decorators/transform-validation.decorator';

export class CreateProjectCategory3DDto {
  @ApiProperty({
    description: 'Asset ID to associate with the project category',
    example: 'clabcd123...',
  })
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @ApiProperty({
    description: 'Category key for organizing assets within the project',
    example: 'office_chairs',
  })
  @IsString()
  @IsValidCategoryKey()
  categoryKey: string;

  @ApiProperty({
    description: 'Enable GPU instancing for this asset category',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  instancing?: boolean;

  @ApiProperty({
    description: 'Enable Draco compression for this asset category',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  draco?: boolean;

  @ApiProperty({
    description: 'Enable MeshOpt compression for this asset category',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  meshopt?: boolean;

  @ApiProperty({
    description: 'Enable KTX2 texture compression for this asset category',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  ktx2?: boolean;
}

export class UpdateProjectCategory3DDto {
  @ApiProperty({
    description: 'Category key for organizing assets within the project',
    example: 'office_chairs',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsValidCategoryKey()
  categoryKey?: string;

  @ApiProperty({
    description: 'Enable GPU instancing for this asset category',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  instancing?: boolean;

  @ApiProperty({
    description: 'Enable Draco compression for this asset category',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  draco?: boolean;

  @ApiProperty({
    description: 'Enable MeshOpt compression for this asset category',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  meshopt?: boolean;

  @ApiProperty({
    description: 'Enable KTX2 texture compression for this asset category',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  ktx2?: boolean;
}

export class ProjectCategory3DQueryDto {
  @ApiProperty({
    description: 'Filter by project ID',
    example: 'clabcd123...',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Filter by category key',
    example: 'office_chairs',
    required: false,
  })
  @IsOptional()
  @IsValidCategoryKey()
  categoryKey?: string;

  @ApiProperty({
    description: 'Filter by instancing enabled',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  instancing?: boolean;
}