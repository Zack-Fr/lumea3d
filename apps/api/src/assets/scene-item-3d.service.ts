import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SceneItem3D } from '@prisma/client';
import { 
  CreateSceneItem3DDto, 
  UpdateSceneItem3DDto, 
  SceneItem3DQueryDto 
} from './dto/scene3d/scene-item-3d.dto';

@Injectable()
export class SceneItem3DService {
  private readonly logger = new Logger(SceneItem3DService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new scene item
   */
  async create(
    projectId: string,
    sceneId: string,
    userId: string,
    dto: CreateSceneItem3DDto
  ): Promise<SceneItem3D> {
    // Verify scene exists and user has access
    const scene = await this.prisma.scene3D.findFirst({
      where: {
        id: sceneId,
        project: { id: projectId, userId: userId },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found or access denied');
    }

    // Verify category exists in project
    const category = await this.prisma.projectCategory3D.findFirst({
      where: {
        projectId: projectId,
        categoryKey: dto.categoryKey,
      },
      include: {
        asset: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!category || !category.asset || category.asset.status !== 'READY') {
      throw new NotFoundException('Category not found or asset not ready');
    }

    const item = await this.prisma.sceneItem3D.create({
      data: {
        sceneId: sceneId,
        categoryKey: dto.categoryKey,
        model: dto.model,
        positionX: dto.positionX ?? 0.0,
        positionY: dto.positionY ?? 0.0,
        positionZ: dto.positionZ ?? 0.0,
        rotationX: dto.rotationX ?? 0.0,
        rotationY: dto.rotationY ?? 0.0,
        rotationZ: dto.rotationZ ?? 0.0,
        scaleX: dto.scaleX ?? 1.0,
        scaleY: dto.scaleY ?? 1.0,
        scaleZ: dto.scaleZ ?? 1.0,
        materialVariant: dto.materialVariant,
        materialOverrides: dto.materialOverrides,
        selectable: dto.selectable ?? true,
        locked: dto.locked ?? false,
        meta: dto.meta,
      },
    });

    this.logger.log(`Created scene item ${item.id} (${dto.categoryKey}) in scene ${sceneId}`);

    return item;
  }

  /**
   * Get all items for a scene
   */
  async findAll(
    projectId: string,
    sceneId: string,
    userId: string,
    query?: SceneItem3DQueryDto
  ): Promise<SceneItem3D[]> {
    // Verify scene access
    const scene = await this.prisma.scene3D.findFirst({
      where: {
        id: sceneId,
        project: { id: projectId, userId: userId },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found or access denied');
    }

    const where: any = { sceneId: sceneId };

    if (query?.categoryKey) {
      where.categoryKey = query.categoryKey;
    }

    if (query?.model) {
      where.model = { contains: query.model, mode: 'insensitive' };
    }

    if (query?.selectable !== undefined) {
      where.selectable = query.selectable;
    }

    if (query?.locked !== undefined) {
      where.locked = query.locked;
    }

    return this.prisma.sceneItem3D.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: query?.limit ?? 100,
      skip: query?.offset ?? 0,
    });
  }

  /**
   * Get a specific scene item
   */
  async findOne(
    projectId: string,
    sceneId: string,
    itemId: string,
    userId: string
  ): Promise<SceneItem3D> {
    const item = await this.prisma.sceneItem3D.findFirst({
      where: {
        id: itemId,
        sceneId: sceneId,
        scene: {
          project: { id: projectId, userId: userId },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Scene item not found or access denied');
    }

    return item;
  }

  /**
   * Update a scene item
   */
  async update(
    projectId: string,
    sceneId: string,
    itemId: string,
    userId: string,
    dto: UpdateSceneItem3DDto
  ): Promise<SceneItem3D> {
    const existingItem = await this.findOne(projectId, sceneId, itemId, userId);

    // If changing category, verify new category exists
    if (dto.categoryKey && dto.categoryKey !== existingItem.categoryKey) {
      const category = await this.prisma.projectCategory3D.findFirst({
        where: {
          projectId: projectId,
          categoryKey: dto.categoryKey,
        },
        include: {
          asset: {
            select: {
              status: true,
            },
          },
        },
      });

      if (!category || !category.asset || category.asset.status !== 'READY') {
        throw new NotFoundException('New category not found or asset not ready');
      }
    }

    const updated = await this.prisma.sceneItem3D.update({
      where: { id: itemId },
      data: {
        categoryKey: dto.categoryKey,
        model: dto.model,
        positionX: dto.positionX,
        positionY: dto.positionY,
        positionZ: dto.positionZ,
        rotationX: dto.rotationX,
        rotationY: dto.rotationY,
        rotationZ: dto.rotationZ,
        scaleX: dto.scaleX,
        scaleY: dto.scaleY,
        scaleZ: dto.scaleZ,
        materialVariant: dto.materialVariant,
        materialOverrides: dto.materialOverrides,
        selectable: dto.selectable,
        locked: dto.locked,
        meta: dto.meta,
      },
    });

    this.logger.log(`Updated scene item ${itemId} in scene ${sceneId}`);

    return updated;
  }

  /**
   * Delete a scene item
   */
  async remove(
    projectId: string,
    sceneId: string,
    itemId: string,
    userId: string
  ): Promise<void> {
    const item = await this.findOne(projectId, sceneId, itemId, userId);

    await this.prisma.sceneItem3D.delete({
      where: { id: itemId },
    });

    this.logger.log(`Deleted scene item ${itemId} from scene ${sceneId}`);
  }

  /**
   * Bulk delete scene items
   */
  async bulkRemove(
    projectId: string,
    sceneId: string,
    itemIds: string[],
    userId: string
  ): Promise<number> {
    // Verify scene access
    const scene = await this.prisma.scene3D.findFirst({
      where: {
        id: sceneId,
        project: { id: projectId, userId: userId },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found or access denied');
    }

    const result = await this.prisma.sceneItem3D.deleteMany({
      where: {
        id: { in: itemIds },
        sceneId: sceneId,
      },
    });

    this.logger.log(`Bulk deleted ${result.count} scene items from scene ${sceneId}`);

    return result.count;
  }

  /**
   * Duplicate scene items
   */
  async duplicate(
    projectId: string,
    sceneId: string,
    itemIds: string[],
    userId: string,
    offset?: { x?: number; y?: number; z?: number }
  ): Promise<SceneItem3D[]> {
    // Verify scene access
    const scene = await this.prisma.scene3D.findFirst({
      where: {
        id: sceneId,
        project: { id: projectId, userId: userId },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found or access denied');
    }

    // Get original items
    const originalItems = await this.prisma.sceneItem3D.findMany({
      where: {
        id: { in: itemIds },
        sceneId: sceneId,
      },
    });

    if (originalItems.length !== itemIds.length) {
      throw new NotFoundException('Some scene items not found');
    }

    // Create duplicates
    const duplicatesData = originalItems.map(item => ({
      sceneId: sceneId,
      categoryKey: item.categoryKey,
      model: item.model,
      positionX: item.positionX + (offset?.x ?? 1.0),
      positionY: item.positionY + (offset?.y ?? 0.0),
      positionZ: item.positionZ + (offset?.z ?? 0.0),
      rotationX: item.rotationX,
      rotationY: item.rotationY,
      rotationZ: item.rotationZ,
      scaleX: item.scaleX,
      scaleY: item.scaleY,
      scaleZ: item.scaleZ,
      materialVariant: item.materialVariant,
      materialOverrides: item.materialOverrides,
      selectable: item.selectable,
      locked: false, // Unlock duplicates by default
      meta: item.meta,
    }));

    // We need to create them one by one to get their IDs
    const duplicates: SceneItem3D[] = [];
    for (const data of duplicatesData) {
      const duplicate = await this.prisma.sceneItem3D.create({ data });
      duplicates.push(duplicate);
    }

    this.logger.log(`Duplicated ${duplicates.length} scene items in scene ${sceneId}`);

    return duplicates;
  }

  /**
   * Bulk update positions for multiple items
   */
  async bulkUpdatePositions(
    projectId: string,
    sceneId: string,
    userId: string,
    updates: Array<{
      itemId: string;
      positionX?: number;
      positionY?: number;
      positionZ?: number;
      rotationX?: number;
      rotationY?: number;
      rotationZ?: number;
    }>
  ): Promise<number> {
    // Verify scene access
    const scene = await this.prisma.scene3D.findFirst({
      where: {
        id: sceneId,
        project: { id: projectId, userId: userId },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found or access denied');
    }

    let updateCount = 0;

    // Update items individually (Prisma doesn't support bulk updates with different values per record)
    for (const update of updates) {
      try {
        await this.prisma.sceneItem3D.updateMany({
          where: {
            id: update.itemId,
            sceneId: sceneId,
          },
          data: {
            positionX: update.positionX,
            positionY: update.positionY,
            positionZ: update.positionZ,
            rotationX: update.rotationX,
            rotationY: update.rotationY,
            rotationZ: update.rotationZ,
          },
        });
        updateCount++;
      } catch (error) {
        this.logger.warn(`Failed to update item ${update.itemId}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk updated positions for ${updateCount} items in scene ${sceneId}`);

    return updateCount;
  }

  /**
   * Get items by category
   */
  async findByCategory(
    projectId: string,
    sceneId: string,
    categoryKey: string,
    userId: string
  ): Promise<SceneItem3D[]> {
    // Verify scene access
    const scene = await this.prisma.scene3D.findFirst({
      where: {
        id: sceneId,
        project: { id: projectId, userId: userId },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found or access denied');
    }

    return this.prisma.sceneItem3D.findMany({
      where: {
        sceneId: sceneId,
        categoryKey: categoryKey,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}