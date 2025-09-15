import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, ValidateNested, IsIn, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class TransformDto {
  @ApiProperty({ description: 'Position [x, y, z]', type: [Number] })
  @IsArray()
  @IsOptional()
  position?: [number, number, number];

  @ApiProperty({ description: 'Rotation euler [x, y, z] in degrees', type: [Number] })
  @IsArray()
  @IsOptional()
  rotation_euler?: [number, number, number];

  @ApiProperty({ description: 'Scale [sx, sy, sz]', type: [Number] })
  @IsArray()
  @IsOptional()
  scale?: [number, number, number];
}

export class UpdateItemDeltaOp {
  @ApiProperty({ enum: ['update_item'] })
  @IsIn(['update_item'])
  op: 'update_item';

  @ApiProperty({ description: 'Scene item ID to update' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Transform to apply', type: TransformDto })
  @ValidateNested()
  @Type(() => TransformDto)
  @IsOptional()
  transform?: TransformDto;
}

export class AddItemDeltaOp {
  @ApiProperty({ enum: ['add_item'] })
  @IsIn(['add_item'])
  op: 'add_item';

  @ApiProperty({ description: 'Asset ID for the new item' })
  @IsString()
  assetId: string;

  @ApiProperty({ description: 'Transform for the new item', type: TransformDto })
  @ValidateNested()
  @Type(() => TransformDto)
  transform: TransformDto;

  @ApiProperty({ description: 'Category key for the new item', required: false })
  @IsString()
  @IsOptional()
  categoryKey?: string;

  @ApiProperty({ description: 'Model variant for the new item', required: false })
  @IsString()
  @IsOptional()
  model?: string;
}

export class RemoveItemDeltaOp {
  @ApiProperty({ enum: ['remove_item'] })
  @IsIn(['remove_item'])
  op: 'remove_item';

  @ApiProperty({ description: 'Scene item ID to remove' })
  @IsString()
  id: string;
}

export class UpdatePropsDeltaOp {
  @ApiProperty({ enum: ['update_props'] })
  @IsIn(['update_props'])
  op: 'update_props';

  // Additional properties for shell settings, etc.
  shell?: {
    shadows?: {
      cast?: boolean;
      receive?: boolean;
    };
  };
  
  // Allow additional dynamic properties
  [key: string]: any;
}

export class UpdateMaterialDeltaOp {
  @ApiProperty({ enum: ['update_material'] })
  @IsIn(['update_material'])
  op: 'update_material';

  @ApiProperty({ description: 'Scene item ID to update material for' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Material overrides to apply' })
  @IsObject()
  materialOverrides: Record<string, any>;
}

export type DeltaOp = UpdateItemDeltaOp | AddItemDeltaOp | RemoveItemDeltaOp | UpdatePropsDeltaOp | UpdateMaterialDeltaOp;

export class BatchDeltaDto {
  @ApiProperty({ 
    description: 'Array of delta operations to apply',
    type: 'array'
  })
  @IsArray()
  operations: any[];
}

export class BatchDeltaResponseDto {
  @ApiProperty({ description: 'New scene version after applying operations' })
  version: number;

  @ApiProperty({ description: 'ETag for the new version' })
  etag: string;
}