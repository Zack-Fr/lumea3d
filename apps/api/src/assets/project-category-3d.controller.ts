import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ProjectCategory3DService } from './project-category-3d.service';
import { JwtAuthGuard } from '../auth/shared/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/shared/decorators/current-user.decorator';
import { User } from '@prisma/client';
import {
  CreateProjectCategory3DDto,
  UpdateProjectCategory3DDto,
  ProjectCategory3DQueryDto,
} from './dto/project-category-3d.dto';

@ApiTags('Project Categories 3D')
@ApiBearerAuth()
@Controller('projects/:projectId/categories')
@UseGuards(JwtAuthGuard)
export class ProjectCategory3DController {
  constructor(private readonly projectCategory3DService: ProjectCategory3DService) {}

  /**
   * Create a new project category association
   * POST /projects/:projectId/categories
   */
  @Post()
  @ApiOperation({ summary: 'Add an asset category to a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Category added to project successfully' })
  @ApiResponse({ status: 400, description: 'Invalid category data or asset not ready' })
  @ApiResponse({ status: 404, description: 'Project or asset not found' })
  @ApiResponse({ status: 409, description: 'Category already exists in project' })
  async create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateProjectCategory3DDto,
  ) {
    return this.projectCategory3DService.create(projectId, user.id, dto);
  }

  /**
   * Get all categories in a project
   * GET /projects/:projectId/categories
   */
  @Get()
  @ApiOperation({ summary: 'Get all asset categories in a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findAll(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Query() query: ProjectCategory3DQueryDto,
  ) {
    return this.projectCategory3DService.findAll(projectId, user.id, query);
  }

  /**
   * Get a specific category in a project
   * GET /projects/:projectId/categories/:categoryKey
   */
  @Get(':categoryKey')
  @ApiOperation({ summary: 'Get a specific category in a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'categoryKey', description: 'Category key' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('categoryKey') categoryKey: string,
    @CurrentUser() user: User,
  ) {
    return this.projectCategory3DService.findOne(projectId, categoryKey, user.id);
  }

  /**
   * Update category configuration
   * PUT /projects/:projectId/categories/:categoryKey
   */
  @Put(':categoryKey')
  @ApiOperation({ summary: 'Update category configuration' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'categoryKey', description: 'Category key' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async update(
    @Param('projectId') projectId: string,
    @Param('categoryKey') categoryKey: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateProjectCategory3DDto,
  ) {
    return this.projectCategory3DService.update(projectId, categoryKey, user.id, dto);
  }

  /**
   * Remove a category from a project
   * DELETE /projects/:projectId/categories/:categoryKey
   */
  @Delete(':categoryKey')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a category from a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'categoryKey', description: 'Category key' })
  @ApiResponse({ status: 204, description: 'Category removed successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category is in use by scene items' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('categoryKey') categoryKey: string,
    @CurrentUser() user: User,
  ) {
    await this.projectCategory3DService.remove(projectId, categoryKey, user.id);
  }

  /**
   * Get category usage statistics
   * GET /projects/:projectId/categories/:categoryKey/stats
   */
  @Get(':categoryKey/stats')
  @ApiOperation({ summary: 'Get usage statistics for a category' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'categoryKey', description: 'Category key' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getStats(
    @Param('projectId') projectId: string,
    @Param('categoryKey') categoryKey: string,
    @CurrentUser() user: User,
  ) {
    return this.projectCategory3DService.getCategoryStats(projectId, categoryKey, user.id);
  }

  /**
   * Bulk add categories to a project
   * POST /projects/:projectId/categories/bulk
   */
  @Post('bulk')
  @ApiOperation({ summary: 'Add multiple categories to a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Categories added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid category data' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async bulkCreate(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Body() dto: { categories: CreateProjectCategory3DDto[] },
  ) {
    return this.projectCategory3DService.bulkCreate(projectId, user.id, dto.categories);
  }

  /**
   * Get available assets for adding to project
   * GET /projects/:projectId/categories/available-assets
   */
  @Get('available-assets')
  @ApiOperation({ summary: 'Get assets available for adding to project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Available assets retrieved successfully' })
  async getAvailableAssets(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Query() query: { mimeType?: string; search?: string },
  ) {
    return this.projectCategory3DService.getAvailableAssets(projectId, user.id, query);
  }
}