import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
  PreconditionFailedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { ScenesService } from './scenes.service';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { CreateSceneItemDto } from './dto/create-scene-item.dto';
import { UpdateSceneItemDto } from './dto/update-scene-item.dto';
import { SceneManifestV2, SceneDelta } from './dto/scene-manifest.dto';
import { JwtAuthGuard } from '../auth/shared/guards/jwt-auth.guard';
import { ScenesAuthGuard } from '../shared/guards/scenes-auth.guard';

interface RequestWithSceneContext extends Request {
  user: any;
  sceneContext: {
    sceneId: string;
    projectId: string;
  };
}

@ApiTags('Flat Scenes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScenesAuthGuard)
@Controller('scenes')
export class FlatScenesController {
  constructor(private readonly scenesService: ScenesService) {}

  @Get(':sceneId')
  @ApiOperation({ 
    summary: 'Get a specific scene with items',
    description: 'Flat route - no project ID required in path',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({ status: 200, description: 'Scene retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findOne(
    @Param('sceneId') sceneId: string,
    @Request() req: RequestWithSceneContext,
  ) {
    const { projectId } = req.sceneContext;
    return this.scenesService.findOne(projectId, sceneId, req.user.userId);
  }

  @Patch(':sceneId')
  @ApiOperation({ 
    summary: 'Update scene properties',
    description: 'Flat route - no project ID required in path. Requires If-Match header for optimistic locking.',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiHeader({
    name: 'If-Match',
    description: 'Expected scene version for optimistic locking',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Scene updated successfully' })
  @ApiResponse({ status: 400, description: 'If-Match header missing or invalid' })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 412, description: 'Precondition Failed - version conflict' })
  async update(
    @Param('sceneId') sceneId: string,
    @Headers('if-match') ifMatch: string,
    @Body() updateSceneDto: UpdateSceneDto,
    @Request() req: RequestWithSceneContext,
  ) {
    if (!ifMatch) {
      throw new BadRequestException('If-Match header is required for scene updates');
    }
    
    const expectedVersion = parseInt(ifMatch, 10);
    if (isNaN(expectedVersion)) {
      throw new BadRequestException('If-Match header must be a valid version number');
    }

    const { projectId } = req.sceneContext;
    
    try {
      return await this.scenesService.update(
        projectId,
        sceneId,
        req.user.userId,
        updateSceneDto,
        expectedVersion,
      );
    } catch (error) {
      if (error.message?.includes('version conflict') || error.message?.includes('Version mismatch')) {
        throw new PreconditionFailedException('Scene has been modified by another user');
      }
      throw error;
    }
  }

  @Delete(':sceneId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete a scene and all its items',
    description: 'Flat route - no project ID required in path',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({ status: 204, description: 'Scene deleted successfully' })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  remove(
    @Param('sceneId') sceneId: string,
    @Request() req: RequestWithSceneContext,
  ) {
    const { projectId } = req.sceneContext;
    return this.scenesService.remove(projectId, sceneId, req.user.userId);
  }

  // Scene Items endpoints

  @Post(':sceneId/items')
  @ApiOperation({ 
    summary: 'Add an item to a scene',
    description: 'Flat route - no project ID required in path. Requires If-Match header for optimistic locking.',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiHeader({
    name: 'If-Match',
    description: 'Expected scene version for optimistic locking',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'Scene item created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid item data or If-Match header missing' })
  @ApiResponse({ status: 404, description: 'Scene or category not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 412, description: 'Precondition Failed - version conflict' })
  async addItem(
    @Param('sceneId') sceneId: string,
    @Headers('if-match') ifMatch: string,
    @Body() createSceneItemDto: CreateSceneItemDto,
    @Request() req: RequestWithSceneContext,
  ) {
    if (!ifMatch) {
      throw new BadRequestException('If-Match header is required for scene item operations');
    }
    
    const expectedVersion = parseInt(ifMatch, 10);
    if (isNaN(expectedVersion)) {
      throw new BadRequestException('If-Match header must be a valid version number');
    }

    const { projectId } = req.sceneContext;
    
    try {
      return await this.scenesService.addItem(
        projectId,
        sceneId,
        req.user.userId,
        createSceneItemDto,
      );
    } catch (error) {
      if (error.message?.includes('version conflict') || error.message?.includes('Version mismatch')) {
        throw new PreconditionFailedException('Scene has been modified by another user');
      }
      throw error;
    }
  }

  @Patch(':sceneId/items/:itemId')
  @ApiOperation({ 
    summary: 'Update a scene item',
    description: 'Flat route - no project ID required in path. Requires If-Match header for optimistic locking.',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiParam({ name: 'itemId', description: 'Scene item ID' })
  @ApiHeader({
    name: 'If-Match',
    description: 'Expected scene version for optimistic locking',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Scene item updated successfully' })
  @ApiResponse({ status: 400, description: 'If-Match header missing or invalid' })
  @ApiResponse({ status: 404, description: 'Scene item not found' })
  @ApiResponse({ status: 403, description: 'Scene item is locked or insufficient permissions' })
  @ApiResponse({ status: 412, description: 'Precondition Failed - version conflict' })
  async updateItem(
    @Param('sceneId') sceneId: string,
    @Param('itemId') itemId: string,
    @Headers('if-match') ifMatch: string,
    @Body() updateSceneItemDto: UpdateSceneItemDto,
    @Request() req: RequestWithSceneContext,
  ) {
    if (!ifMatch) {
      throw new BadRequestException('If-Match header is required for scene item operations');
    }
    
    const expectedVersion = parseInt(ifMatch, 10);
    if (isNaN(expectedVersion)) {
      throw new BadRequestException('If-Match header must be a valid version number');
    }

    const { projectId } = req.sceneContext;
    
    try {
      return await this.scenesService.updateItem(
        projectId,
        sceneId,
        itemId,
        req.user.userId,
        updateSceneItemDto,
      );
    } catch (error) {
      if (error.message?.includes('version conflict') || error.message?.includes('Version mismatch')) {
        throw new PreconditionFailedException('Scene has been modified by another user');
      }
      throw error;
    }
  }

  @Delete(':sceneId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Remove an item from a scene',
    description: 'Flat route - no project ID required in path. Requires If-Match header for optimistic locking.',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiParam({ name: 'itemId', description: 'Scene item ID' })
  @ApiHeader({
    name: 'If-Match',
    description: 'Expected scene version for optimistic locking',
    required: true,
  })
  @ApiResponse({ status: 204, description: 'Scene item removed successfully' })
  @ApiResponse({ status: 400, description: 'If-Match header missing or invalid' })
  @ApiResponse({ status: 404, description: 'Scene item not found' })
  @ApiResponse({ status: 403, description: 'Scene item is locked or insufficient permissions' })
  @ApiResponse({ status: 412, description: 'Precondition Failed - version conflict' })
  async removeItem(
    @Param('sceneId') sceneId: string,
    @Param('itemId') itemId: string,
    @Headers('if-match') ifMatch: string,
    @Request() req: RequestWithSceneContext,
  ) {
    if (!ifMatch) {
      throw new BadRequestException('If-Match header is required for scene item operations');
    }
    
    const expectedVersion = parseInt(ifMatch, 10);
    if (isNaN(expectedVersion)) {
      throw new BadRequestException('If-Match header must be a valid version number');
    }

    const { projectId } = req.sceneContext;
    
    try {
      return await this.scenesService.removeItem(projectId, sceneId, itemId, req.user.userId);
    } catch (error) {
      if (error.message?.includes('version conflict') || error.message?.includes('Version mismatch')) {
        throw new PreconditionFailedException('Scene has been modified by another user');
      }
      throw error;
    }
  }

  // Scene Manifest endpoints

  @Get(':sceneId/manifest')
  @ApiOperation({
    summary: 'Generate scene manifest for client consumption',
    description: 'Flat route - returns a complete scene manifest with all items, transforms, and asset references. Supports category filtering.',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiQuery({
    name: 'categories',
    description: 'Comma-separated list of category keys to include in manifest. If not provided, all categories are included.',
    required: false,
    type: String,
    example: 'furniture,lighting,decorations',
  })
  @ApiQuery({
    name: 'includeMetadata',
    description: 'Include additional category metadata like descriptions, tags, and configuration',
    required: false,
    type: Boolean,
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Scene manifest generated successfully',
    type: SceneManifestV2,
  })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  generateManifest(
    @Param('sceneId') sceneId: string,
    @Request() req: RequestWithSceneContext,
    @Query('categories') categories?: string,
    @Query('includeMetadata') includeMetadata?: boolean,
  ): Promise<SceneManifestV2> {
    const { projectId } = req.sceneContext;
    const categoryFilter = categories ? categories.split(',').map(c => c.trim()) : undefined;
    return this.scenesService.generateManifest(
      projectId, 
      sceneId, 
      req.user.userId,
      categoryFilter,
      includeMetadata || false,
    );
  }

  @Get(':sceneId/categories')
  @ApiOperation({
    summary: 'Get available categories in scene',
    description: 'Flat route - returns all unique categories used by items in the scene with their metadata',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({
    status: 200,
    description: 'Scene categories retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              categoryKey: { type: 'string' },
              assetId: { type: 'string' },
              itemCount: { type: 'number' },
              capabilities: {
                type: 'object',
                properties: {
                  instancing: { type: 'boolean' },
                  draco: { type: 'boolean' },
                  meshopt: { type: 'boolean' },
                  ktx2: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getSceneCategories(
    @Param('sceneId') sceneId: string,
    @Request() req: RequestWithSceneContext,
  ) {
    const { projectId } = req.sceneContext;
    return this.scenesService.getSceneCategories(projectId, sceneId, req.user.userId);
  }

  @Get(':sceneId/delta')
  @ApiOperation({
    summary: 'Generate delta between scene versions',
    description: 'Flat route - returns operations needed to transform scene from one version to another',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiQuery({ name: 'fromVersion', description: 'Source version', type: Number })
  @ApiQuery({ name: 'toVersion', description: 'Target version', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Scene delta generated successfully',
    type: SceneDelta,
  })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  generateDelta(
    @Param('sceneId') sceneId: string,
    @Query('fromVersion') fromVersion: string,
    @Query('toVersion') toVersion: string,
    @Request() req: RequestWithSceneContext,
  ): Promise<SceneDelta> {
    const { projectId } = req.sceneContext;
    return this.scenesService.generateDelta(
      projectId,
      sceneId,
      parseInt(fromVersion),
      parseInt(toVersion),
      req.user.userId,
    );
  }

  @Get(':sceneId/version')
  @ApiOperation({
    summary: 'Get current scene version',
    description: 'Flat route - returns the current version number for optimistic locking',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({ status: 200, description: 'Scene version retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  getVersion(
    @Param('sceneId') sceneId: string,
    @Request() req: RequestWithSceneContext,
  ): Promise<{ version: number }> {
    const { projectId } = req.sceneContext;
    return this.scenesService
      .getVersion(projectId, sceneId, req.user.userId)
      .then(version => ({ version }));
  }
}