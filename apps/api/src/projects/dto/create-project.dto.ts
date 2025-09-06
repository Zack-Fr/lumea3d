import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectSpawnDto {
  @ApiPropertyOptional({
    description: 'Spawn position [x, y, z] in world coordinates',
    example: [0, 1.7, 5.0],
    type: [Number],
  })
  @IsOptional()
  position?: [number, number, number];

  @ApiPropertyOptional({
    description: 'Spawn yaw rotation in degrees',
    example: 0,
  })
  @IsOptional()
  yaw_deg?: number;
}

export class CreateProjectSceneDto {
  @ApiPropertyOptional({
    description: 'Initial scene name',
    example: 'Main Scene',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Spawn configuration for the initial scene',
    type: CreateProjectSpawnDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProjectSpawnDto)
  spawn?: CreateProjectSpawnDto;

  @ApiPropertyOptional({
    description: 'Navmesh asset ID',
    example: 'clk123456789',
  })
  @IsOptional()
  @IsString()
  navmesh_asset_id?: string;

  @ApiPropertyOptional({
    description: 'Shell asset ID',
    example: 'clk987654321',
  })
  @IsOptional()
  @IsString()
  shell_asset_id?: string;

  @ApiPropertyOptional({
    description: 'Environment exposure setting',
    example: 1.0,
  })
  @IsOptional()
  exposure?: number;
}

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'My Awesome Project',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Initial scene configuration',
    type: CreateProjectSceneDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProjectSceneDto)
  scene?: CreateProjectSceneDto;
}