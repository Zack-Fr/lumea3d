import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Scene3D } from '@prisma/client';
import { 
  CreateScene3DDto, 
  UpdateScene3DDto, 
  Scene3DQueryDto 
} from './dto/scene3d/scene3d.dto';

export interface Scene3DWithItems extends Scene3D {
  items: any[];
  navmeshAsset?: {
    id: string;
    originalName: string;
    meshoptUrl: string | null;
    dracoUrl: string | null;
    navmeshUrl: string | null;
  };
}

@Injectable()
export class Scene3DService {
  private readonly logger = new Logger(Scene3DService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new 3D scene
   */
  async create(
    projectId: string, 
    userId: string, 
    dto: CreateScene3DDto
  ): Promise<Scene3D> {
    // Verify project ownership
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // Validate navmesh asset if provided
    if (dto.navmeshAssetId) {
      const navmeshAsset = await this.prisma.asset.findFirst({
        where: {
          id: dto.navmeshAssetId,
          uploaderId: userId,
          mimeType: 'model/gltf-binary',
          status: 'READY',
        },
      });

      if (!navmeshAsset) {
        throw new NotFoundException('Navmesh asset not found or not ready');
      }
    }

    // Check for duplicate scene names in project
    if (dto.name) {
      const existing = await this.prisma.scene3D.findFirst({
        where: {
          projectId: projectId,
          name: dto.name,
        },
      });

      if (existing) {
        throw new ConflictException(`Scene with name '${dto.name}' already exists in this project`);
      }
    }

    const scene = await this.prisma.scene3D.create({
      data: {
        projectId: projectId,
        name: dto.name,
        version: dto.version ?? 1,
        scale: dto.scale ?? 1.0,
        exposure: dto.exposure ?? 1.0,
        envHdriUrl: dto.envHdriUrl,
        envIntensity: dto.envIntensity ?? 1.0,
        spawnPositionX: dto.spawnPositionX ?? 0.0,
        spawnPositionY: dto.spawnPositionY ?? 1.7,
        spawnPositionZ: dto.spawnPositionZ ?? 5.0,
        spawnYawDeg: dto.spawnYawDeg ?? 0.0,
        navmeshAssetId: dto.navmeshAssetId,
      },
    });

    this.logger.log(`Created scene '${dto.name}' (${scene.id}) in project ${projectId}`);

    return scene;
  }

  /**
   * Get all scenes for a project
   */
  async findAll(
    projectId: string, 
    userId: string, 
    query?: Scene3DQueryDto
  ): Promise<Scene3DWithItems[]> {
    // Verify project ownership
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    const where: any = { projectId: projectId };

    if (query?.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }

    if (query?.minVersion) {
      where.version = { gte: query.minVersion };
    }

    const scenes = await this.prisma.scene3D.findMany({
      where,
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
        navmeshAsset: {
          select: {
            id: true,
            originalName: true,
            meshoptUrl: true,
            dracoUrl: true,
            navmeshUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: query?.limit ?? 20,
      skip: query?.offset ?? 0,
    });

    return scenes as Scene3DWithItems[];
  }

  /**
   * Get a specific scene with items
   */
  async findOne(
    projectId: string, 
    sceneId: string, 
    userId: string
  ): Promise<Scene3DWithItems> {
    const scene = await this.prisma.scene3D.findFirst({
      where: {
        id: sceneId,
        project: { id: projectId, userId: userId },
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
        navmeshAsset: {
          select: {
            id: true,
            originalName: true,
            meshoptUrl: true,
            dracoUrl: true,
            navmeshUrl: true,
          },
        },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found or access denied');
    }

    return scene as Scene3DWithItems;
  }

  /**
   * Update scene properties with optimistic locking
   */
  async update(
    projectId: string,
    sceneId: string,
    userId: string,
    dto: UpdateScene3DDto,
    expectedVersion?: number,
  ): Promise<Scene3D> {
    // Get current scene with version check
    const currentScene = await this.findOne(projectId, sceneId, userId);

    if (expectedVersion !== undefined && currentScene.version !== expectedVersion) {
      throw new ConflictException(
        `Scene version conflict. Expected ${expectedVersion}, got ${currentScene.version}`,
      );
    }

    // Check for duplicate names if name is being changed
    if (dto.name && dto.name !== currentScene.name) {
      const existing = await this.prisma.scene3D.findFirst({
        where: {
          projectId: projectId,
          name: dto.name,
          NOT: { id: sceneId },
        },
      });

      if (existing) {
        throw new ConflictException(`Scene with name '${dto.name}' already exists in this project`);
      }
    }

    // Validate navmesh asset if being updated
    if (dto.navmeshAssetId) {
      const navmeshAsset = await this.prisma.asset.findFirst({
        where: {
          id: dto.navmeshAssetId,
          uploaderId: userId,
          mimeType: 'model/gltf-binary',
          status: 'READY',
        },
      });

      if (!navmeshAsset) {
        throw new NotFoundException('Navmesh asset not found or not ready');
      }
    }

    const updated = await this.prisma.scene3D.update({
      where: { id: sceneId },
      data: {
        name: dto.name,
        version: dto.version ?? { increment: 1 }, // Increment version for optimistic locking
        scale: dto.scale,
        exposure: dto.exposure,
        envHdriUrl: dto.envHdriUrl,
        envIntensity: dto.envIntensity,
        spawnPositionX: dto.spawnPositionX,
        spawnPositionY: dto.spawnPositionY,
        spawnPositionZ: dto.spawnPositionZ,
        spawnYawDeg: dto.spawnYawDeg,
        navmeshAssetId: dto.navmeshAssetId,
      },
    });

    this.logger.log(`Updated scene ${sceneId} in project ${projectId} (version ${updated.version})`);

    return updated;
  }

  /**
   * Delete a scene
   */
  async remove(projectId: string, sceneId: string, userId: string): Promise<void> {
    const scene = await this.findOne(projectId, sceneId, userId);

    // Cascade delete will handle items automatically
    await this.prisma.scene3D.delete({
      where: { id: sceneId },
    });

    this.logger.log(`Deleted scene ${sceneId} from project ${projectId}`);
  }

  /**
   * Duplicate a scene
   */
  async duplicate(
    projectId: string,
    sceneId: string,
    userId: string,
    newName?: string
  ): Promise<Scene3D> {
    const originalScene = await this.findOne(projectId, sceneId, userId);

    const duplicateName = newName || `${originalScene.name} - Copy`;

    // Check for duplicate names
    const existing = await this.prisma.scene3D.findFirst({
      where: {
        projectId: projectId,
        name: duplicateName,
      },
    });

    if (existing) {
      throw new ConflictException(`Scene with name '${duplicateName}' already exists in this project`);
    }

    // Create new scene
    const newScene = await this.prisma.scene3D.create({
      data: {
        projectId: projectId,
        name: duplicateName,
        version: 1, // Start fresh
        scale: originalScene.scale,
        exposure: originalScene.exposure,
        envHdriUrl: originalScene.envHdriUrl,
        envIntensity: originalScene.envIntensity,
        spawnPositionX: originalScene.spawnPositionX,
        spawnPositionY: originalScene.spawnPositionY,
        spawnPositionZ: originalScene.spawnPositionZ,
        spawnYawDeg: originalScene.spawnYawDeg,
        navmeshAssetId: originalScene.navmeshAssetId,
      },
    });

    // Duplicate all scene items
    if (originalScene.items && originalScene.items.length > 0) {
      const itemsData = originalScene.items.map(item => ({
        sceneId: newScene.id,
        categoryKey: item.categoryKey,
        model: item.model,
        positionX: item.positionX,
        positionY: item.positionY,
        positionZ: item.positionZ,
        rotationX: item.rotationX,
        rotationY: item.rotationY,
        rotationZ: item.rotationZ,
        scaleX: item.scaleX,
        scaleY: item.scaleY,
        scaleZ: item.scaleZ,
        materialVariant: item.materialVariant,
        materialOverrides: item.materialOverrides,
        selectable: item.selectable,
        locked: item.locked,
        meta: item.meta,
      }));

      await this.prisma.sceneItem3D.createMany({
        data: itemsData,
      });
    }

    this.logger.log(`Duplicated scene ${sceneId} as ${newScene.id} ('${duplicateName}') in project ${projectId}`);

    return newScene;
  }

  /**
   * Get scene statistics
   */
  async getStatistics(projectId: string, sceneId: string, userId: string): Promise<{
    itemCount: number;
    categoryCount: number;
    boundingBox: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
    hasNavmesh: boolean;
  }> {
    const scene = await this.findOne(projectId, sceneId, userId);

    const itemCount = scene.items.length;
    const categoryCount = new Set(scene.items.map(item => item.categoryKey)).size;

    // Calculate bounding box
    let minX = Number.MAX_VALUE, minY = Number.MAX_VALUE, minZ = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE, maxY = Number.MIN_VALUE, maxZ = Number.MIN_VALUE;

    scene.items.forEach(item => {
      minX = Math.min(minX, item.positionX);
      minY = Math.min(minY, item.positionY);
      minZ = Math.min(minZ, item.positionZ);
      maxX = Math.max(maxX, item.positionX);
      maxY = Math.max(maxY, item.positionY);
      maxZ = Math.max(maxZ, item.positionZ);
    });

    // Handle empty scenes
    if (itemCount === 0) {
      minX = minY = minZ = maxX = maxY = maxZ = 0;
    }

    return {
      itemCount,
      categoryCount,
      boundingBox: {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
      },
      hasNavmesh: !!scene.navmeshAssetId,
    };
  }
}