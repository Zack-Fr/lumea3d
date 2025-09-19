import { IsString, IsEmail, IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({ description: 'Project ID to invite user to' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Email address of user to invite' })
  @IsEmail()
  toUserEmail: string;

  @ApiPropertyOptional({ description: 'Optional personal message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Hours until invitation expires', default: 24, minimum: 1, maximum: 168 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168) // Max 1 week
  @Transform(({ value }) => parseInt(value))
  expiresInHours?: number = 24;
}

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Invitation token' })
  @IsString()
  token: string;
}

export class InvitationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  fromUserId: string;

  @ApiProperty()
  fromUserName: string;

  @ApiProperty()
  fromUserEmail: string;

  @ApiProperty()
  toUserEmail: string;

  @ApiProperty()
  token: string;

  @ApiPropertyOptional()
  message?: string;

  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'] })
  status: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiPropertyOptional()
  acceptedAt?: Date;

  @ApiPropertyOptional()
  declinedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class InvitationListResponseDto {
  @ApiProperty({ type: [InvitationResponseDto] })
  invitations: InvitationResponseDto[];

  @ApiProperty()
  total: number;
}