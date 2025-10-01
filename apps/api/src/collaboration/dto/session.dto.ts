import { IsString, IsOptional, IsUUID, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';

export class CreateSessionDto {
  @ApiProperty({ description: 'Project ID to create session for' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'Optional session name' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class SessionParticipantDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  joinedAt: Date;

  @ApiPropertyOptional()
  leftAt?: Date;

  @ApiProperty()
  isActive: boolean;
}

export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  ownerId: string;

  @ApiProperty()
  ownerName: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty({ enum: SessionStatus })
  status: SessionStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  endedAt?: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [SessionParticipantDto] })
  participants: SessionParticipantDto[];
}

export class SessionListResponseDto {
  @ApiProperty({ type: [SessionResponseDto] })
  sessions: SessionResponseDto[];

  @ApiProperty()
  total: number;
}

export class LeaveSessionDto {
  @ApiPropertyOptional({ description: 'Reason for leaving (optional)' })
  @IsOptional()
  @IsString()
  reason?: string;
}