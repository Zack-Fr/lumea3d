import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteStatus, SessionStatus } from '@prisma/client';
import { RtGateway } from '../realtime/gateway';
import { CollaborationInvitation, CollaborationSession, RealtimeNotification } from '../realtime/dto/rt-events';
import { randomUUID } from 'crypto';
import { 
  CreateInvitationDto,
  AcceptInvitationDto,
  InvitationResponseDto,
  InvitationListResponseDto
} from './dto/invitation.dto';
import {
  CreateSessionDto,
  SessionResponseDto,
  SessionListResponseDto,
  LeaveSessionDto
} from './dto/session.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class CollaborationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RtGateway))
    private readonly rtGateway: RtGateway
  ) {}

  // ============================================================================
  // INVITATION METHODS
  // ============================================================================

  async createInvitation(userId: string, dto: CreateInvitationDto): Promise<InvitationResponseDto> {
    // Verify user has access to the project
    const project = await this.prisma.project.findFirst({
      where: {
        id: dto.projectId,
        OR: [
          { userId: userId },
          { members: { some: { userId: userId, role: { in: ['ADMIN', 'DESIGNER'] } } } }
        ]
      },
      include: {
        user: true
      }
    });

    if (!project) {
      throw new ForbiddenException('You do not have permission to invite users to this project');
    }

    // Check if there's already a pending invitation for this user/project
    const existingInvite = await this.prisma.collabInvite.findFirst({
      where: {
        projectId: dto.projectId,
        toUserEmail: dto.toUserEmail,
        status: InviteStatus.PENDING
      }
    });

    if (existingInvite) {
      throw new BadRequestException('An invitation is already pending for this user on this project');
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex');
    
    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (dto.expiresInHours || 24));

    // Create invitation
    const invite = await this.prisma.collabInvite.create({
      data: {
        projectId: dto.projectId,
        fromUserId: userId,
        toUserEmail: dto.toUserEmail,
        token,
        message: dto.message,
        expiresAt
      },
      include: {
        project: true,
        fromUser: true
      }
    });

    // Broadcast invitation to recipient
    const invitationData: CollaborationInvitation = {
      id: invite.id,
      projectId: invite.projectId,
      projectName: invite.project.name,
      fromUserId: invite.fromUserId,
      fromUserName: invite.fromUser.displayName || 'Unknown User',
      fromUserEmail: invite.fromUser.email,
      toUserEmail: invite.toUserEmail,
      token: invite.token,
      message: invite.message,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString()
    };
    
    this.rtGateway.broadcastInvitationReceived(dto.toUserEmail, invitationData);
    
    // Send notification to sender
    const senderNotification: RealtimeNotification = {
      id: randomUUID(),
      type: 'success',
      title: 'Invitation Sent',
      message: `Collaboration invitation sent to ${dto.toUserEmail}`,
      data: { invitationId: invite.id },
      timestamp: Date.now()
    };
    
    this.rtGateway.sendNotificationToUser(userId, senderNotification);

    return this.mapInvitationToDto(invite);
  }

  async getSentInvitations(userId: string): Promise<InvitationListResponseDto> {
    const invitations = await this.prisma.collabInvite.findMany({
      where: { fromUserId: userId },
      include: {
        project: true,
        fromUser: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      invitations: invitations.map(inv => this.mapInvitationToDto(inv)),
      total: invitations.length
    };
  }

  async getReceivedInvitations(userEmail: string): Promise<InvitationListResponseDto> {
    const invitations = await this.prisma.collabInvite.findMany({
      where: { toUserEmail: userEmail },
      include: {
        project: true,
        fromUser: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      invitations: invitations.map(inv => this.mapInvitationToDto(inv)),
      total: invitations.length
    };
  }

  async acceptInvitation(userEmail: string, dto: AcceptInvitationDto): Promise<{ sessionId: string }> {
    // Find the invitation
    const invite = await this.prisma.collabInvite.findFirst({
      where: {
        token: dto.token,
        toUserEmail: userEmail,
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() }
      },
      include: {
        project: true,
        fromUser: true
      }
    });

    if (!invite) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    // Find or create user account
    let user = await this.prisma.user.findUnique({ where: { email: userEmail } });
    
    if (!user) {
      throw new BadRequestException('User account not found. Please sign up first.');
    }

    // Check if user is already a member of the project
    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: invite.projectId
        }
      }
    });

    // Start transaction to accept invite and create/join session
    const result = await this.prisma.$transaction(async (tx) => {
      // Mark invitation as accepted
      await tx.collabInvite.update({
        where: { id: invite.id },
        data: {
          status: InviteStatus.ACCEPTED,
          acceptedAt: new Date()
        }
      });

      // Add user as project member if not already a member
      if (!existingMember) {
        await tx.projectMember.create({
          data: {
            userId: user.id,
            projectId: invite.projectId,
            role: 'CLIENT' // Default role for invited users
          }
        });
      }

      // Find or create active collaboration session
      let session = await tx.collabSession.findFirst({
        where: {
          projectId: invite.projectId,
          status: SessionStatus.ACTIVE
        }
      });

      if (!session) {
        // Create new session
        session = await tx.collabSession.create({
          data: {
            projectId: invite.projectId,
            ownerId: invite.fromUserId,
            name: `${invite.project.name} - Collaboration Session`
          }
        });
      }

      // Add user as participant if not already participating
      const existingParticipant = await tx.collabParticipant.findUnique({
        where: {
          sessionId_userId: {
            sessionId: session.id,
            userId: user.id
          }
        }
      });

      if (!existingParticipant) {
        await tx.collabParticipant.create({
          data: {
            sessionId: session.id,
            userId: user.id
          }
        });
      } else if (!existingParticipant.isActive) {
        // Reactivate participant
        await tx.collabParticipant.update({
          where: { id: existingParticipant.id },
          data: {
            isActive: true,
            leftAt: null
          }
        });
      }

      return { sessionId: session.id };
    });

    // Broadcast invitation acceptance to sender
    this.rtGateway.broadcastInvitationResponse(
      invite.id,
      'accepted',
      user.id,
      invite.fromUserId
    );
    
    // Send notification to sender
    const senderNotification: RealtimeNotification = {
      id: randomUUID(),
      type: 'success',
      title: 'Invitation Accepted',
      message: `${user.displayName || userEmail} accepted your collaboration invitation`,
      data: { sessionId: result.sessionId },
      timestamp: Date.now()
    };
    
    this.rtGateway.sendNotificationToUser(invite.fromUserId, senderNotification);
    
    // Get full session data and broadcast session started event
    const fullSession = await this.prisma.collabSession.findUnique({
      where: { id: result.sessionId },
      include: {
        project: true,
        owner: true,
        participants: {
          where: { isActive: true },
          include: { user: true }
        }
      }
    });
    
    if (fullSession) {
      const sessionData: CollaborationSession = {
        id: fullSession.id,
        projectId: fullSession.projectId,
        projectName: fullSession.project.name,
        ownerId: fullSession.ownerId,
        ownerName: fullSession.owner.displayName || 'Unknown User',
        name: fullSession.name,
        status: fullSession.status,
        createdAt: fullSession.createdAt.toISOString(),
        participants: fullSession.participants.map(p => ({
          id: p.user.id,
          name: p.user.displayName || 'Unknown User',
          email: p.user.email,
          joinedAt: p.joinedAt.toISOString(),
          isActive: p.isActive
        }))
      };
      
      this.rtGateway.broadcastSessionStarted(sessionData);
    }

    return result;
  }

  async declineInvitation(userEmail: string, inviteId: string): Promise<void> {
    const invite = await this.prisma.collabInvite.findFirst({
      where: {
        id: inviteId,
        toUserEmail: userEmail,
        status: InviteStatus.PENDING
      }
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.collabInvite.update({
      where: { id: inviteId },
      data: {
        status: InviteStatus.DECLINED,
        declinedAt: new Date()
      }
    });
  }

  async revokeInvitation(userId: string, inviteId: string): Promise<void> {
    const invite = await this.prisma.collabInvite.findFirst({
      where: {
        id: inviteId,
        fromUserId: userId,
        status: InviteStatus.PENDING
      }
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.collabInvite.delete({
      where: { id: inviteId }
    });
  }

  // ============================================================================
  // SESSION METHODS
  // ============================================================================

  async getActiveSessions(userId: string): Promise<SessionListResponseDto> {
    const sessions = await this.prisma.collabSession.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { participants: { some: { userId: userId, isActive: true } } }
        ],
        status: SessionStatus.ACTIVE
      },
      include: {
        project: true,
        owner: true,
        participants: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      sessions: sessions.map(session => this.mapSessionToDto(session)),
      total: sessions.length
    };
  }

  async getSession(userId: string, sessionId: string): Promise<SessionResponseDto> {
    const session = await this.prisma.collabSession.findFirst({
      where: {
        id: sessionId,
        OR: [
          { ownerId: userId },
          { participants: { some: { userId: userId } } }
        ]
      },
      include: {
        project: true,
        owner: true,
        participants: {
          include: {
            user: true
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.mapSessionToDto(session);
  }

  async endSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.collabSession.findFirst({
      where: {
        id: sessionId,
        ownerId: userId,
        status: SessionStatus.ACTIVE
      },
      include: {
        participants: {
          where: { isActive: true },
          include: { user: true }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('Session not found or you are not the owner');
    }

    const participantUserIds = session.participants.map(p => p.userId);

    await this.prisma.$transaction(async (tx) => {
      // End the session
      await tx.collabSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.ENDED,
          endedAt: new Date()
        }
      });

      // Mark all participants as left
      await tx.collabParticipant.updateMany({
        where: {
          sessionId: sessionId,
          isActive: true
        },
        data: {
          isActive: false,
          leftAt: new Date()
        }
      });
    });
    
    // Broadcast session ended event
    this.rtGateway.broadcastSessionEnded(sessionId, participantUserIds, 'Session ended by owner');
    
    // Send notifications to all participants
    participantUserIds.forEach(participantUserId => {
      const notification: RealtimeNotification = {
        id: randomUUID(),
        type: 'info',
        title: 'Session Ended',
        message: 'The collaboration session has been ended by the owner',
        data: { sessionId },
        timestamp: Date.now()
      };
      
      this.rtGateway.sendNotificationToUser(participantUserId, notification);
    });
  }

  async leaveSession(userId: string, sessionId: string, dto?: LeaveSessionDto): Promise<void> {
    const participant = await this.prisma.collabParticipant.findFirst({
      where: {
        sessionId: sessionId,
        userId: userId,
        isActive: true
      }
    });

    if (!participant) {
      throw new NotFoundException('You are not an active participant in this session');
    }

    await this.prisma.collabParticipant.update({
      where: { id: participant.id },
      data: {
        isActive: false,
        leftAt: new Date()
      }
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async expireOldInvitations(): Promise<void> {
    await this.prisma.collabInvite.updateMany({
      where: {
        status: InviteStatus.PENDING,
        expiresAt: { lt: new Date() }
      },
      data: {
        status: InviteStatus.EXPIRED
      }
    });
  }

  private mapInvitationToDto(invite: any): InvitationResponseDto {
    return {
      id: invite.id,
      projectId: invite.projectId,
      projectName: invite.project.name,
      fromUserId: invite.fromUserId,
      fromUserName: invite.fromUser.displayName || 'Unknown User',
      fromUserEmail: invite.fromUser.email,
      toUserEmail: invite.toUserEmail,
      token: invite.token,
      message: invite.message,
      status: invite.status,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      declinedAt: invite.declinedAt,
      createdAt: invite.createdAt,
      updatedAt: invite.updatedAt
    };
  }

  private mapSessionToDto(session: any): SessionResponseDto {
    return {
      id: session.id,
      projectId: session.projectId,
      projectName: session.project.name,
      ownerId: session.ownerId,
      ownerName: session.owner.displayName || 'Unknown User',
      name: session.name,
      status: session.status,
      createdAt: session.createdAt,
      endedAt: session.endedAt,
      updatedAt: session.updatedAt,
      participants: session.participants.map(p => ({
        id: p.user.id,
        name: p.user.displayName || 'Unknown User',
        email: p.user.email,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        isActive: p.isActive
      }))
    };
  }

  async validateInvitationToken(token: string): Promise<{
    id: string;
    projectName: string;
    inviterName: string;
    email: string;
    isValid: boolean;
    isExpired: boolean;
    isAccepted: boolean;
  }> {
    const invite = await this.prisma.collabInvite.findFirst({
      where: { token },
      include: {
        project: true,
        fromUser: true
      }
    });

    if (!invite) {
      throw new NotFoundException('Invalid invitation token');
    }

    const now = new Date();
    const isExpired = invite.expiresAt < now;
    const isAccepted = invite.status === InviteStatus.ACCEPTED;
    const isValid = invite.status === InviteStatus.PENDING && !isExpired;

    return {
      id: invite.id,
      projectName: invite.project.name,
      inviterName: invite.fromUser.displayName || 'Unknown User',
      email: invite.toUserEmail,
      isValid,
      isExpired,
      isAccepted
    };
  }
}
