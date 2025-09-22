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
    
    console.log('🔍 WsSceneGuard: Debug info', {
      hasHandshake: !!client.handshake,
      hasQuery: !!client.handshake?.query,
      query: client.handshake?.query,
      clientId: client.id
    });
    
    const { sceneId, token } = client.handshake.query as any;

    if (!sceneId || !token) {
      console.error('🚨 WsSceneGuard: Missing required parameters', { sceneId, token });
      throw new WsException('Missing sceneId or token in handshake query');
    }

    try {
      console.log('🔑 WsSceneGuard: Verifying JWT token...');
      // Verify JWT token (same secret as REST)
      const payload = this.jwt.verify(String(token));
      
      console.log('🔑 WsSceneGuard: Token payload', { sub: payload?.sub, email: payload?.email });
      
      if (!payload?.sub) {
        console.error('🚨 WsSceneGuard: Invalid token payload', payload);
        throw new WsException('Invalid token payload');
      }

      console.log('🎯 WsSceneGuard: Looking up scene', { sceneId: String(sceneId) });
      // Get the scene and its project
      const scene = await this.prisma.scene3D.findUnique({
        where: { id: String(sceneId) },
        select: { projectId: true },
      });

      console.log('🎯 WsSceneGuard: Scene lookup result', { scene, hasScene: !!scene });

      if (!scene) {
        console.error('🚨 WsSceneGuard: Scene not found', { sceneId: String(sceneId) });
        throw new WsException('Scene not found');
      }

      console.log('🔐 WsSceneGuard: Checking project access', { userId: payload.sub, projectId: scene.projectId });
      // Check if user has project access (WebSocket subscribe is read operation)
      const hasAccess = await this.authz.userHasProjectAccess(
        payload.sub,
        scene.projectId,
        'GET', // WebSocket subscribe is treated as read
      );

      console.log('🔐 WsSceneGuard: Access check result', { hasAccess });

      if (!hasAccess) {
        console.error('🚨 WsSceneGuard: Access denied', { userId: payload.sub, projectId: scene.projectId });
        throw new WsException('Insufficient permissions for this scene');
      }

      console.log('✅ WsSceneGuard: Setting client data...');
      // Store scene context for gateway handlers
      client.data = client.data || {};
      client.data.scene = { 
        id: String(sceneId), 
        projectId: scene.projectId 
      };
      client.data.user = { userId: payload.sub };

      console.log('✅ WsSceneGuard: Authentication successful', {
        sceneId: client.data.scene.id,
        projectId: client.data.scene.projectId,
        userId: client.data.user.userId
      });

      return true;
    } catch (error) {
      console.error('🚨 WsSceneGuard: Error occurred', {
        errorMessage: error.message,
        errorStack: error.stack,
        errorType: error.constructor.name,
        sceneId: String(sceneId),
        hasToken: !!token
      });
      
      if (error instanceof WsException) {
        throw error;
      }
      throw new WsException(`Authorization failed: ${error.message}`);
    }
  }
}