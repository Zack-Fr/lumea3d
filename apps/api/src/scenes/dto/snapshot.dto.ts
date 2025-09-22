import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateSnapshotDto {
  @ApiProperty({ 
    description: 'Label for the snapshot (e.g., "Manual Save")',
    example: 'Manual Save' 
  })
  @IsString()
  label: string;
}

export class CreateSnapshotResponseDto {
  @ApiProperty({ description: 'ID of the created snapshot' })
  snapshotId: string;

  @ApiProperty({ description: 'Label of the created snapshot' })
  label: string;

  @ApiProperty({ description: 'Timestamp when snapshot was created' })
  createdAt: string;
}

export class RestoreSnapshotDto {
  @ApiProperty({ description: 'ID of the snapshot to restore' })
  @IsString()
  snapshotId: string;
}

export class RestoreSnapshotResponseDto {
  @ApiProperty({ description: 'New scene version after restoration' })
  version: number;

  @ApiProperty({ description: 'ETag for the new version' })
  etag: string;

  @ApiProperty({ description: 'Label of the restored snapshot' })
  restoredLabel: string;
}

export class ListSnapshotsResponseDto {
  @ApiProperty({ 
    description: 'List of available snapshots',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  snapshots: Array<{
    id: string;
    label: string;
    createdAt: string;
  }>;
}