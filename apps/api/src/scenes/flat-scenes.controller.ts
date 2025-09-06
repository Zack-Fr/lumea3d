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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
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

@ApiTags('Scenes (Flat Routes)')
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
    description: 'Flat route - no project ID required in path',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiQuery({
    name: 'version',
    description: 'Expected scene version for optimistic locking',
    required: false,
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Scene updated successfully' })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Version conflict' })
  update(
    @Param('sceneId') sceneId: string,
    @Body() updateSceneDto: UpdateSceneDto,
    @Request() req: RequestWithSceneContext,
    @Query('version') version?: string,
  ) {
    const { projectId } = req.sceneContext;
    const expectedVersion = version ? parseInt(version) : undefined;
    return this.scenesService.update(
      projectId,
      sceneId,
      req.user.userId,
      updateSceneDto,
      expectedVersion,
    );
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
    description: 'Flat route - no project ID required in path',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({ status: 201, description: 'Scene item created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid item data' })
  @ApiResponse({ status: 404, description: 'Scene or category not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  addItem(
    @Param('sceneId') sceneId: string,
    @Body() createSceneItemDto: CreateSceneItemDto,
    @Request() req: RequestWithSceneContext,
  ) {
    const { projectId } = req.sceneContext;
    return this.scenesService.addItem(
      projectId,
      sceneId,
      req.user.userId,
      createSceneItemDto,
    );
  }

  @Patch(':sceneId/items/:itemId')
  @ApiOperation({ 
    summary: 'Update a scene item',
    description: 'Flat route - no project ID required in path',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiParam({ name: 'itemId', description: 'Scene item ID' })
  @ApiResponse({ status: 200, description: 'Scene item updated successfully' })
  @ApiResponse({ status: 404, description: 'Scene item not found' })
  @ApiResponse({ status: 403, description: 'Scene item is locked or insufficient permissions' })
  updateItem(
    @Param('sceneId') sceneId: string,
    @Param('itemId') itemId: string,
    @Body() updateSceneItemDto: UpdateSceneItemDto,
    @Request() req: RequestWithSceneContext,
  ) {
    const { projectId } = req.sceneContext;
    return this.scenesService.updateItem(
      projectId,
      sceneId,
      itemId,
      req.user.userId,
      updateSceneItemDto,
    );
  }

  @Delete(':sceneId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Remove an item from a scene',
    description: 'Flat route - no project ID required in path',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiParam({ name: 'itemId', description: 'Scene item ID' })
  @ApiResponse({ status: 204, description: 'Scene item removed successfully' })
  @ApiResponse({ status: 404, description: 'Scene item not found' })
  @ApiResponse({ status: 403, description: 'Scene item is locked or insufficient permissions' })
  removeItem(
    @Param('sceneId') sceneId: string,
    @Param('itemId') itemId: string,
    @Request() req: RequestWithSceneContext,
  ) {
    const { projectId } = req.sceneContext;
    return this.scenesService.removeItem(projectId, sceneId, itemId, req.user.userId);
  }

  // Scene Manifest endpoints

  @Get(':sceneId/manifest')
  @ApiOperation({
    summary: 'Generate scene manifest for client consumption',
    description: 'Flat route - returns a complete scene manifest with all items, transforms, and asset references',
  })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
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
  ): Promise<SceneManifestV2> {
    const { projectId } = req.sceneContext;
    return this.scenesService.generateManifest(projectId, sceneId, req.user.userId);
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