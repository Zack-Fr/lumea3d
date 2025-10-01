import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthzService } from '../../shared/services/authz.service';
import { AuthenticatedRealtimeSocket } from '../dto/rt-events';

@Injectable()
export class RtWsGuard implements CanActivate {
  private readonly logger = new Logger(RtWsGuard.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private authzService: AuthzService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket & AuthenticatedRealtimeSocket = context.switchToWs().getClient();

    try {
      // Extract token from handshake query
      const token = client.handshake.query.token as string;
      const sceneId = client.handshake.query.sceneId as string;

      if (!token) {
        this.logger.warn('No token provided in handshake');
        throw new WsException('Token required');
      }

      if (!sceneId) {
        this.logger.warn('No sceneId provided in handshake');
        throw new WsException('Scene ID required');
      }

      // Verify and decode JWT token
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn('Invalid token payload - no user ID');
        throw new WsException('Invalid token');
      }

      // Get scene to find project ID
      const scene = await this.prisma.scene3D.findUnique({
        where: { id: sceneId },
        select: { projectId: true, name: true },
      });

      if (!scene) {
        this.logger.warn(`Scene not found: ${sceneId}`);
        throw new WsException('Scene not found');
      }

      // Check if user has read access to the project
      const hasAccess = await this.authzService.userHasProjectAccess(
        userId,
        scene.projectId,
        'GET', // Read access for realtime events
      );

      if (!hasAccess) {
        this.logger.warn(`User ${userId} lacks access to project for scene ${sceneId}`);
        throw new WsException('Access denied');
      }

      // Get user info for presence
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
      });

      // Attach authenticated data to socket
      client.userId = userId;
      client.sceneId = sceneId;
      client.userName = user?.displayName || 'Unknown User';

      this.logger.log(`User ${userId} authenticated for scene ${sceneId}`);
      return true;

    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`);
      
      // Clean up socket data on failure
      delete client.userId;
      delete client.sceneId;
      delete client.userName;

      if (error instanceof WsException) {
        throw error;
      } else {
        throw new WsException('Authentication failed');
      }
    }
  }
}