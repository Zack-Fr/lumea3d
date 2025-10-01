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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PlacementAdjustmentService } from './placement-adjustment.service';
import { JwtAuthGuard } from '../auth/shared/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/shared/decorators/current-user.decorator';
import { User } from '@prisma/client';
import {
  CreatePlacementAdjustmentDto,
  UpdatePlacementAdjustmentDto,
  PlacementAdjustmentQueryDto,
} from './dto/placement/placement-adjustment.dto';

@ApiTags('Placement Adjustments')
@ApiBearerAuth()
@Controller('placement-adjustments')
@UseGuards(JwtAuthGuard)
export class PlacementAdjustmentController {
  constructor(private readonly placementAdjustmentService: PlacementAdjustmentService) {}

  /**
   * Create a new placement adjustment record
   * POST /placement-adjustments
   */
  @Post()
  @ApiOperation({ summary: 'Record a placement adjustment' })
  @ApiResponse({ status: 201, description: 'Placement adjustment recorded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid adjustment data' })
  @ApiResponse({ status: 404, description: 'Scene or placement not found' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreatePlacementAdjustmentDto,
  ) {
    return this.placementAdjustmentService.create(user.id, dto);
  }

  /**
   * Get adjustments for a specific scene
   * GET /placement-adjustments/scene/:sceneId
   */
  @Get('scene/:sceneId')
  @ApiOperation({ summary: 'Get all placement adjustments for a scene' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiQuery({ name: 'placementId', description: 'Filter by placement ID', required: false })
  @ApiQuery({ name: 'minMovementCm', description: 'Minimum movement distance in cm', required: false, type: Number })
  @ApiQuery({ name: 'limit', description: 'Maximum number of results', required: false, type: Number })
  @ApiQuery({ name: 'offset', description: 'Number of results to skip', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Adjustments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  async findByScene(
    @Param('sceneId') sceneId: string,
    @CurrentUser() user: User,
    @Query() query: PlacementAdjustmentQueryDto,
  ) {
    return this.placementAdjustmentService.findAll(sceneId, user.id, query);
  }

  /**
   * Get adjustments for a specific placement
   * GET /placement-adjustments/placement/:placementId
   */
  @Get('placement/:placementId')
  @ApiOperation({ summary: 'Get all adjustments for a specific placement' })
  @ApiParam({ name: 'placementId', description: 'Placement ID' })
  @ApiQuery({ name: 'minMovementCm', description: 'Minimum movement distance in cm', required: false, type: Number })
  @ApiQuery({ name: 'limit', description: 'Maximum number of results', required: false, type: Number })
  @ApiQuery({ name: 'offset', description: 'Number of results to skip', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Adjustments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Placement not found' })
  async findByPlacement(
    @Param('placementId') placementId: string,
    @CurrentUser() user: User,
    @Query() query: PlacementAdjustmentQueryDto,
  ) {
    return this.placementAdjustmentService.findByPlacement(placementId, user.id, query);
  }

  /**
   * Get a specific placement adjustment
   * GET /placement-adjustments/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific placement adjustment' })
  @ApiParam({ name: 'id', description: 'Adjustment ID' })
  @ApiResponse({ status: 200, description: 'Adjustment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  async findOne(
    @Param('id') adjustmentId: string,
    @CurrentUser() user: User,
  ) {
    return this.placementAdjustmentService.findOne(adjustmentId, user.id);
  }

  /**
   * Update a placement adjustment
   * PUT /placement-adjustments/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a placement adjustment' })
  @ApiParam({ name: 'id', description: 'Adjustment ID' })
  @ApiResponse({ status: 200, description: 'Adjustment updated successfully' })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  async update(
    @Param('id') adjustmentId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdatePlacementAdjustmentDto,
  ) {
    return this.placementAdjustmentService.update(adjustmentId, user.id, dto);
  }

  /**
   * Delete a placement adjustment
   * DELETE /placement-adjustments/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a placement adjustment' })
  @ApiParam({ name: 'id', description: 'Adjustment ID' })
  @ApiResponse({ status: 204, description: 'Adjustment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Adjustment not found' })
  async remove(
    @Param('id') adjustmentId: string,
    @CurrentUser() user: User,
  ) {
    await this.placementAdjustmentService.remove(adjustmentId, user.id);
  }

  /**
   * Get adjustment statistics for a scene
   * GET /placement-adjustments/scene/:sceneId/stats
   */
  @Get('scene/:sceneId/stats')
  @ApiOperation({ summary: 'Get placement adjustment statistics for a scene' })
  @ApiParam({ name: 'sceneId', description: 'Scene ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  async getSceneStats(
    @Param('sceneId') sceneId: string,
    @CurrentUser() user: User,
  ) {
    return this.placementAdjustmentService.getSceneStatistics(sceneId, user.id);
  }

  /**
   * Bulk create placement adjustments
   * POST /placement-adjustments/bulk
   */
  @Post('bulk')
  @ApiOperation({ summary: 'Record multiple placement adjustments' })
  @ApiResponse({ status: 201, description: 'Adjustments recorded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid adjustment data' })
  @ApiResponse({ status: 404, description: 'Some scenes or placements not found' })
  async bulkCreate(
    @CurrentUser() user: User,
    @Body() dto: { adjustments: CreatePlacementAdjustmentDto[] },
  ) {
    const count = await this.placementAdjustmentService.bulkCreate(user.id, dto.adjustments);
    
    return {
      message: `Successfully recorded ${count} placement adjustments`,
      count,
    };
  }
}