import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectResponseDto {
  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ format: 'uuid' })
  sceneId: string;

  // Keep verbose fields for backwards compatibility in docs
  @ApiProperty({ required: false })
  project?: any;

  @ApiProperty({ required: false })
  scene?: any;

  @ApiProperty({ required: false })
  membership?: any;
}
