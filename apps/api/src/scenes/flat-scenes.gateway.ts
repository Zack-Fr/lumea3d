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
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ScenesService } from './scenes.service';
import { WsSceneGuard } from '../shared/guards/ws-scene.guard';

interface FlatSceneSocket extends Socket {
  data: {
    scene: { 
      id: string; 
      projectId: string; 
    };
    user: { 
      userId: string; 
    };
  };
}

@WebSocketGateway({
  namespace: '/scenes',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://192.168.1.10:5173',
    credentials: true,
  },
})
// @UseGuards(WsSceneGuard) // TEMPORARILY DISABLED - causing infinite loop
export class FlatScenesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FlatScenesGateway.name);

  constructor(private readonly scenesService: ScenesService) {}

  afterInit(server: Server) {
    this.logger.log('Flat Scenes WebSocket Gateway initialized');
  }

  async handleConnection(client: FlatSceneSocket, ...args: any[]) {
    try {
      this.logger.log(`FlatScenesGateway: Client ${client.id} connected`);
      
      // For now, just acknowledge the connection without authentication
      // We'll add authentication back step by step
      client.emit('connected', {
        message: 'Connected to scenes WebSocket',
        clientId: client.id,
        timestamp: Date.now(),
      });
      
      this.logger.log(`Client ${client.id} connection acknowledged`);
      
    } catch (error) {
      this.logger.error('Error handling connection:', error);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: FlatSceneSocket) {
    try {
      const { scene, user } = client.data || {};
      
      if (scene && user) {
        this.logger.log(`Client ${client.id} disconnected from scene ${scene.id}`);
        
        // Notify other clients in the room about disconnection
        const roomName = `scene:${scene.id}`;
        client.to(roomName).emit('scene:user_left', {
          userId: user.userId,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.logger.error('Error handling disconnect:', error);
    }
  }

  @SubscribeMessage('subscribe')
  async onSubscribe(
    @ConnectedSocket() client: FlatSceneSocket,
    @MessageBody() data: { events?: string[] },
  ) {
    try {
      const { scene } = client.data;
      const roomName = `scene:${scene.id}`;
      
      // Client is already in the room from connection, just acknowledge
      client.emit('subscribed', {
        sceneId: scene.id,
        events: data.events || ['all'],
        room: roomName,
        timestamp: Date.now(),
      });
      
      this.logger.log(`Client ${client.id} subscribed to scene ${scene.id} events`);
    } catch (error) {
      this.logger.error('Error handling subscribe:', error);
      client.emit('error', { message: 'Failed to subscribe to events' });
    }
  }

  @SubscribeMessage('scene:ping')
  onPing(@ConnectedSocket() client: FlatSceneSocket) {
    client.emit('scene:pong', { timestamp: Date.now() });
  }

  // Method to emit scene updates to all clients in a scene room
  async emitSceneUpdate(sceneId: string, event: string, data: any) {
    const roomName = `scene:${sceneId}`;
    this.server.to(roomName).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
    
    this.logger.debug(`Emitted ${event} to room ${roomName}`);
  }

  // Method to emit asset status updates
  async emitAssetStatus(sceneId: string, assetId: string, status: string, data?: any) {
    const roomName = `scene:${sceneId}`;
    this.server.to(roomName).emit('asset:status', {
      assetId,
      status,
      data,
      timestamp: Date.now(),
    });
  }

  // Method to emit scene deltas for real-time collaboration
  async emitSceneDelta(sceneId: string, delta: any) {
    const roomName = `scene:${sceneId}`;
    this.server.to(roomName).emit('scene:delta', {
      delta,
      timestamp: Date.now(),
    });
  }
}