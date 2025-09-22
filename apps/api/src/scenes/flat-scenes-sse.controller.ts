import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  Query,
  Logger,
  Headers,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { ScenesService } from './scenes.service';
import { JwtAuthGuard } from '../auth/shared/guards/jwt-auth.guard';
import { ScenesAuthGuard } from '../shared/guards/scenes-auth.guard';

interface SSEClient {
  id: string;
  userId: string;
  projectId: string;
  sceneId: string;
  response: Response;
  lastSeen: number;
  lastEventId?: string;
}

@ApiTags('Scenes SSE (Flat Routes)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScenesAuthGuard)
@Controller('scenes/:sceneId/events')
export class FlatScenesSSEController {
  private readonly logger = new Logger(FlatScenesSSEController.name);
  private readonly clients = new Map<string, SSEClient>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(private readonly scenesService: ScenesService) {
    // Clean up stale connections every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000);
  }

  @Get()
  @ApiOperation({
    summary: 'Connect to scene events via Server-Sent Events (SSE) - Flat Route',
    description: 'Flat route alias for realtime scene updates when WebSockets are not available. Supports Last-Event-ID for reconnection.',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Optional client identifier for reconnection' })
  @ApiHeader({ name: 'Last-Event-ID', required: false, description: 'Last received event ID for resuming connection' })
  async streamSceneEvents(
    @Param('sceneId') sceneId: string,
    @Query('clientId') clientId: string,
    @Headers('last-event-id') lastEventId: string,
    @Req() req: Request & { user: any; sceneContext: any },
    @Res() res: Response,
  ) {
    const userId = req.user.id;
    const projectId = req.sceneContext.projectId; // Set by ScenesAuthGuard

    try {
      // Access check already done by ScenesAuthGuard
      this.logger.log(`SSE connection request for scene ${sceneId} by user ${userId}`);

      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
        'Access-Control-Allow-Credentials': 'true',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      });

      // Generate client ID if not provided
      const clientIdGenerated = clientId || `sse_flat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store client connection
      const client: SSEClient = {
        id: clientIdGenerated,
        userId,
        projectId,
        sceneId,
        response: res,
        lastSeen: Date.now(),
        lastEventId,
      };

      this.clients.set(clientIdGenerated, client);

      // Send initial connection event
      this.sendEvent(client, 'connected', {
        clientId: clientIdGenerated,
        sceneId,
        projectId,
        resuming: !!lastEventId,
        timestamp: Date.now(),
      }, this.generateEventId());

      // Send current scene state (unless resuming from a specific event)
      if (!lastEventId) {
        try {
          const manifest = await this.scenesService.generateManifest(projectId, sceneId, userId);
          const version = await this.scenesService.getVersion(projectId, sceneId, userId);
          
          this.sendEvent(client, 'sceneState', {
            version,
            manifest,
            timestamp: Date.now(),
          }, this.generateEventId());
        } catch (error) {
          this.logger.error(`Error sending initial scene state: ${error.message}`);
          this.sendEvent(client, 'error', {
            type: 'INITIAL_STATE_ERROR',
            message: error.message,
            timestamp: Date.now(),
          }, this.generateEventId());
        }
      } else {
        this.logger.log(`SSE client ${clientIdGenerated} resuming from event ID: ${lastEventId}`);
        // In a full implementation, you might replay missed events here
        this.sendEvent(client, 'resumed', {
          lastEventId,
          timestamp: Date.now(),
        }, this.generateEventId());
      }

      // Handle client disconnect
      req.on('close', () => {
        this.logger.log(`Flat SSE client ${clientIdGenerated} disconnected`);
        this.clients.delete(clientIdGenerated);
      });

      req.on('error', (error) => {
        this.logger.error(`Flat SSE client ${clientIdGenerated} error: ${error.message}`);
        this.clients.delete(clientIdGenerated);
      });

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        if (this.clients.has(clientIdGenerated)) {
          this.sendEvent(client, 'heartbeat', { 
            timestamp: Date.now() 
          }, this.generateEventId());
          client.lastSeen = Date.now();
        } else {
          clearInterval(heartbeat);
        }
      }, 15000); // Every 15 seconds

      this.logger.log(`Flat SSE client ${clientIdGenerated} connected to scene ${sceneId} (project ${projectId})`);

    } catch (error) {
      this.logger.error(`Flat SSE connection error: ${error.message}`);
      res.status(403).json({
        error: 'Access denied',
        message: error.message,
      });
    }
  }

  /**
   * Broadcast scene update to all SSE clients in a scene
   */
  broadcastToScene(sceneId: string, eventType: string, data: any) {
    const sceneClients = Array.from(this.clients.values())
      .filter(client => client.sceneId === sceneId);

    if (sceneClients.length === 0) {
      return;
    }

    this.logger.debug(`Broadcasting ${eventType} to ${sceneClients.length} flat SSE clients in scene ${sceneId}`);

    const eventId = this.generateEventId();
    for (const client of sceneClients) {
      try {
        this.sendEvent(client, eventType, data, eventId);
      } catch (error) {
        this.logger.error(`Error sending to flat SSE client ${client.id}: ${error.message}`);
        this.clients.delete(client.id);
      }
    }
  }

  /**
   * Broadcast scene delta to SSE clients
   */
  broadcastDelta(sceneId: string, delta: any, excludeUsers: string[] = []) {
    const sceneClients = Array.from(this.clients.values())
      .filter(client => 
        client.sceneId === sceneId && 
        !excludeUsers.includes(client.userId)
      );

    const eventId = this.generateEventId();
    for (const client of sceneClients) {
      try {
        this.sendEvent(client, 'sceneDelta', {
          delta,
          timestamp: Date.now(),
        }, eventId);
      } catch (error) {
        this.logger.error(`Error sending delta to flat SSE client ${client.id}: ${error.message}`);
        this.clients.delete(client.id);
      }
    }
  }

  private sendEvent(client: SSEClient, eventType: string, data: any, eventId?: string) {
    const payload = JSON.stringify(data);
    
    if (eventId) {
      client.response.write(`id: ${eventId}\n`);
    }
    client.response.write(`event: ${eventType}\n`);
    client.response.write(`data: ${payload}\n\n`);
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupStaleConnections() {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute

    for (const [clientId, client] of this.clients) {
      if (now - client.lastSeen > staleThreshold) {
        this.logger.log(`Cleaning up stale flat SSE client ${clientId}`);
        try {
          client.response.end();
        } catch (error) {
          // Connection already closed
        }
        this.clients.delete(clientId);
      }
    }
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all open connections
    for (const [clientId, client] of this.clients) {
      try {
        client.response.end();
      } catch (error) {
        // Connection already closed
      }
    }
    this.clients.clear();
  }
}