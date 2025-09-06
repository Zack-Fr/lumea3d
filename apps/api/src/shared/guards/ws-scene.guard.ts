import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthzService } from '../services/authz.service';

@Injectable()
export class WsSceneGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private authz: AuthzService,
    private jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const client: Socket = ctx.switchToWs().getClient();
    const { sceneId, token } = client.handshake.query as any;

    if (!sceneId || !token) {
      throw new WsException('Missing sceneId or token in handshake query');
    }

    try {
      // Verify JWT token (same secret as REST)
      const payload = this.jwt.verify(String(token));
      
      if (!payload?.sub) {
        throw new WsException('Invalid token payload');
      }

      // Get the scene and its project
      const scene = await this.prisma.scene3D.findUnique({
        where: { id: String(sceneId) },
        select: { projectId: true },
      });

      if (!scene) {
        throw new WsException('Scene not found');
      }

      // Check if user has project access (WebSocket subscribe is read operation)
      const hasAccess = await this.authz.userHasProjectAccess(
        payload.sub,
        scene.projectId,
        'GET', // WebSocket subscribe is treated as read
      );

      if (!hasAccess) {
        throw new WsException('Insufficient permissions for this scene');
      }

      // Store scene context for gateway handlers
      client.data = client.data || {};
      client.data.scene = { 
        id: String(sceneId), 
        projectId: scene.projectId 
      };
      client.data.user = { userId: payload.sub };

      return true;
    } catch (error) {
      if (error instanceof WsException) {
        throw error;
      }
      throw new WsException('Authorization failed');
    }
  }
}