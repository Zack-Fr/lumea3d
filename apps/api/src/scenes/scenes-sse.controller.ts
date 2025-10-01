import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  Query,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ScenesService } from './scenes.service';
import { JwtAuthGuard } from '../auth/shared/guards/jwt-auth.guard';

interface SSEClient {
  id: string;
  userId: string;
  projectId: string;
  sceneId: string;
  response: Response;
  lastSeen: number;
}

@ApiTags('Scenes SSE')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/scenes/:sceneId/events')
export class ScenesSSEController {
  private readonly logger = new Logger(ScenesSSEController.name);
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
    summary: 'Connect to scene events via Server-Sent Events (SSE)',
    description: 'Fallback for realtime scene updates when WebSockets are not available',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  async streamSceneEvents(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Query('clientId') clientId: string,
    @Req() req: Request & { user: any },
    @Res() res: Response,
  ) {
    const userId = req.user.id;

    try {
      // Verify access to the scene
      await this.scenesService.findOne(projectId, sceneId, userId);

      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
        'Access-Control-Allow-Credentials': 'true',
      });

      // Generate client ID if not provided
      const id = clientId || `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store client connection
      const client: SSEClient = {
        id,
        userId,
        projectId,
        sceneId,
        response: res,
        lastSeen: Date.now(),
      };

      this.clients.set(id, client);

      // Send initial connection event
      this.sendEvent(client, 'connected', {
        clientId: id,
        sceneId,
        timestamp: Date.now(),
      });

      // Send current scene state
      try {
        const manifest = await this.scenesService.generateManifest(projectId, sceneId, userId);
        const version = await this.scenesService.getVersion(projectId, sceneId, userId);
        
        this.sendEvent(client, 'sceneState', {
          version,
          manifest,
          timestamp: Date.now(),
        });
      } catch (error) {
        this.logger.error(`Error sending initial scene state: ${error.message}`);
        this.sendEvent(client, 'error', {
          type: 'INITIAL_STATE_ERROR',
          message: error.message,
          timestamp: Date.now(),
        });
      }

      // Handle client disconnect
      req.on('close', () => {
        this.logger.log(`SSE client ${id} disconnected`);
        this.clients.delete(id);
      });

      req.on('error', (error) => {
        this.logger.error(`SSE client ${id} error: ${error.message}`);
        this.clients.delete(id);
      });

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        if (this.clients.has(id)) {
          this.sendEvent(client, 'heartbeat', { timestamp: Date.now() });
          client.lastSeen = Date.now();
        } else {
          clearInterval(heartbeat);
        }
      }, 15000); // Every 15 seconds

      this.logger.log(`SSE client ${id} connected to scene ${sceneId}`);

    } catch (error) {
      this.logger.error(`SSE connection error: ${error.message}`);
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

    this.logger.debug(`Broadcasting ${eventType} to ${sceneClients.length} SSE clients in scene ${sceneId}`);

    for (const client of sceneClients) {
      try {
        this.sendEvent(client, eventType, data);
      } catch (error) {
        this.logger.error(`Error sending to SSE client ${client.id}: ${error.message}`);
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

    for (const client of sceneClients) {
      try {
        this.sendEvent(client, 'sceneDelta', {
          delta,
          timestamp: Date.now(),
        });
      } catch (error) {
        this.logger.error(`Error sending delta to SSE client ${client.id}: ${error.message}`);
        this.clients.delete(client.id);
      }
    }
  }

  private sendEvent(client: SSEClient, eventType: string, data: any) {
    const payload = JSON.stringify(data);
    client.response.write(`event: ${eventType}\n`);
    client.response.write(`data: ${payload}\n\n`);
  }

  private cleanupStaleConnections() {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute

    for (const [clientId, client] of this.clients) {
      if (now - client.lastSeen > staleThreshold) {
        this.logger.log(`Cleaning up stale SSE client ${clientId}`);
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