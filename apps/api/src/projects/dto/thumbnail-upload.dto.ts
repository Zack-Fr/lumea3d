import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ThumbnailUploadDto {
  @ApiProperty({
    description: 'Base64 encoded image data or screenshot data from canvas',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  })
  @IsString()
  imageData: string;

  @ApiPropertyOptional({
    description: 'Type of thumbnail: auto (from canvas) or custom (user upload)',
    example: 'auto',
    enum: ['auto', 'custom'],
  })
  @IsOptional()
  @IsString()
  type?: 'auto' | 'custom';

  @ApiPropertyOptional({
    description: 'Original filename (for custom uploads)',
    example: 'my-thumbnail.jpg',
  })
  @IsOptional()
  @IsString()
  originalFilename?: string;
}

export class ThumbnailUploadResponseDto {
  @ApiProperty({
    description: 'URL of the uploaded thumbnail',
    example: 'https://storage.example.com/thumbnails/project-123-custom-1634567890.jpg',
  })
  thumbnailUrl: string;

  @ApiProperty({
    description: 'Type of thumbnail that was uploaded',
    example: 'custom',
  })
  type: 'auto' | 'custom';

  @ApiProperty({
    description: 'Timestamp when the thumbnail was created',
    example: '2023-10-18T15:30:00Z',
  })
  createdAt: string;
}