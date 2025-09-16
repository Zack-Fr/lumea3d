import { 
  Body, 
  Controller, 
  Get, 
  Param, 
  Post, 
  Put,
  Delete,
  UseGuards, 
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ProjectsService, ProjectWithScenes, ProjectCreationResult } from './projects.service';
import { ThumbnailService } from './thumbnail.service';
import { CreateProjectResponseDto } from './dto/create-project-response.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ThumbnailUploadDto, ThumbnailUploadResponseDto } from './dto/thumbnail-upload.dto';
import { CurrentUser } from '../auth/shared/decorators/current-user.decorator';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly thumbnailService: ThumbnailService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create a new project',
    description: 'Creates a new project with auto-membership (ADMIN role) and optional initial scene configuration'
  })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({ status: 201, description: 'Project created successfully with auto-membership and initial scene', type: CreateProjectResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: any,
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectCreationResult> {
    console.log(`Creating project "${createProjectDto.name}" for user ${user.id}`);
    return this.projectsService.create(user.id, createProjectDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get user projects',
    description: 'Retrieves all projects where the user is a member'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of user projects with scene summary',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          userId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          scenes3D: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                version: { type: 'number' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          _count: {
            type: 'object',
            properties: {
              members: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser() user: any): Promise<ProjectWithScenes[]> {
    return this.projectsService.findUserProjects(user.id);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get project details',
    description: 'Retrieves detailed information about a specific project (only if user is a member)'
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Project details with scenes',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        userId: { type: 'string', format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        scenes3D: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              version: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        _count: {
          type: 'object',
          properties: {
            members: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found or access denied' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ProjectWithScenes> {
    return this.projectsService.findOne(id, user.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update project',
    description: 'Updates project information including name and thumbnails'
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiBody({ type: UpdateProjectDto })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found or access denied' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectWithScenes> {
    return this.projectsService.updateProject(id, user.id, updateProjectDto);
  }

  @Post(':id/thumbnail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upload project thumbnail',
    description: 'Upload a custom thumbnail or save canvas screenshot for a project'
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiBody({ type: ThumbnailUploadDto })
  @ApiResponse({ status: 200, description: 'Thumbnail uploaded successfully', type: ThumbnailUploadResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid image data or project not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadThumbnail(
    @Param('id') projectId: string,
    @CurrentUser() user: any,
    @Body() thumbnailUploadDto: ThumbnailUploadDto,
  ): Promise<ThumbnailUploadResponseDto> {
    try {
      console.log(`Uploading thumbnail for project ${projectId}, user ${user.id}`);
      
      // Verify user has access to the project
      await this.projectsService.findOne(projectId, user.id);
      console.log('Project access verified');

      // Validate image data
      const validation = this.thumbnailService.validateImageData(thumbnailUploadDto.imageData);
      if (!validation.isValid) {
        console.log('Image validation failed:', validation.error);
        throw new BadRequestException(validation.error);
      }
      console.log('Image validation passed');

      // Process and save thumbnail
      const type = thumbnailUploadDto.type || 'custom';
      console.log(`Processing thumbnail with type: ${type}`);
      
      const result = await this.thumbnailService.processThumbnail(
        projectId,
        thumbnailUploadDto.imageData,
        type,
        thumbnailUploadDto.originalFilename,
      );
      console.log('Thumbnail processed successfully:', result.fileName);

      // Update project in database
      await this.thumbnailService.updateProjectThumbnail(projectId, result.url, type);
      console.log('Database updated successfully');

      return {
        thumbnailUrl: result.url,
        type,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Thumbnail upload failed:', error);
      throw error;
    }
  }

  @Delete(':id/thumbnail/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete project thumbnail',
    description: 'Delete auto-generated or custom thumbnail for a project'
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiParam({ name: 'type', description: 'Thumbnail type to delete', enum: ['auto', 'custom', 'all'] })
  @ApiResponse({ status: 204, description: 'Thumbnail deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid thumbnail type or project not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteThumbnail(
    @Param('id') projectId: string,
    @Param('type') type: 'auto' | 'custom' | 'all',
    @CurrentUser() user: any,
  ): Promise<void> {
    // Verify user has access to the project
    await this.projectsService.findOne(projectId, user.id);

    // Validate thumbnail type
    if (!['auto', 'custom', 'all'].includes(type)) {
      throw new BadRequestException('Invalid thumbnail type. Must be: auto, custom, or all');
    }

    await this.thumbnailService.deleteProjectThumbnail(projectId, type);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete project',
    description: 'Permanently delete a project and all its associated data (scenes, thumbnails, etc.)'
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found or access denied' })
  async deleteProject(
    @Param('id') projectId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    // Verify user has access to the project
    await this.projectsService.findOne(projectId, user.id);
    
    // Delete the project (this will cascade to related data)
    await this.projectsService.deleteProject(projectId, user.id);
  }
}
