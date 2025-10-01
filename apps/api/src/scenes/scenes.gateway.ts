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
import { ScenesService } from '../scenes/scenes.service';
import { WsJwtGuard } from '../auth/shared/guards/ws-jwt.guard';
import { SceneDelta } from '../scenes/dto/scene-manifest.dto';

interface AuthenticatedSocket extends Socket {
  userId: string;
  projectId?: string;
  sceneId?: string;
}

interface SceneOperation {
  type: 'add' | 'update' | 'remove';
  target: 'scene' | 'item';
  id?: string;
  data?: any;
  userId: string;
  timestamp: number;
}

interface PendingUpdate {
  sceneId: string;
  operations: SceneOperation[];
  lastUpdate: number;
}

@WebSocketGateway({
  namespace: '/scenes',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://192.168.1.10:5173',
    credentials: true,
  },
})
export class ScenesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ScenesGateway.name);
  private readonly updateInterval = 16; // 16ms for ~60fps
  private readonly pendingUpdates = new Map<string, PendingUpdate>();
  private updateTimer: NodeJS.Timeout;

  constructor(private readonly scenesService: ScenesService) {}

  afterInit(server: Server) {
    this.logger.log('Scenes WebSocket Gateway initialized');
    
    // Start the coalesced update timer
    this.updateTimer = setInterval(() => {
      this.flushPendingUpdates();
    }, this.updateInterval);
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      this.logger.log(`Client connected: ${client.id}`);
      
      // Authentication will be handled by WsJwtGuard when joining rooms
      client.emit('connected', { 
        message: 'Connected to scenes namespace',
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Clean up any pending updates for this client
    if (client.sceneId) {
      const pending = this.pendingUpdates.get(client.sceneId);
      if (pending) {
        pending.operations = pending.operations.filter(op => op.userId !== client.userId);
        if (pending.operations.length === 0) {
          this.pendingUpdates.delete(client.sceneId);
        }
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinScene')
  async handleJoinScene(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { projectId: string; sceneId: string },
  ) {
    try {
      const { projectId, sceneId } = payload;
      
      // Verify access to the scene
      await this.scenesService.findOne(projectId, sceneId, client.userId);
      
      // Leave previous scene room if any
      if (client.sceneId) {
        client.leave(`scene:${client.sceneId}`);
      }
      
      // Join new scene room
      client.projectId = projectId;
      client.sceneId = sceneId;
      client.join(`scene:${sceneId}`);
      
      // Get current scene version and send initial state
      const scene = await this.scenesService.findOne(projectId, sceneId, client.userId);
      const manifest = await this.scenesService.generateManifest(projectId, sceneId, client.userId);
      
      client.emit('sceneJoined', {
        sceneId,
        version: scene.version,
        manifest,
        timestamp: Date.now(),
      });
      
      // Notify others in the room
      client.to(`scene:${sceneId}`).emit('userJoined', {
        userId: client.userId,
        sceneId,
        timestamp: Date.now(),
      });
      
      this.logger.log(`Client ${client.id} joined scene ${sceneId}`);
    } catch (error) {
      this.logger.error(`Join scene error: ${error.message}`);
      client.emit('error', {
        type: 'JOIN_SCENE_ERROR',
        message: error.message,
        timestamp: Date.now(),
      });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveScene')
  async handleLeaveScene(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.sceneId) {
      const sceneId = client.sceneId;
      
      client.leave(`scene:${sceneId}`);
      client.to(`scene:${sceneId}`).emit('userLeft', {
        userId: client.userId,
        sceneId,
        timestamp: Date.now(),
      });
      
      client.projectId = undefined;
      client.sceneId = undefined;
      
      this.logger.log(`Client ${client.id} left scene ${sceneId}`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sceneOperation')
  async handleSceneOperation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() operation: Omit<SceneOperation, 'userId' | 'timestamp'>,
  ) {
    if (!client.sceneId) {
      client.emit('error', {
        type: 'NOT_IN_SCENE',
        message: 'Must join a scene first',
        timestamp: Date.now(),
      });
      return;
    }

    try {
      const sceneOperation: SceneOperation = {
        ...operation,
        userId: client.userId,
        timestamp: Date.now(),
      };

      // Add to pending updates for coalescing
      this.addPendingUpdate(client.sceneId, sceneOperation);
      
      // For immediate feedback, echo back to sender
      client.emit('operationReceived', {
        operation: sceneOperation,
        timestamp: Date.now(),
      });
      
    } catch (error) {
      this.logger.error(`Scene operation error: ${error.message}`);
      client.emit('error', {
        type: 'OPERATION_ERROR',
        message: error.message,
        timestamp: Date.now(),
      });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('requestSync')
  async handleRequestSync(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { version: number },
  ) {
    if (!client.sceneId || !client.projectId) {
      client.emit('error', {
        type: 'NOT_IN_SCENE',
        message: 'Must join a scene first',
        timestamp: Date.now(),
      });
      return;
    }

    try {
      const currentVersion = await this.scenesService.getVersion(
        client.projectId,
        client.sceneId,
        client.userId,
      );
      
      if (payload.version < currentVersion) {
        // Client is behind, send full manifest
        const manifest = await this.scenesService.generateManifest(
          client.projectId,
          client.sceneId,
          client.userId,
        );
        
        client.emit('syncResponse', {
          type: 'full',
          version: currentVersion,
          manifest,
          timestamp: Date.now(),
        });
      } else {
        // Client is up to date
        client.emit('syncResponse', {
          type: 'upToDate',
          version: currentVersion,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.logger.error(`Sync error: ${error.message}`);
      client.emit('error', {
        type: 'SYNC_ERROR',
        message: error.message,
        timestamp: Date.now(),
      });
    }
  }

  private addPendingUpdate(sceneId: string, operation: SceneOperation) {
    const existing = this.pendingUpdates.get(sceneId);
    
    if (existing) {
      existing.operations.push(operation);
      existing.lastUpdate = Date.now();
    } else {
      this.pendingUpdates.set(sceneId, {
        sceneId,
        operations: [operation],
        lastUpdate: Date.now(),
      });
    }
  }

  private async flushPendingUpdates() {
    const now = Date.now();
    const updates = Array.from(this.pendingUpdates.values());
    
    for (const update of updates) {
      // Only flush if there are operations and enough time has passed
      if (update.operations.length === 0) continue;
      
      try {
        // Broadcast delta to all clients in the scene except the originators
        const delta: SceneDelta = {
          fromVersion: 0, // Will be set by receiving clients
          toVersion: 0,   // Will be updated after applying operations
          operations: update.operations.map(op => ({
            type: op.type,
            target: op.target,
            id: op.id,
            data: op.data,
          })),
          timestamp: new Date().toISOString(),
        };

        // Get unique user IDs to exclude from broadcast
        const excludeUsers = [...new Set(update.operations.map(op => op.userId))];
        
        // Broadcast to all clients in the scene room except originators
        this.server.to(`scene:${update.sceneId}`).emit('sceneDelta', {
          delta,
          excludeUsers,
          timestamp: now,
        });
        
        this.logger.debug(`Flushed ${update.operations.length} operations for scene ${update.sceneId}`);
        
        // Clear processed operations
        update.operations = [];
        
      } catch (error) {
        this.logger.error(`Error flushing updates for scene ${update.sceneId}: ${error.message}`);
      }
    }
    
    // Clean up empty update entries
    for (const [sceneId, update] of this.pendingUpdates) {
      if (update.operations.length === 0 && now - update.lastUpdate > 5000) {
        this.pendingUpdates.delete(sceneId);
      }
    }
  }

  // Method to manually trigger scene updates from the service layer
  async notifySceneUpdate(sceneId: string, operation: SceneOperation) {
    this.addPendingUpdate(sceneId, operation);
  }

  onModuleDestroy() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
  }
}