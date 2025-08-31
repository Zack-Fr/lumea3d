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
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { CreateSceneItemDto } from './dto/create-scene-item.dto';
import { UpdateSceneItemDto } from './dto/update-scene-item.dto';
import { SceneManifestV2, SceneDelta } from './dto/scene-manifest.dto';
import { JwtAuthGuard } from '../auth/shared/guards/jwt-auth.guard';

@ApiTags('Scenes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/scenes')
export class ScenesController {
  constructor(private readonly scenesService: ScenesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new 3D scene' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Scene created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid scene data' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  create(
    @Param('projectId') projectId: string,
    @Body() createSceneDto: CreateSceneDto,
    @Request() req: any,
  ) {
    return this.scenesService.create(projectId, req.user.userId, createSceneDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all scenes in a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Scenes retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findAll(@Param('projectId') projectId: string, @Request() req: any) {
    return this.scenesService.findAll(projectId, req.user.userId);
  }

  @Get(':sceneId')
  @ApiOperation({ summary: 'Get a specific scene with items' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({ status: 200, description: 'Scene retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  findOne(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Request() req: any,
  ) {
    return this.scenesService.findOne(projectId, sceneId, req.user.userId);
  }

  @Patch(':sceneId')
  @ApiOperation({ summary: 'Update scene properties' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiQuery({
    name: 'version',
    description: 'Expected scene version for optimistic locking',
    required: false,
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Scene updated successfully' })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  @ApiResponse({ status: 409, description: 'Version conflict' })
  update(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Body() updateSceneDto: UpdateSceneDto,
    @Request() req: any,
    @Query('version') version?: string,
  ) {
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
  @ApiOperation({ summary: 'Delete a scene and all its items' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({ status: 204, description: 'Scene deleted successfully' })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  remove(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Request() req: any,
  ) {
    return this.scenesService.remove(projectId, sceneId, req.user.userId);
  }

  // Scene Items endpoints

  @Post(':sceneId/items')
  @ApiOperation({ summary: 'Add an item to a scene' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({ status: 201, description: 'Scene item created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid item data' })
  @ApiResponse({ status: 404, description: 'Scene or category not found' })
  addItem(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Body() createSceneItemDto: CreateSceneItemDto,
    @Request() req: any,
  ) {
    return this.scenesService.addItem(
      projectId,
      sceneId,
      req.user.userId,
      createSceneItemDto,
    );
  }

  @Patch(':sceneId/items/:itemId')
  @ApiOperation({ summary: 'Update a scene item' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiParam({ name: 'itemId', description: 'Scene item ID' })
  @ApiResponse({ status: 200, description: 'Scene item updated successfully' })
  @ApiResponse({ status: 404, description: 'Scene item not found' })
  @ApiResponse({ status: 403, description: 'Scene item is locked' })
  updateItem(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Param('itemId') itemId: string,
    @Body() updateSceneItemDto: UpdateSceneItemDto,
    @Request() req: any,
  ) {
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
  @ApiOperation({ summary: 'Remove an item from a scene' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiParam({ name: 'itemId', description: 'Scene item ID' })
  @ApiResponse({ status: 204, description: 'Scene item removed successfully' })
  @ApiResponse({ status: 404, description: 'Scene item not found' })
  @ApiResponse({ status: 403, description: 'Scene item is locked' })
  removeItem(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Param('itemId') itemId: string,
    @Request() req: any,
  ) {
    return this.scenesService.removeItem(projectId, sceneId, itemId, req.user.userId);
  }

  // Scene Manifest endpoints

  @Get(':sceneId/manifest')
  @ApiOperation({
    summary: 'Generate scene manifest for client consumption',
    description: 'Returns a complete scene manifest with all items, transforms, and asset references',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({
    status: 200,
    description: 'Scene manifest generated successfully',
    type: SceneManifestV2,
  })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  generateManifest(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Request() req: any,
  ): Promise<SceneManifestV2> {
    return this.scenesService.generateManifest(projectId, sceneId, req.user.userId);
  }

  @Get(':sceneId/delta')
  @ApiOperation({
    summary: 'Generate delta between scene versions',
    description: 'Returns operations needed to transform scene from one version to another',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiQuery({ name: 'fromVersion', description: 'Source version', type: Number })
  @ApiQuery({ name: 'toVersion', description: 'Target version', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Scene delta generated successfully',
    type: SceneDelta,
  })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  generateDelta(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Query('fromVersion') fromVersion: string,
    @Query('toVersion') toVersion: string,
    @Request() req: any,
  ): Promise<SceneDelta> {
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
    description: 'Returns the current version number for optimistic locking',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({ status: 200, description: 'Scene version retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  getVersion(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @Request() req: any,
  ): Promise<{ version: number }> {
    return this.scenesService
      .getVersion(projectId, sceneId, req.user.userId)
      .then(version => ({ version }));
  }
}