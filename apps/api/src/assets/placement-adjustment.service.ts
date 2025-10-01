import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlacementAdjustment } from '@prisma/client';
import { 
  CreatePlacementAdjustmentDto, 
  UpdatePlacementAdjustmentDto, 
  PlacementAdjustmentQueryDto 
} from './dto/placement/placement-adjustment.dto';

@Injectable()
export class PlacementAdjustmentService {
  private readonly logger = new Logger(PlacementAdjustmentService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new placement adjustment record
   */
  async create(
    userId: string,
    dto: CreatePlacementAdjustmentDto
  ): Promise<PlacementAdjustment> {
    // Verify scene exists and user has access
    const scene = await this.prisma.scene.findFirst({
      where: {
        id: dto.sceneId,
        project: { userId: userId },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found or access denied');
    }

    // Verify placement exists in the scene
    const placement = await this.prisma.placement.findFirst({
      where: {
        id: dto.placementId,
        sceneId: dto.sceneId,
      },
    });

    if (!placement) {
      throw new NotFoundException('Placement not found in this scene');
    }

    const adjustment = await this.prisma.placementAdjustment.create({
      data: {
        sceneId: dto.sceneId,
        placementId: dto.placementId,
        oldXCm: dto.oldXCm,
        oldYCm: dto.oldYCm,
        newXCm: dto.newXCm,
        newYCm: dto.newYCm,
        oldRotation: dto.oldRotation,
        newRotation: dto.newRotation,
      },
    });

    this.logger.log(`Created placement adjustment ${adjustment.id} for placement ${dto.placementId}`);

    return adjustment;
  }

  /**
   * Get all placement adjustments for a scene
   */
  async findAll(
    sceneId: string,
    userId: string,
    query?: PlacementAdjustmentQueryDto
  ): Promise<PlacementAdjustment[]> {
    // Verify scene access
    const scene = await this.prisma.scene.findFirst({
      where: {
        id: sceneId,
        project: { userId: userId },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found or access denied');
    }

    const where: any = { sceneId: sceneId };

    if (query?.placementId) {
      where.placementId = query.placementId;
    }

    // Filter by minimum movement distance if specified
    if (query?.minMovementCm !== undefined) {
      // Calculate movement distance using SQL
      // This is a simplified version - in production you might want to use raw SQL
      const adjustments = await this.prisma.placementAdjustment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query?.limit ?? 50,
        skip: query?.offset ?? 0,
      });

      // Filter by movement distance in application code
      return adjustments.filter(adj => {
        const deltaX = adj.newXCm - adj.oldXCm;
        const deltaY = adj.newYCm - adj.oldYCm;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        return distance >= query.minMovementCm!;
      });
    }

    return this.prisma.placementAdjustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query?.limit ?? 50,
      skip: query?.offset ?? 0,
    });
  }

  /**
   * Get adjustments for a specific placement
   */
  async findByPlacement(
    placementId: string,
    userId: string,
    query?: PlacementAdjustmentQueryDto
  ): Promise<PlacementAdjustment[]> {
    // Verify placement exists and user has access
    const placement = await this.prisma.placement.findFirst({
      where: {
        id: placementId,
        scene: {
          project: { userId: userId },
        },
      },
      include: {
        scene: {
          select: { id: true },
        },
      },
    });

    if (!placement) {
      throw new NotFoundException('Placement not found or access denied');
    }

    const where: any = { placementId: placementId };

    // Apply minimum movement filter if specified
    if (query?.minMovementCm !== undefined) {
      const adjustments = await this.prisma.placementAdjustment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query?.limit ?? 50,
        skip: query?.offset ?? 0,
      });

      return adjustments.filter(adj => {
        const deltaX = adj.newXCm - adj.oldXCm;
        const deltaY = adj.newYCm - adj.oldYCm;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        return distance >= query.minMovementCm!;
      });
    }

    return this.prisma.placementAdjustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query?.limit ?? 50,
      skip: query?.offset ?? 0,
    });
  }

  /**
   * Get a specific placement adjustment
   */
  async findOne(adjustmentId: string, userId: string): Promise<PlacementAdjustment> {
    const adjustment = await this.prisma.placementAdjustment.findFirst({
      where: {
        id: adjustmentId,
        scene: {
          project: { userId: userId },
        },
      },
    });

    if (!adjustment) {
      throw new NotFoundException('Placement adjustment not found or access denied');
    }

    return adjustment;
  }

  /**
   * Update a placement adjustment
   */
  async update(
    adjustmentId: string,
    userId: string,
    dto: UpdatePlacementAdjustmentDto
  ): Promise<PlacementAdjustment> {
    const existingAdjustment = await this.findOne(adjustmentId, userId);

    const updated = await this.prisma.placementAdjustment.update({
      where: { id: adjustmentId },
      data: {
        oldXCm: dto.oldXCm,
        oldYCm: dto.oldYCm,
        newXCm: dto.newXCm,
        newYCm: dto.newYCm,
        oldRotation: dto.oldRotation,
        newRotation: dto.newRotation,
      },
    });

    this.logger.log(`Updated placement adjustment ${adjustmentId}`);

    return updated;
  }

  /**
   * Delete a placement adjustment
   */
  async remove(adjustmentId: string, userId: string): Promise<void> {
    const adjustment = await this.findOne(adjustmentId, userId);

    await this.prisma.placementAdjustment.delete({
      where: { id: adjustmentId },
    });

    this.logger.log(`Deleted placement adjustment ${adjustmentId}`);
  }

  /**
   * Get adjustment statistics for a scene
   */
  async getSceneStatistics(sceneId: string, userId: string): Promise<{
    totalAdjustments: number;
    uniquePlacementsAdjusted: number;
    averageMovementDistance: number;
    totalMovementDistance: number;
    mostAdjustedPlacement: {
      placementId: string;
      adjustmentCount: number;
    } | null;
  }> {
    // Verify scene access
    const scene = await this.prisma.scene.findFirst({
      where: {
        id: sceneId,
        project: { userId: userId },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found or access denied');
    }

    const adjustments = await this.prisma.placementAdjustment.findMany({
      where: { sceneId: sceneId },
    });

    const totalAdjustments = adjustments.length;
    const uniquePlacementsAdjusted = new Set(adjustments.map(adj => adj.placementId)).size;

    // Calculate movement distances
    const movements = adjustments.map(adj => {
      const deltaX = adj.newXCm - adj.oldXCm;
      const deltaY = adj.newYCm - adj.oldYCm;
      return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    });

    const totalMovementDistance = movements.reduce((sum, distance) => sum + distance, 0);
    const averageMovementDistance = totalAdjustments > 0 ? totalMovementDistance / totalAdjustments : 0;

    // Find most adjusted placement
    const placementCounts = new Map<string, number>();
    adjustments.forEach(adj => {
      placementCounts.set(adj.placementId, (placementCounts.get(adj.placementId) || 0) + 1);
    });

    let mostAdjustedPlacement = null;
    if (placementCounts.size > 0) {
      const [placementId, count] = Array.from(placementCounts.entries())
        .reduce((max, current) => current[1] > max[1] ? current : max);
      
      mostAdjustedPlacement = {
        placementId,
        adjustmentCount: count,
      };
    }

    return {
      totalAdjustments,
      uniquePlacementsAdjusted,
      averageMovementDistance,
      totalMovementDistance,
      mostAdjustedPlacement,
    };
  }

  /**
   * Bulk create placement adjustments (for batch operations)
   */
  async bulkCreate(
    userId: string,
    adjustments: CreatePlacementAdjustmentDto[]
  ): Promise<number> {
    // Verify all scenes exist and user has access
    const sceneIds = [...new Set(adjustments.map(adj => adj.sceneId))];
    const scenes = await this.prisma.scene.findMany({
      where: {
        id: { in: sceneIds },
        project: { userId: userId },
      },
      select: { id: true },
    });

    if (scenes.length !== sceneIds.length) {
      throw new NotFoundException('Some scenes not found or access denied');
    }

    // Verify all placements exist
    const placementIds = [...new Set(adjustments.map(adj => adj.placementId))];
    const placements = await this.prisma.placement.findMany({
      where: {
        id: { in: placementIds },
        sceneId: { in: sceneIds },
      },
      select: { id: true },
    });

    if (placements.length !== placementIds.length) {
      throw new NotFoundException('Some placements not found');
    }

    const result = await this.prisma.placementAdjustment.createMany({
      data: adjustments.map(dto => ({
        sceneId: dto.sceneId,
        placementId: dto.placementId,
        oldXCm: dto.oldXCm,
        oldYCm: dto.oldYCm,
        newXCm: dto.newXCm,
        newYCm: dto.newYCm,
        oldRotation: dto.oldRotation,
        newRotation: dto.newRotation,
      })),
    });

    this.logger.log(`Bulk created ${result.count} placement adjustments`);

    return result.count;
  }
}