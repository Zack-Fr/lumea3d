import { 
  Controller, 
  Post, 
  Get, 
  Delete,
  Param, 
  Body, 
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/shared/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/shared/decorators/current-user.decorator';
import { Public } from '../auth/shared/decorators/public.decorator';
import { CollaborationService } from './collaboration.service';
import {
  CreateInvitationDto,
  AcceptInvitationDto,
  InvitationResponseDto,
  InvitationListResponseDto
} from './dto/invitation.dto';
import {
  SessionResponseDto,
  SessionListResponseDto,
  LeaveSessionDto
} from './dto/session.dto';

@ApiTags('Collaboration')
@Controller('collaboration')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  // ============================================================================
  // INVITATION ENDPOINTS
  // ============================================================================

  @Post('invitations')
  @ApiOperation({ summary: 'Send a collaboration invitation' })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully', type: InvitationResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data or invitation already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden - No permission to invite users to this project' })
  async createInvitation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInvitationDto
  ): Promise<InvitationResponseDto> {
    return this.collaborationService.createInvitation(userId, dto);
  }

  @Get('invitations/sent')
  @ApiOperation({ summary: 'Get invitations sent by the current user' })
  @ApiResponse({ status: 200, description: 'Sent invitations retrieved successfully', type: InvitationListResponseDto })
  async getSentInvitations(
    @CurrentUser() user: any
  ): Promise<InvitationListResponseDto> {
    const userId = user?.id;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.collaborationService.getSentInvitations(userId);
  }

  @Get('invitations/received')
  @ApiOperation({ summary: 'Get invitations received by the current user' })
  @ApiResponse({ status: 200, description: 'Received invitations retrieved successfully', type: InvitationListResponseDto })
  async getReceivedInvitations(
    @CurrentUser() user: any
  ): Promise<InvitationListResponseDto> {
    console.log('🔍 getReceivedInvitations called with user:', {
      user,
      userKeys: user ? Object.keys(user) : 'user is null',
      extractedEmail: user?.email
    });
    
    const userEmail = user?.email;
    if (!userEmail) {
      throw new BadRequestException(`User email not found in token. Available fields: ${user ? Object.keys(user).join(', ') : 'none'}`);
    }
    return this.collaborationService.getReceivedInvitations(userEmail);
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept a collaboration invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - User account not found' })
  @ApiResponse({ status: 404, description: 'Invalid or expired invitation' })
  async acceptInvitation(
    @CurrentUser('email') userEmail: string,
    @Body() dto: AcceptInvitationDto
  ): Promise<{ sessionId: string; message: string }> {
    const result = await this.collaborationService.acceptInvitation(userEmail, dto);
    return {
      ...result,
      message: 'Invitation accepted successfully. You have been added to the collaboration session.'
    };
  }

  @Post('invitations/:id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Decline a collaboration invitation' })
  @ApiResponse({ status: 204, description: 'Invitation declined successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async declineInvitation(
    @CurrentUser('email') userEmail: string,
    @Param('id') inviteId: string
  ): Promise<void> {
    return this.collaborationService.declineInvitation(userEmail, inviteId);
  }

  @Delete('invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a sent invitation' })
  @ApiResponse({ status: 204, description: 'Invitation revoked successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async revokeInvitation(
    @CurrentUser('id') userId: string,
    @Param('id') inviteId: string
  ): Promise<void> {
    return this.collaborationService.revokeInvitation(userId, inviteId);
  }

  @Get('invitations/validate/:token')
  @Public()
  @ApiOperation({ summary: 'Validate an invitation token (public endpoint)' })
  @ApiResponse({ status: 200, description: 'Invitation validation result' })
  @ApiResponse({ status: 404, description: 'Invalid token' })
  async validateInvitationToken(
    @Param('token') token: string
  ): Promise<{
    id: string;
    projectName: string;
    inviterName: string;
    email: string;
    isValid: boolean;
    isExpired: boolean;
    isAccepted: boolean;
  }> {
    return this.collaborationService.validateInvitationToken(token);
  }

  // ============================================================================
  // SESSION ENDPOINTS
  // ============================================================================

  @Get('sessions/active')
  @ApiOperation({ summary: 'Get active collaboration sessions for the current user' })
  @ApiResponse({ status: 200, description: 'Active sessions retrieved successfully', type: SessionListResponseDto })
  async getActiveSessions(
    @CurrentUser() user: any
  ): Promise<SessionListResponseDto> {
    const userId = user?.id;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.collaborationService.getActiveSessions(userId);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a specific collaboration session' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully', type: SessionResponseDto })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string
  ): Promise<SessionResponseDto> {
    return this.collaborationService.getSession(userId, sessionId);
  }

  @Post('sessions/:id/end')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End a collaboration session (owner only)' })
  @ApiResponse({ status: 204, description: 'Session ended successfully' })
  @ApiResponse({ status: 404, description: 'Session not found or you are not the owner' })
  async endSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string
  ): Promise<void> {
    return this.collaborationService.endSession(userId, sessionId);
  }

  @Post('sessions/:id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave a collaboration session' })
  @ApiResponse({ status: 204, description: 'Left session successfully' })
  @ApiResponse({ status: 404, description: 'You are not an active participant in this session' })
  async leaveSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Body() dto?: LeaveSessionDto
  ): Promise<void> {
    return this.collaborationService.leaveSession(userId, sessionId, dto);
  }
}