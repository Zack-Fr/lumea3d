import {
  Controller,
  Get,
  Param,
  Req,
  Sse,
  UseGuards,
  Logger,
  MessageEvent,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, Subject, fromEvent } from 'rxjs';
import { map, takeUntil, startWith } from 'rxjs/operators';
import { EventEmitter } from 'events';
import { JwtAuthGuard } from '../auth/shared/guards/jwt-auth.guard';
import { ScenesAuthGuard } from '../shared/guards/scenes-auth.guard';
import { RtSrvEvent } from './dto/rt-events';
import { PresenceService } from './presence.service';
import { PrismaService } from '../../prisma/prisma.service';

// Global event bus for SSE (in production, use Redis pub/sub)
export const sseEventBus = new EventEmitter();

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    name?: string;
  };
}

@Controller('scenes/:sceneId/events')
export class SseController {
  private readonly logger = new Logger(SseController.name);
  
  constructor(
    private readonly presence: PresenceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Sse()
  @UseGuards(JwtAuthGuard, ScenesAuthGuard)
  async events(
    @Param('sceneId') sceneId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Observable<MessageEvent>> {
    const userId = req.user.sub;
    const userName = req.user.name || 'Unknown User';
    
    this.logger.log(`SSE connection opened for user ${userId} on scene ${sceneId}`);

    return new Observable<MessageEvent>(subscriber => {
      // Generate a unique connection ID for this SSE stream
      const connectionId = `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const disconnect$ = new Subject<void>();

      // Add user to presence (SSE connections get synthetic socket IDs)
      this.presence.add(sceneId, userId, connectionId, userName);

      const sendEvent = (event: RtSrvEvent) => {
        subscriber.next({
          data: JSON.stringify(event),
          type: 'message',
        });
      };

      // Set up event listener for this scene
      const sceneEventKey = `scene:${sceneId}`;
      const eventHandler = (event: RtSrvEvent) => {
        sendEvent(event);
      };

      sseEventBus.on(sceneEventKey, eventHandler);

      // Send initial HELLO message
      const sendInitialMessages = async () => {
        try {
          // Get current scene version
          const scene = await this.prisma.scene3D.findUnique({
            where: { id: sceneId },
            select: { version: true },
          });

          const version = scene?.version || 0;
          this.presence.updateVersion(sceneId, version);

          // Send HELLO
          sendEvent({
            t: 'HELLO',
            sceneId,
            version,
            serverTime: Date.now(),
          });

          // Send current PRESENCE
          sendEvent({
            t: 'PRESENCE',
            users: this.presence.list(sceneId),
          });

          // Notify other users about new presence (broadcast to WebSocket clients)
          // SSE clients receive their own presence updates via the bus
          sseEventBus.emit(sceneEventKey, {
            t: 'PRESENCE',
            users: this.presence.list(sceneId),
          });

        } catch (error) {
          this.logger.error(`Error sending initial SSE messages: ${error.message}`);
        }
      };

      sendInitialMessages();

      // Handle client disconnection
      req.on('close', () => {
        this.logger.log(`SSE connection closed for user ${userId} on scene ${sceneId}`);
        
        // Remove from presence
        const removedUserId = this.presence.remove(sceneId, connectionId);
        
        if (removedUserId) {
          // Broadcast updated presence
          sseEventBus.emit(sceneEventKey, {
            t: 'PRESENCE',
            users: this.presence.list(sceneId),
          });
        }

        // Clean up event listener
        sseEventBus.removeListener(sceneEventKey, eventHandler);
        disconnect$.next();
        disconnect$.complete();
      });

      // Handle subscriber cleanup
      return () => {
        this.logger.log(`SSE subscriber cleanup for user ${userId} on scene ${sceneId}`);
        
        // Remove from presence if not already removed
        const removedUserId = this.presence.remove(sceneId, connectionId);
        
        if (removedUserId) {
          // Broadcast updated presence
          sseEventBus.emit(sceneEventKey, {
            t: 'PRESENCE',
            users: this.presence.list(sceneId),
          });
        }

        // Clean up event listener
        sseEventBus.removeListener(sceneEventKey, eventHandler);
        disconnect$.next();
        disconnect$.complete();
      };
    });
  }

  /**
   * Publish event to SSE clients (called from other services)
   */
  static publishToScene(sceneId: string, event: RtSrvEvent): void {
    sseEventBus.emit(`scene:${sceneId}`, event);
  }

  /**
   * Publish event to all SSE clients (global broadcast)
   */
  static publishGlobal(event: RtSrvEvent): void {
    sseEventBus.emit('global', event);
  }
}