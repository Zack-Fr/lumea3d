import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiPropertyOptional({
    description: 'Project name',
    example: 'Updated Project Name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Auto-generated thumbnail URL from canvas screenshot',
    example: 'https://storage.example.com/thumbnails/project-123-auto.jpg',
  })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Custom user-uploaded thumbnail URL',
    example: 'https://storage.example.com/thumbnails/project-123-custom.jpg',
  })
  @IsOptional()
  @IsUrl()
  customThumbnailUrl?: string;
}