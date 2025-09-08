import { 
  Body, 
  Controller, 
  Get, 
  Param, 
  Post, 
  UseGuards, 
  HttpStatus,
  HttpCode,
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
import { CreateProjectResponseDto } from './dto/create-project-response.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CurrentUser } from '../auth/shared/decorators/current-user.decorator';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

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
}