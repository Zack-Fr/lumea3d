import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger, Injectable, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PresenceService } from './presence.service';
import { RtWsGuard } from './guards/rt-ws.guard';
import {
  RtSrvEvent,
  RtCliEvent,
  AuthenticatedRealtimeSocket,
  DeltaOp,
  ViewportState,
  RealtimeNotification,
  CollaborationInvitation,
  CollaborationSession
} from './dto/rt-events';

@Injectable()
@WebSocketGateway({
  namespace: '/rt',
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.WEB_ORIGIN || false
      : [
          'http://localhost:3000', 
          'http://localhost:5173', 
          'http://localhost:5174',
          'http://192.168.1.10:5173',  // Allow frontend from network IP
          'http://192.168.1.9:5173',   // Allow mobile browser access
          // Allow any IP on local network for development
          /^http:\/\/192\.168\.1\.\d{1,3}:\d{1,5}$/
        ],
    credentials: true,
  },
  maxHttpBufferSize: 32 * 1024, // 32 KB message size limit
})
export class RtGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RtGateway.name);
  
  // Metrics
  private metrics = {
    connectionsTotal: 0,
    disconnectionsTotal: 0,
    messagesIn: new Map<string, number>(),
    messagesOut: new Map<string, number>(),
    droppedMessages: new Map<string, number>(),
    cameraCoalesceTotal: 0,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Realtime WebSocket Gateway initialized on /rt namespace');
    
    // Start cleanup timer for presence service
    setInterval(() => {
      this.presence.cleanup();
    }, 60000); // Clean up every minute
  }

  @UseGuards(RtWsGuard)
  async handleConnection(client: Socket & AuthenticatedRealtimeSocket) {
    try {
      // Defensive: ensure sceneId and userId are present. Some socket.io clients send auth in
      // `handshake.auth` (v4) instead of `handshake.query`. Support both so we don't call
      // prisma with undefined IDs.
      let { userId, sceneId, userName } = client;

      if (!userId || !sceneId) {
        const token = (client.handshake?.query as any)?.token || (client.handshake?.auth as any)?.token;
        const sceneIdFromHandshake = (client.handshake?.query as any)?.sceneId || (client.handshake?.auth as any)?.sceneId;

        if (!token || !sceneIdFromHandshake) {
          this.logger.warn(`Missing token or sceneId in handshake for client ${client.id}`);
          client.disconnect(true);
          return;
        }

        // Verify token and attach authenticated fields to socket
        const payload: any = this.jwtService.verify(token);
        const uid = payload?.sub;
        if (!uid) {
          this.logger.warn(`Invalid token payload for client ${client.id}`);
          client.disconnect(true);
          return;
        }

        // Attach to socket so later code can read them
        client.userId = uid;
        client.sceneId = sceneIdFromHandshake;

        // Try to populate user info for presence
        const user = await this.prisma.user.findUnique({ where: { id: uid }, select: { displayName: true, email: true } });
        client.userName = user?.displayName || 'Unknown User';
        client.userEmail = user?.email;

        userId = uid;
        sceneId = sceneIdFromHandshake;
        userName = client.userName;
      }

      this.logger.log(`Client connected: ${client.id}, user: ${userId}, scene: ${sceneId}`);
      this.metrics.connectionsTotal++;

      // Add to presence
      this.presence.add(sceneId, userId, client.id, userName);

      // Join scene room
      await client.join(`scene:${sceneId}`);

      // Get current scene version
      const scene = await this.prisma.scene3D.findUnique({
        where: { id: sceneId },
        select: { version: true },
      });

      const version = scene?.version || 0;
      this.presence.updateVersion(sceneId, version);

      // Send HELLO message
      const helloEvent: RtSrvEvent = {
        t: 'HELLO',
        sceneId,
        version,
        serverTime: Date.now(),
      };
      client.emit('evt', helloEvent);
      this.incrementMetric('messagesOut', 'HELLO');

      // Broadcast PRESENCE update to all clients in scene
      const presenceEvent: RtSrvEvent = {
        t: 'PRESENCE',
        users: this.presence.list(sceneId),
      };
      this.server.to(`scene:${sceneId}`).emit('evt', presenceEvent);
      this.incrementMetric('messagesOut', 'PRESENCE');

    } catch (error) {
      this.logger.error(`Connection error: ${error?.message || error}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket & AuthenticatedRealtimeSocket) {
    const { sceneId } = client;
    this.logger.log(`Client disconnected: ${client.id}`);
    this.metrics.disconnectionsTotal++;

    if (sceneId) {
      // Remove from presence
      const removedUserId = this.presence.remove(sceneId, client.id);

      if (removedUserId) {
        // Broadcast updated PRESENCE to remaining clients
        const presenceEvent: RtSrvEvent = {
          t: 'PRESENCE',
          users: this.presence.list(sceneId),
        };
        this.server.to(`scene:${sceneId}`).emit('evt', presenceEvent);
        this.incrementMetric('messagesOut', 'PRESENCE');
      }
    }
  }

  @SubscribeMessage('evt')
  async handleEvent(
    @ConnectedSocket() client: Socket & AuthenticatedRealtimeSocket,
    @MessageBody() message: RtCliEvent,
  ): Promise<void> {
    const { userId, sceneId } = client;

    if (!userId || !sceneId) {
      this.logger.warn(`Message from unauthenticated client: ${client.id}`);
      return;
    }

    this.incrementMetric('messagesIn', message.t);

    try {
      switch (message.t) {
        case 'SUB':
          await this.handleSubscribe(client, message);
          break;

        case 'UNSUB':
          await this.handleUnsubscribe(client, message);
          break;

        case 'PING':
          await this.handlePing(client, message);
          break;

        case 'CAMERA':
          await this.handleCamera(client, message);
          break;

        case 'CHAT':
          await this.handleChat(client, message);
          break;

        case 'VIEWPORT_SYNC':
          await this.handleViewportSync(client, message);
          break;

        default:
          this.logger.warn(`Unknown message type from client ${client.id}: ${(message as any).t}`);
      }
    } catch (error) {
      this.logger.error(`Error handling message from ${client.id}: ${error.message}`);
    }
  }

  private async handleSubscribe(
    client: Socket & AuthenticatedRealtimeSocket,
    message: RtCliEvent & { t: 'SUB' },
  ): Promise<void> {
    const { userId } = client;
    const { sceneId } = message;

    // Verify user has access to the new scene
    const scene = await this.prisma.scene3D.findFirst({
      where: {
        id: sceneId,
        project: {
          OR: [
            { userId: userId },
            { members: { some: { userId: userId } } },
          ],
        },
      },
    });

    if (!scene) {
      this.logger.warn(`User ${userId} attempted to subscribe to inaccessible scene ${sceneId}`);
      return;
    }

    // Leave current scene room
    if (client.sceneId) {
      await client.leave(`scene:${client.sceneId}`);
      this.presence.remove(client.sceneId, client.id);
    }

    // Join new scene room
    client.sceneId = sceneId;
    await client.join(`scene:${sceneId}`);
    this.presence.add(sceneId, userId, client.id, client.userName);

    this.logger.log(`User ${userId} subscribed to scene ${sceneId}`);
  }

  private async handleUnsubscribe(
    client: Socket & AuthenticatedRealtimeSocket,
    message: RtCliEvent & { t: 'UNSUB' },
  ): Promise<void> {
    const { sceneId } = message;

    if (client.sceneId === sceneId) {
      await client.leave(`scene:${sceneId}`);
      this.presence.remove(sceneId, client.id);
      client.sceneId = undefined;

      this.logger.log(`User ${client.userId} unsubscribed from scene ${sceneId}`);
    }
  }

  private async handlePing(
    client: Socket & AuthenticatedRealtimeSocket,
    message: RtCliEvent & { t: 'PING' },
  ): Promise<void> {
    // Simple pong response - no rate limiting needed
    client.emit('evt', { t: 'PONG', ts: Date.now(), clientTs: message.ts });
  }

  private async handleCamera(
    client: Socket & AuthenticatedRealtimeSocket,
    message: RtCliEvent & { t: 'CAMERA' },
  ): Promise<void> {
    const { userId, sceneId } = client;

    if (!this.presence.maySend(userId, 'camera')) {
      this.incrementMetric('droppedMessages', 'camera_throttled');
      return;
    }

    // Broadcast camera update to other clients in scene (excluding sender)
    const cameraEvent: RtSrvEvent = {
      t: 'CAMERA',
      from: userId,
      pose: message.pose,
    };

    client.to(`scene:${sceneId}`).emit('evt', cameraEvent);
    this.incrementMetric('messagesOut', 'CAMERA');
    this.metrics.cameraCoalesceTotal++;
  }

  private async handleChat(
    client: Socket & AuthenticatedRealtimeSocket,
    message: RtCliEvent & { t: 'CHAT' },
  ): Promise<void> {
    const { userId, sceneId } = client;

    if (!this.presence.maySend(userId, 'chat')) {
      this.incrementMetric('droppedMessages', 'chat_throttled');
      return;
    }

    // Validate message length
    if (message.msg.length > 1000) {
      this.incrementMetric('droppedMessages', 'chat_too_long');
      return;
    }

    // Broadcast chat message to all clients in scene (including sender)
    const chatEvent: RtSrvEvent = {
      t: 'CHAT',
      from: userId,
      msg: message.msg,
      ts: Date.now(),
    };

    this.server.to(`scene:${sceneId}`).emit('evt', chatEvent);
    this.incrementMetric('messagesOut', 'CHAT');
  }

  private async handleViewportSync(
    client: Socket & AuthenticatedRealtimeSocket,
    message: RtCliEvent & { t: 'VIEWPORT_SYNC' },
  ): Promise<void> {
    const { userId, sceneId } = client;

    if (!this.presence.maySend(userId, 'viewport')) {
      this.incrementMetric('droppedMessages', 'viewport_throttled');
      return;
    }

    // Broadcast viewport sync to other clients in scene (excluding sender)
    const viewportEvent: RtSrvEvent = {
      t: 'VIEWPORT_SYNC',
      from: userId,
      viewport: message.viewport,
    };

    client.to(`scene:${sceneId}`).emit('evt', viewportEvent);
    this.incrementMetric('messagesOut', 'VIEWPORT_SYNC');
  }

  /**
   * Broadcast delta updates to scene (called from external services)
   */
  broadcastDelta(sceneId: string, version: number, ops: DeltaOp[]): void {
    const deltaEvent: RtSrvEvent = {
      t: 'DELTA',
      version,
      ops,
    };

    this.server.to(`scene:${sceneId}`).emit('evt', deltaEvent);
    this.incrementMetric('messagesOut', 'DELTA');
    this.presence.updateVersion(sceneId, version);
  }

  /**
   * Broadcast job status updates
   */
  broadcastJobStatus(
    sceneId: string,
    jobId: string,
    status: 'queued' | 'running' | 'completed' | 'failed',
  ): void {
    const jobStatusEvent: RtSrvEvent = {
      t: 'JOB_STATUS',
      jobId,
      status,
    };

    this.server.to(`scene:${sceneId}`).emit('evt', jobStatusEvent);
    this.incrementMetric('messagesOut', 'JOB_STATUS');
  }

  /**
   * Broadcast collaboration invitation to specific user
   */
  broadcastInvitationReceived(userEmail: string, invitation: CollaborationInvitation): void {
    const inviteEvent: RtSrvEvent = {
      t: 'INVITE_RECEIVED',
      invitation,
    };

    // Broadcast to all sockets of the invited user
    if (this.server && this.server.sockets && this.server.sockets.sockets) {
      this.server.sockets.sockets.forEach((socket) => {
        const authSocket = socket as Socket & AuthenticatedRealtimeSocket;
        if (authSocket.userEmail === userEmail) {
          socket.emit('evt', inviteEvent);
        }
      });
    }
    
    this.incrementMetric('messagesOut', 'INVITE_RECEIVED');
  }

  /**
   * Broadcast invitation response to the sender
   */
  broadcastInvitationResponse(
    inviteId: string, 
    status: 'accepted' | 'declined', 
    userId: string,
    toUserId: string
  ): void {
    const responseEvent: RtSrvEvent = {
      t: 'INVITE_RESPONSE',
      inviteId,
      status,
      userId,
    };

    // Broadcast to all sockets of the invite sender
    if (this.server && this.server.sockets && this.server.sockets.sockets) {
      this.server.sockets.sockets.forEach((socket) => {
        const authSocket = socket as Socket & AuthenticatedRealtimeSocket;
        if (authSocket.userId === toUserId) {
          socket.emit('evt', responseEvent);
        }
      });
    }
    
    this.incrementMetric('messagesOut', 'INVITE_RESPONSE');
  }

  /**
   * Broadcast session started event to all participants
   */
  broadcastSessionStarted(session: CollaborationSession): void {
    const sessionEvent: RtSrvEvent = {
      t: 'SESSION_STARTED',
      session,
    };

    // Broadcast to all participants
    if (this.server && this.server.sockets && this.server.sockets.sockets) {
      session.participants.forEach((participant) => {
        this.server.sockets.sockets.forEach((socket) => {
          const authSocket = socket as Socket & AuthenticatedRealtimeSocket;
          if (authSocket.userId === participant.id) {
            socket.emit('evt', sessionEvent);
          }
        });
      });
    }
    
    this.incrementMetric('messagesOut', 'SESSION_STARTED');
  }

  /**
   * Broadcast session ended event
   */
  broadcastSessionEnded(sessionId: string, participantUserIds: string[], reason?: string): void {
    const sessionEndedEvent: RtSrvEvent = {
      t: 'SESSION_ENDED',
      sessionId,
      reason,
    };

    // Broadcast to all participants
    if (this.server && this.server.sockets && this.server.sockets.sockets) {
      participantUserIds.forEach((userId) => {
        this.server.sockets.sockets.forEach((socket) => {
          const authSocket = socket as Socket & AuthenticatedRealtimeSocket;
          if (authSocket.userId === userId) {
            socket.emit('evt', sessionEndedEvent);
          }
        });
      });
    }
    
    this.incrementMetric('messagesOut', 'SESSION_ENDED');
  }

  /**
   * Broadcast participant joined session
   */
  broadcastParticipantJoined(
    sessionId: string, 
    participant: { id: string; name: string; email: string; joinedAt: string; isActive: boolean },
    participantUserIds: string[]
  ): void {
    const participantEvent: RtSrvEvent = {
      t: 'SESSION_PARTICIPANT_JOINED',
      sessionId,
      participant,
    };

    // Broadcast to all other participants
    if (this.server && this.server.sockets && this.server.sockets.sockets) {
      participantUserIds.forEach((userId) => {
        if (userId !== participant.id) { // Don't send to the participant who just joined
          this.server.sockets.sockets.forEach((socket) => {
            const authSocket = socket as Socket & AuthenticatedRealtimeSocket;
            if (authSocket.userId === userId) {
              socket.emit('evt', participantEvent);
            }
          });
        }
      });
    }
    
    this.incrementMetric('messagesOut', 'SESSION_PARTICIPANT_JOINED');
  }

  /**
   * Broadcast participant left session
   */
  broadcastParticipantLeft(
    sessionId: string, 
    userId: string, 
    participantUserIds: string[],
    reason?: string
  ): void {
    const participantLeftEvent: RtSrvEvent = {
      t: 'SESSION_PARTICIPANT_LEFT',
      sessionId,
      userId,
      reason,
    };

    // Broadcast to all other participants
    if (this.server && this.server.sockets && this.server.sockets.sockets) {
      participantUserIds.forEach((participantUserId) => {
        if (participantUserId !== userId) { // Don't send to the participant who left
          this.server.sockets.sockets.forEach((socket) => {
            const authSocket = socket as Socket & AuthenticatedRealtimeSocket;
            if (authSocket.userId === participantUserId) {
              socket.emit('evt', participantLeftEvent);
            }
          });
        }
      });
    }
    
    this.incrementMetric('messagesOut', 'SESSION_PARTICIPANT_LEFT');
  }

  /**
   * Send notification to specific user
   */
  sendNotificationToUser(userId: string, notification: RealtimeNotification): void {
    const notificationEvent: RtSrvEvent = {
      t: 'NOTIFICATION',
      notification,
    };

    // Send to all sockets of the user
    if (this.server && this.server.sockets && this.server.sockets.sockets) {
      this.server.sockets.sockets.forEach((socket) => {
        const authSocket = socket as Socket & AuthenticatedRealtimeSocket;
        if (authSocket.userId === userId) {
          socket.emit('evt', notificationEvent);
        }
      });
    }
    
    this.incrementMetric('messagesOut', 'NOTIFICATION');
  }

  /**
   * Broadcast notification to all users in a project
   */
  broadcastNotificationToProject(projectId: string, notification: RealtimeNotification): void {
    const notificationEvent: RtSrvEvent = {
      t: 'NOTIFICATION',
      notification,
    };

    // For now, we broadcast to all connected users
    // In a more sophisticated implementation, we'd track project memberships
    this.server.emit('evt', notificationEvent);
    
    this.incrementMetric('messagesOut', 'NOTIFICATION');
  }

  /**
   * Get current metrics for monitoring
   */
  getMetrics(): Record<string, any> {
    const presenceStats = this.presence.getStats();
    
    return {
      connections: {
        total: this.metrics.connectionsTotal,
        current: presenceStats.totalUsers,
        by_scene: presenceStats.sceneStats.reduce((acc, stat) => {
          acc[stat.sceneId] = stat.userCount;
          return acc;
        }, {} as Record<string, number>),
      },
      disconnections_total: this.metrics.disconnectionsTotal,
      messages_in_total: Object.fromEntries(this.metrics.messagesIn),
      messages_out_total: Object.fromEntries(this.metrics.messagesOut),
      dropped_messages_total: Object.fromEntries(this.metrics.droppedMessages),
      camera_coalesce_total: this.metrics.cameraCoalesceTotal,
      presence: presenceStats,
    };
  }

  /**
   * Check if WebSocket namespace is healthy
   */
  isHealthy(): boolean {
    return this.server !== undefined;
  }

  private incrementMetric(metricMap: 'messagesIn' | 'messagesOut' | 'droppedMessages', key: string): void {
    const map = this.metrics[metricMap];
    map.set(key, (map.get(key) || 0) + 1);
  }
}