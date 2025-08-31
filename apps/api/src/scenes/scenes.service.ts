import { Injectable, NotFoundException, ForbiddenException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { CreateSceneItemDto } from './dto/create-scene-item.dto';
import { UpdateSceneItemDto } from './dto/update-scene-item.dto';
import { SceneManifestV2, SceneDelta } from './dto/scene-manifest.dto';
import { Scene3D, SceneItem3D, Prisma } from '@prisma/client';

export interface SceneWithItems extends Scene3D {
  items: SceneItem3D[];
  navmesh_asset?: {
    id: string;
    original_name: string;
    meshopt_url: string | null;
    draco_url: string | null;
    navmesh_url: string | null;
  };
}

@Injectable()
export class ScenesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => 'ScenesGateway'))
    private scenesGateway?: any,
  ) {}

  /**
   * Create a new 3D scene
   */
  async create(projectId: string, userId: string, createSceneDto: CreateSceneDto): Promise<Scene3D> {
    // Verify project ownership
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, user_id: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // Validate navmesh asset if provided
    if (createSceneDto.navmeshAssetId) {
      const navmeshAsset = await this.prisma.asset.findFirst({
        where: {
          id: createSceneDto.navmeshAssetId,
          uploader_id: userId,
          mime_type: 'model/gltf-binary',
          status: 'READY',
        },
      });

      if (!navmeshAsset) {
        throw new NotFoundException('Navmesh asset not found or not ready');
      }
    }

    return this.prisma.scene3D.create({
      data: {
        project_id: projectId,
        name: createSceneDto.name,
        scale: createSceneDto.scale,
        exposure: createSceneDto.exposure,
        env_hdri_url: createSceneDto.envHdriUrl,
        env_intensity: createSceneDto.envIntensity,
        spawn_position_x: createSceneDto.spawnPositionX ?? 0.0,
        spawn_position_y: createSceneDto.spawnPositionY ?? 1.7,
        spawn_position_z: createSceneDto.spawnPositionZ ?? 5.0,
        spawn_yaw_deg: createSceneDto.spawnYawDeg ?? 0.0,
        navmesh_asset_id: createSceneDto.navmeshAssetId,
      },
    });
  }

  /**
   * Get all scenes for a project
   */
  async findAll(projectId: string, userId: string): Promise<SceneWithItems[]> {
    // Verify project ownership
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, user_id: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    return this.prisma.scene3D.findMany({
      where: { project_id: projectId },
      include: {
        items: {
          orderBy: { created_at: 'asc' },
        },
        navmesh_asset: {
          select: {
            id: true,
            original_name: true,
            meshopt_url: true,
            draco_url: true,
            navmesh_url: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    }) as Promise<SceneWithItems[]>;
  }

  /**
   * Get a specific scene with items
   */
  async findOne(projectId: string, sceneId: string, userId: string): Promise<SceneWithItems> {
    const scene = await this.prisma.scene3D.findFirst({
      where: {
        id: sceneId,
        project: { id: projectId, user_id: userId },
      },
      include: {
        items: {
          orderBy: { created_at: 'asc' },
        },
        navmesh_asset: {
          select: {
            id: true,
            original_name: true,
            meshopt_url: true,
            draco_url: true,
            navmesh_url: true,
          },
        },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found or access denied');
    }

    return scene as SceneWithItems;
  }

  /**
   * Update scene properties with optimistic locking
   */
  async update(
    projectId: string,
    sceneId: string,
    userId: string,
    updateSceneDto: UpdateSceneDto,
    expectedVersion?: number,
  ): Promise<Scene3D> {
    // Get current scene with version check
    const currentScene = await this.findOne(projectId, sceneId, userId);

    if (expectedVersion !== undefined && currentScene.version !== expectedVersion) {
      throw new ConflictException(
        `Scene version conflict. Expected ${expectedVersion}, got ${currentScene.version}`,
      );
    }

    // Validate navmesh asset if being updated
    if (updateSceneDto.navmeshAssetId) {
      const navmeshAsset = await this.prisma.asset.findFirst({
        where: {
          id: updateSceneDto.navmeshAssetId,
          uploader_id: userId,
          mime_type: 'model/gltf-binary',
          status: 'READY',
        },
      });

      if (!navmeshAsset) {
        throw new NotFoundException('Navmesh asset not found or not ready');
      }
    }

    return this.prisma.scene3D.update({
      where: { id: sceneId },
      data: {
        ...updateSceneDto,
        version: { increment: 1 }, // Increment version for optimistic locking
        env_hdri_url: updateSceneDto.envHdriUrl,
        env_intensity: updateSceneDto.envIntensity,
        spawn_position_x: updateSceneDto.spawnPositionX,
        spawn_position_y: updateSceneDto.spawnPositionY,
        spawn_position_z: updateSceneDto.spawnPositionZ,
        spawn_yaw_deg: updateSceneDto.spawnYawDeg,
        navmesh_asset_id: updateSceneDto.navmeshAssetId,
      },
    });
  }

  /**
   * Delete a scene and all its items
   */
  async remove(projectId: string, sceneId: string, userId: string): Promise<void> {
    const scene = await this.findOne(projectId, sceneId, userId);

    await this.prisma.scene3D.delete({
      where: { id: scene.id },
    });
  }

  /**
   * Add an item to a scene
   */
  async addItem(
    projectId: string,
    sceneId: string,
    userId: string,
    createSceneItemDto: CreateSceneItemDto,
  ): Promise<SceneItem3D> {
    // Verify scene access and get current version
    const scene = await this.findOne(projectId, sceneId, userId);

    // Verify category exists in project
    const category = await this.prisma.projectCategory3D.findFirst({
      where: {
        project_id: projectId,
        category_key: createSceneItemDto.categoryKey,
      },
      include: {
        asset: true,
      },
    });

    if (!category || category.asset.status !== 'READY') {
      throw new NotFoundException('Category not found in project or asset not ready');
    }

    // Create the scene item
    const item = await this.prisma.sceneItem3D.create({
      data: {
        scene_id: sceneId,
        category_key: createSceneItemDto.categoryKey,
        model: createSceneItemDto.model,
        position_x: createSceneItemDto.positionX ?? 0.0,
        position_y: createSceneItemDto.positionY ?? 0.0,
        position_z: createSceneItemDto.positionZ ?? 0.0,
        rotation_x: createSceneItemDto.rotationX ?? 0.0,
        rotation_y: createSceneItemDto.rotationY ?? 0.0,
        rotation_z: createSceneItemDto.rotationZ ?? 0.0,
        scale_x: createSceneItemDto.scaleX ?? 1.0,
        scale_y: createSceneItemDto.scaleY ?? 1.0,
        scale_z: createSceneItemDto.scaleZ ?? 1.0,
        material_variant: createSceneItemDto.materialVariant,
        material_overrides: createSceneItemDto.materialOverrides,
        selectable: createSceneItemDto.selectable ?? true,
        locked: createSceneItemDto.locked ?? false,
        meta: createSceneItemDto.meta,
      },
    });

    // Increment scene version for realtime delta tracking
    await this.prisma.scene3D.update({
      where: { id: sceneId },
      data: { version: { increment: 1 } },
    });

    // Notify realtime clients
    this.notifySceneUpdate(sceneId, {
      type: 'add',
      target: 'item',
      id: item.id,
      data: item,
    });

    return item;
  }

  /**
   * Update a scene item
   */
  async updateItem(
    projectId: string,
    sceneId: string,
    itemId: string,
    userId: string,
    updateSceneItemDto: UpdateSceneItemDto,
  ): Promise<SceneItem3D> {
    // Verify scene access
    await this.findOne(projectId, sceneId, userId);

    // Verify item exists in scene
    const item = await this.prisma.sceneItem3D.findFirst({
      where: { id: itemId, scene_id: sceneId },
    });

    if (!item) {
      throw new NotFoundException('Scene item not found');
    }

    // Check if item is locked
    if (item.locked) {
      throw new ForbiddenException('Cannot modify locked scene item');
    }

    // Update the item
    const updatedItem = await this.prisma.sceneItem3D.update({
      where: { id: itemId },
      data: {
        model: updateSceneItemDto.model,
        position_x: updateSceneItemDto.positionX,
        position_y: updateSceneItemDto.positionY,
        position_z: updateSceneItemDto.positionZ,
        rotation_x: updateSceneItemDto.rotationX,
        rotation_y: updateSceneItemDto.rotationY,
        rotation_z: updateSceneItemDto.rotationZ,
        scale_x: updateSceneItemDto.scaleX,
        scale_y: updateSceneItemDto.scaleY,
        scale_z: updateSceneItemDto.scaleZ,
        material_variant: updateSceneItemDto.materialVariant,
        material_overrides: updateSceneItemDto.materialOverrides,
        selectable: updateSceneItemDto.selectable,
        locked: updateSceneItemDto.locked,
        meta: updateSceneItemDto.meta,
      },
    });

    // Increment scene version for realtime delta tracking
    await this.prisma.scene3D.update({
      where: { id: sceneId },
      data: { version: { increment: 1 } },
    });

    // Notify realtime clients
    this.notifySceneUpdate(sceneId, {
      type: 'update',
      target: 'item',
      id: itemId,
      data: updatedItem,
    });

    return updatedItem;
  }

  /**
   * Remove an item from a scene
   */
  async removeItem(
    projectId: string,
    sceneId: string,
    itemId: string,
    userId: string,
  ): Promise<void> {
    // Verify scene access
    await this.findOne(projectId, sceneId, userId);

    // Verify item exists and is not locked
    const item = await this.prisma.sceneItem3D.findFirst({
      where: { id: itemId, scene_id: sceneId },
    });

    if (!item) {
      throw new NotFoundException('Scene item not found');
    }

    if (item.locked) {
      throw new ForbiddenException('Cannot remove locked scene item');
    }

    await this.prisma.sceneItem3D.delete({
      where: { id: itemId },
    });

    // Increment scene version for realtime delta tracking
    await this.prisma.scene3D.update({
      where: { id: sceneId },
      data: { version: { increment: 1 } },
    });

    // Notify realtime clients
    this.notifySceneUpdate(sceneId, {
      type: 'remove',
      target: 'item',
      id: itemId,
      data: null,
    });
  }

  /**
   * Generate scene manifest for client consumption
   */
  async generateManifest(
    projectId: string,
    sceneId: string,
    userId: string,
  ): Promise<SceneManifestV2> {
    const scene = await this.findOne(projectId, sceneId, userId);

    // Get all categories referenced by scene items
    const categoryKeys = [...new Set(scene.items.map(item => item.category_key))];
    const categories = await this.prisma.projectCategory3D.findMany({
      where: {
        project_id: projectId,
        category_key: { in: categoryKeys },
      },
      include: {
        asset: {
          select: {
            id: true,
            meshopt_url: true,
            draco_url: true,
            original_url: true,
          },
        },
      },
    });

    // Build categories map for manifest
    const categoriesMap: Record<string, any> = {};
    for (const category of categories) {
      categoriesMap[category.category_key] = {
        assetId: category.asset.id,
        variants: {
          original: category.asset.original_url,
          meshopt: category.asset.meshopt_url,
          draco: category.asset.draco_url,
        },
      };
    }

    const manifest: SceneManifestV2 = {
      scene: {
        id: scene.id,
        name: scene.name,
        version: scene.version,
        scale: scene.scale || undefined,
        exposure: scene.exposure || undefined,
        envHdriUrl: scene.env_hdri_url || undefined,
        envIntensity: scene.env_intensity || undefined,
        spawnPoint: {
          position: {
            x: scene.spawn_position_x,
            y: scene.spawn_position_y,
            z: scene.spawn_position_z,
          },
          yawDeg: scene.spawn_yaw_deg,
        },
        navmeshAssetId: scene.navmesh_asset_id || undefined,
      },
      items: scene.items.map(item => ({
        id: item.id,
        categoryKey: item.category_key,
        model: item.model || undefined,
        transform: {
          position: {
            x: item.position_x,
            y: item.position_y,
            z: item.position_z,
          },
          rotation: {
            x: item.rotation_x,
            y: item.rotation_y,
            z: item.rotation_z,
          },
          scale: {
            x: item.scale_x,
            y: item.scale_y,
            z: item.scale_z,
          },
        },
        material: item.material_variant || item.material_overrides ? {
          variant: item.material_variant || undefined,
          overrides: item.material_overrides as Record<string, any> || undefined,
        } : undefined,
        behavior: {
          selectable: item.selectable,
          locked: item.locked,
        },
        meta: item.meta as Record<string, any> || undefined,
      })),
      categories: categoriesMap,
      generatedAt: new Date().toISOString(),
    };

    return manifest;
  }

  /**
   * Generate delta between two scene versions
   */
  async generateDelta(
    projectId: string,
    sceneId: string,
    fromVersion: number,
    toVersion: number,
    userId: string,
  ): Promise<SceneDelta> {
    // For now, return a placeholder delta
    // In a full implementation, this would query historical data
    // or use event sourcing to reconstruct deltas
    return {
      fromVersion,
      toVersion,
      operations: [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get scene version for optimistic locking
   */
  async getVersion(projectId: string, sceneId: string, userId: string): Promise<number> {
    const scene = await this.findOne(projectId, sceneId, userId);
    return scene.version;
  }

  /**
   * Notify realtime clients of scene updates
   */
  private notifySceneUpdate(sceneId: string, operation: any) {
    if (this.scenesGateway?.notifySceneUpdate) {
      this.scenesGateway.notifySceneUpdate(sceneId, {
        ...operation,
        userId: 'system',
        timestamp: Date.now(),
      });
    }
  }
}