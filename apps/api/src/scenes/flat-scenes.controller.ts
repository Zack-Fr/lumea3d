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
import { ProjectCategory3DService } from '../assets/project-category-3d.service';
import { ProjectCategory3DQueryDto } from '../assets/dto/project-category-3d.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { CreateSceneItemDto } from './dto/create-scene-item.dto';
import { UpdateSceneItemDto } from './dto/update-scene-item.dto';
import { SceneManifestFrontend, SceneDelta } from './dto/scene-manifest.dto';
import { BatchDeltaDto, BatchDeltaResponseDto } from './dto/delta-operations.dto';
import { CreateSnapshotDto, CreateSnapshotResponseDto, RestoreSnapshotDto, RestoreSnapshotResponseDto, ListSnapshotsResponseDto } from './dto/snapshot.dto';
import { JwtAuthGuard } from '../auth/shared/guards/jwt-auth.guard';
import { ScenesAuthGuard } from '../shared/guards/scenes-auth.guard';
import { ProjectAuthGuard } from '../shared/guards/project-auth.guard';
import { CreateSceneDto } from './dto/create-scene.dto';

interface RequestWithSceneContext extends Request {
  user: any;
  sceneContext: {
    sceneId: string;
    projectId: string;
  };
}

@ApiTags('Flat Scenes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scenes')
export class FlatScenesController {
  constructor(
    private readonly scenesService: ScenesService,
    private readonly projectCategory3DService: ProjectCategory3DService,
  ) {}

  @Post()
  @UseGuards(ProjectAuthGuard)
  @ApiOperation({
    summary: 'Create a new 3D scene',
    description: 'Creates a scene within a project. The projectId must be provided in the request body.',
  })
  @ApiResponse({ status: 201, description: 'Scene created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid scene data or missing projectId' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  create(
    @Body() createSceneDto: CreateSceneDto & { projectId: string },
    @Request() req: any,
  ) {
    const { projectId, ...sceneData } = createSceneDto;
    if (!projectId) {
      throw new BadRequestException('projectId is required in request body');
    }
    return this.scenesService.create(projectId, req.user.id, sceneData as CreateSceneDto);
  }

  @Get(':sceneId')
  @UseGuards(ScenesAuthGuard)
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
    return this.scenesService.findOne(projectId, sceneId, req.user.id);
  }

  @Patch(':sceneId')
  @UseGuards(ScenesAuthGuard)
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
        req.user.id,
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
  @UseGuards(ScenesAuthGuard)
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
    return this.scenesService.remove(projectId, sceneId, req.user.id);
  }

  // Scene Items endpoints

  @Patch(':sceneId/items')
  @UseGuards(ScenesAuthGuard)
  @ApiOperation({ 
    summary: 'Apply batch delta operations to scene items',
    description: 'Flat route - applies multiple delta operations atomically. Requires If-Match header for optimistic locking.',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiHeader({
    name: 'If-Match',
    description: 'Expected scene version for optimistic locking',
    required: true,
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Unique key for idempotent operations',
    required: false,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Delta operations applied successfully',
    type: BatchDeltaResponseDto 
  })
  @ApiResponse({ status: 400, description: 'If-Match header missing or invalid operations' })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 412, description: 'Precondition Failed - version conflict' })
  async applyDeltaOperations(
    @Param('sceneId') sceneId: string,
    @Headers('if-match') ifMatch: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() batchDeltaDto: BatchDeltaDto,
    @Request() req: RequestWithSceneContext,
  ): Promise<BatchDeltaResponseDto> {
    if (!ifMatch) {
      throw new BadRequestException('If-Match header is required for delta operations');
    }
    
    const expectedVersion = parseInt(ifMatch, 10);
    if (isNaN(expectedVersion)) {
      throw new BadRequestException('If-Match header must be a valid version number');
    }

    try {
      return await this.scenesService.applyDelta(
        sceneId,
        req.user.id,
        batchDeltaDto.operations,
        expectedVersion,
        idempotencyKey,
      );
    } catch (error) {
      if (error.message?.includes('version conflict') || error.message?.includes('Version mismatch')) {
        throw new PreconditionFailedException('Scene has been modified by another user');
      }
      throw error;
    }
  }

  @Post(':sceneId/items')
  @UseGuards(ScenesAuthGuard)
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
        req.user.id,
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
  @UseGuards(ScenesAuthGuard)
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
        req.user.id,
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
  @UseGuards(ScenesAuthGuard)
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
      return await this.scenesService.removeItem(projectId, sceneId, itemId, req.user.id);
    } catch (error) {
      if (error.message?.includes('version conflict') || error.message?.includes('Version mismatch')) {
        throw new PreconditionFailedException('Scene has been modified by another user');
      }
      throw error;
    }
  }

  // Scene Manifest endpoints

  @Get(':sceneId/manifest')
  @UseGuards(ScenesAuthGuard)
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
    type: SceneManifestFrontend,
  })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  generateManifest(
    @Param('sceneId') sceneId: string,
    @Request() req: RequestWithSceneContext,
    @Query('categories') categories?: string,
    @Query('includeMetadata') includeMetadata?: boolean,
  ): Promise<SceneManifestFrontend> {
    const { projectId } = req.sceneContext;
    const categoryFilter = categories ? categories.split(',').map(c => c.trim()) : undefined;
    return this.scenesService.generateManifest(
      projectId, 
      sceneId, 
      req.user.id,
      categoryFilter,
      includeMetadata || false,
    );
  }

  @Get(':sceneId/categories')
  @UseGuards(ScenesAuthGuard)
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
    @Query() query?: ProjectCategory3DQueryDto,
  ) {
    // Alias: return the canonical project categories payload for the scene's project
    const { projectId } = req.sceneContext;
    // Reuse the project categories service to ensure identical shape and ordering
    return this.projectCategory3DService.findAll(projectId, req.user.id, query);
  }

  @Get(':sceneId/delta')
  @UseGuards(ScenesAuthGuard)
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
      req.user.id,
    );
  }

  @Get(':sceneId/version')
  @UseGuards(ScenesAuthGuard)
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
      .getVersion(projectId, sceneId, req.user.id)
      .then(version => ({ version }));
  }

  // Scene Snapshots endpoints

  @Post(':sceneId/snapshots')
  @UseGuards(ScenesAuthGuard)
  @ApiOperation({
    summary: 'Create a scene snapshot',
    description: 'Flat route - creates a manual save snapshot with the current scene state',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({ 
    status: 201, 
    description: 'Snapshot created successfully', 
    type: CreateSnapshotResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  createSnapshot(
    @Param('sceneId') sceneId: string,
    @Body() createSnapshotDto: CreateSnapshotDto,
    @Request() req: RequestWithSceneContext,
  ): Promise<CreateSnapshotResponseDto> {
    return this.scenesService.createSnapshot(sceneId, req.user.id, createSnapshotDto);
  }

  @Get(':sceneId/snapshots')
  @UseGuards(ScenesAuthGuard)
  @ApiOperation({
    summary: 'List scene snapshots',
    description: 'Flat route - returns all snapshots for the scene',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Snapshots listed successfully', 
    type: ListSnapshotsResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  listSnapshots(
    @Param('sceneId') sceneId: string,
    @Request() req: RequestWithSceneContext,
  ): Promise<ListSnapshotsResponseDto> {
    return this.scenesService.listSnapshots(sceneId, req.user.id);
  }

  @Post(':sceneId/restore')
  @UseGuards(ScenesAuthGuard)
  @ApiOperation({
    summary: 'Restore scene from snapshot',
    description: 'Flat route - restores the scene to a previous snapshot state',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Scene restored successfully', 
    type: RestoreSnapshotResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Scene or snapshot not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  restoreFromSnapshot(
    @Param('sceneId') sceneId: string,
    @Body() restoreSnapshotDto: RestoreSnapshotDto,
    @Request() req: RequestWithSceneContext,
  ): Promise<RestoreSnapshotResponseDto> {
    return this.scenesService.restoreFromSnapshot(sceneId, req.user.id, restoreSnapshotDto);
  }
}
