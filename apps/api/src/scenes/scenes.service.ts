import { Injectable, NotFoundException, ForbiddenException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ValidationService } from '../shared/services/validation.service';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { CreateSceneItemDto } from './dto/create-scene-item.dto';
import { UpdateSceneItemDto } from './dto/update-scene-item.dto';
import { SceneManifestV2, SceneDelta } from './dto/scene-manifest.dto';
import { Scene3D, SceneItem3D, Prisma } from '@prisma/client';

export interface SceneWithItems extends Scene3D {
  items: SceneItem3D[];
  navmeshAsset?: {
    id: string;
    originalName: string;
    meshoptUrl: string | null;
    dracoUrl: string | null;
    navmeshUrl: string | null;
  };
  shellAsset?: {
    id: string;
    originalName: string;
    originalUrl: string;
    meshoptUrl: string | null;
    dracoUrl: string | null;
  };
}

@Injectable()
export class ScenesService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
    @Inject(forwardRef(() => 'ScenesGateway'))
    private scenesGateway?: any,
  ) {}

  /**
   * Create a new 3D scene
   */
  async create(projectId: string, userId: string, createSceneDto: CreateSceneDto): Promise<Scene3D> {
    // Verify project access (owner or member)
    const project = await this.prisma.project.findFirst({
      where: { 
        id: projectId,
        OR: [
          { userId: userId }, // Project owner
          { members: { some: { userId: userId } } } // Project member
        ]
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // Validate navmesh asset if provided
    if (createSceneDto.navmeshAssetId) {
      const navmeshAsset = await this.prisma.asset.findFirst({
        where: {
          id: createSceneDto.navmeshAssetId,
          uploaderId: userId,
          mimeType: 'model/gltf-binary',
          status: 'READY',
        },
      });

      if (!navmeshAsset) {
        throw new NotFoundException('Navmesh asset not found or not ready');
      }
    }

    return this.prisma.scene3D.create({
      data: {
        projectId: projectId,
        name: createSceneDto.name,
        scale: createSceneDto.scale,
        exposure: createSceneDto.exposure,
        envHdriUrl: createSceneDto.envHdriUrl,
        envIntensity: createSceneDto.envIntensity,
        spawnPositionX: createSceneDto.spawnPositionX ?? 0.0,
        spawnPositionY: createSceneDto.spawnPositionY ?? 1.7,
        spawnPositionZ: createSceneDto.spawnPositionZ ?? 5.0,
        spawnYawDeg: createSceneDto.spawnYawDeg ?? 0.0,
        navmeshAssetId: createSceneDto.navmeshAssetId,
      },
    });
  }

  /**
   * Get all scenes for a project
   */
  async findAll(projectId: string, userId: string): Promise<SceneWithItems[]> {
    // Verify project access (owner or member)
    const project = await this.prisma.project.findFirst({
      where: { 
        id: projectId,
        OR: [
          { userId: userId }, // Project owner
          { members: { some: { userId: userId } } } // Project member
        ]
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    return this.prisma.scene3D.findMany({
      where: { projectId: projectId },
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
    }) as Promise<SceneWithItems[]>;
  }

  /**
   * Get a specific scene with items
   */
  async findOne(projectId: string, sceneId: string, userId: string): Promise<SceneWithItems> {
    const scene = await this.prisma.scene3D.findFirst({
      where: {
        id: sceneId,
        project: { 
          id: projectId,
          OR: [
            { userId: userId }, // Project owner
            { members: { some: { userId: userId } } } // Project member
          ]
        },
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
        shellAsset: {
          select: {
            id: true,
            originalName: true,
            originalUrl: true,
            meshoptUrl: true,
            dracoUrl: true,
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
   * Get a specific scene with items by scene ID only
   */
  async findOneBySceneId(sceneId: string, userId: string): Promise<SceneWithItems> {
    const scene = await this.prisma.scene3D.findFirst({
      where: {
        id: sceneId,
        project: {
          OR: [
            { userId: userId }, // Project owner
            { members: { some: { userId: userId } } } // Project member
          ]
        },
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
        shellAsset: {
          select: {
            id: true,
            originalName: true,
            originalUrl: true,
            meshoptUrl: true,
            dracoUrl: true,
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
          uploaderId: userId,
          mimeType: 'model/gltf-binary',
          status: 'READY',
        },
      });

      if (!navmeshAsset) {
        throw new NotFoundException('Navmesh asset not found or not ready');
      }
    }

    // Validate shell asset if being updated
    if (updateSceneDto.shellAssetId) {
      const shellAsset = await this.prisma.asset.findFirst({
        where: {
          id: updateSceneDto.shellAssetId,
          uploaderId: userId,
          mimeType: 'model/gltf-binary',
          status: 'READY',
        },
      });

      if (!shellAsset) {
        throw new NotFoundException('Shell asset not found or not ready');
      }
    }

    return this.prisma.scene3D.update({
      where: { id: sceneId },
      data: {
        ...updateSceneDto,
        version: { increment: 1 }, // Increment version for optimistic locking
        envHdriUrl: updateSceneDto.envHdriUrl,
        envIntensity: updateSceneDto.envIntensity,
        spawnPositionX: updateSceneDto.spawnPositionX,
        spawnPositionY: updateSceneDto.spawnPositionY,
        spawnPositionZ: updateSceneDto.spawnPositionZ,
        spawnYawDeg: updateSceneDto.spawnYawDeg,
        navmeshAssetId: updateSceneDto.navmeshAssetId,
        shellAssetId: updateSceneDto.shellAssetId,
        shellCastShadow: updateSceneDto.shellCastShadow,
        shellReceiveShadow: updateSceneDto.shellReceiveShadow,
      },
    });
  }

  /**
   * Update scene properties by scene ID only with optimistic locking
   */
  async updateBySceneId(
    sceneId: string,
    userId: string,
    updateSceneDto: UpdateSceneDto,
    expectedVersion?: number,
  ): Promise<Scene3D> {
    // Get current scene with version check
    const currentScene = await this.findOneBySceneId(sceneId, userId);

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
          uploaderId: userId,
          mimeType: 'model/gltf-binary',
          status: 'READY',
        },
      });

      if (!navmeshAsset) {
        throw new NotFoundException('Navmesh asset not found or not ready');
      }
    }

    // Validate shell asset if being updated
    if (updateSceneDto.shellAssetId) {
      const shellAsset = await this.prisma.asset.findFirst({
        where: {
          id: updateSceneDto.shellAssetId,
          uploaderId: userId,
          mimeType: 'model/gltf-binary',
          status: 'READY',
        },
      });

      if (!shellAsset) {
        throw new NotFoundException('Shell asset not found or not ready');
      }
    }

    return this.prisma.scene3D.update({
      where: { id: sceneId },
      data: {
        ...updateSceneDto,
        version: { increment: 1 }, // Increment version for optimistic locking
        envHdriUrl: updateSceneDto.envHdriUrl,
        envIntensity: updateSceneDto.envIntensity,
        spawnPositionX: updateSceneDto.spawnPositionX,
        spawnPositionY: updateSceneDto.spawnPositionY,
        spawnPositionZ: updateSceneDto.spawnPositionZ,
        spawnYawDeg: updateSceneDto.spawnYawDeg,
        navmeshAssetId: updateSceneDto.navmeshAssetId,
        shellAssetId: updateSceneDto.shellAssetId,
        shellCastShadow: updateSceneDto.shellCastShadow,
        shellReceiveShadow: updateSceneDto.shellReceiveShadow,
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
   * Delete a scene by scene ID only
   */
  async removeBySceneId(sceneId: string, userId: string): Promise<void> {
    const scene = await this.findOneBySceneId(sceneId, userId);

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
        projectId: projectId,
        categoryKey: createSceneItemDto.categoryKey,
      },
      include: {
        asset: true,
      },
    });

    if (!category || category.asset.status !== 'READY') {
      throw new NotFoundException('Category not found in project or asset not ready');
    }

    // Validate scene constraints before adding item
    const validationResult = await this.validationService.validateSceneConstraints(sceneId);
    if (!validationResult.isValid) {
      throw new ConflictException(`Scene validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Create the scene item
    const item = await this.prisma.sceneItem3D.create({
      data: {
        sceneId: sceneId,
        categoryKey: createSceneItemDto.categoryKey,
        model: createSceneItemDto.model,
        positionX: createSceneItemDto.positionX ?? 0.0,
        positionY: createSceneItemDto.positionY ?? 0.0,
        positionZ: createSceneItemDto.positionZ ?? 0.0,
        rotationX: createSceneItemDto.rotationX ?? 0.0,
        rotationY: createSceneItemDto.rotationY ?? 0.0,
        rotationZ: createSceneItemDto.rotationZ ?? 0.0,
        scaleX: createSceneItemDto.scaleX ?? 1.0,
        scaleY: createSceneItemDto.scaleY ?? 1.0,
        scaleZ: createSceneItemDto.scaleZ ?? 1.0,
        materialVariant: createSceneItemDto.materialVariant,
        materialOverrides: createSceneItemDto.materialOverrides,
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
   * Add an item to a scene by scene ID only
   */
  async addItemBySceneId(
    sceneId: string,
    userId: string,
    createSceneItemDto: CreateSceneItemDto,
  ): Promise<SceneItem3D> {
    // Get scene and verify access
    const scene = await this.findOneBySceneId(sceneId, userId);

    // Verify category exists in project
    const category = await this.prisma.projectCategory3D.findFirst({
      where: {
        projectId: scene.projectId,
        categoryKey: createSceneItemDto.categoryKey,
      },
      include: {
        asset: true,
      },
    });

    if (!category || category.asset.status !== 'READY') {
      throw new NotFoundException('Category not found in project or asset not ready');
    }

    // Validate scene constraints before adding item
    const validationResult = await this.validationService.validateSceneConstraints(sceneId);
    if (!validationResult.isValid) {
      throw new ConflictException(`Scene validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Create the scene item
    const item = await this.prisma.sceneItem3D.create({
      data: {
        sceneId: sceneId,
        categoryKey: createSceneItemDto.categoryKey,
        model: createSceneItemDto.model,
        positionX: createSceneItemDto.positionX ?? 0.0,
        positionY: createSceneItemDto.positionY ?? 0.0,
        positionZ: createSceneItemDto.positionZ ?? 0.0,
        rotationX: createSceneItemDto.rotationX ?? 0.0,
        rotationY: createSceneItemDto.rotationY ?? 0.0,
        rotationZ: createSceneItemDto.rotationZ ?? 0.0,
        scaleX: createSceneItemDto.scaleX ?? 1.0,
        scaleY: createSceneItemDto.scaleY ?? 1.0,
        scaleZ: createSceneItemDto.scaleZ ?? 1.0,
        materialVariant: createSceneItemDto.materialVariant,
        materialOverrides: createSceneItemDto.materialOverrides,
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
      where: { id: itemId, sceneId: sceneId },
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
        positionX: updateSceneItemDto.positionX,
        positionY: updateSceneItemDto.positionY,
        positionZ: updateSceneItemDto.positionZ,
        rotationX: updateSceneItemDto.rotationX,
        rotationY: updateSceneItemDto.rotationY,
        rotationZ: updateSceneItemDto.rotationZ,
        scaleX: updateSceneItemDto.scaleX,
        scaleY: updateSceneItemDto.scaleY,
        scaleZ: updateSceneItemDto.scaleZ,
        materialVariant: updateSceneItemDto.materialVariant,
        materialOverrides: updateSceneItemDto.materialOverrides,
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
   * Update a scene item by scene ID only
   */
  async updateItemBySceneId(
    sceneId: string,
    itemId: string,
    userId: string,
    updateSceneItemDto: UpdateSceneItemDto,
  ): Promise<SceneItem3D> {
    // Verify scene access
    await this.findOneBySceneId(sceneId, userId);

    // Verify item exists in scene
    const item = await this.prisma.sceneItem3D.findFirst({
      where: { id: itemId, sceneId: sceneId },
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
        positionX: updateSceneItemDto.positionX,
        positionY: updateSceneItemDto.positionY,
        positionZ: updateSceneItemDto.positionZ,
        rotationX: updateSceneItemDto.rotationX,
        rotationY: updateSceneItemDto.rotationY,
        rotationZ: updateSceneItemDto.rotationZ,
        scaleX: updateSceneItemDto.scaleX,
        scaleY: updateSceneItemDto.scaleY,
        scaleZ: updateSceneItemDto.scaleZ,
        materialVariant: updateSceneItemDto.materialVariant,
        materialOverrides: updateSceneItemDto.materialOverrides,
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
      where: { id: itemId, sceneId: sceneId },
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
   * Remove an item from a scene by scene ID only
   */
  async removeItemBySceneId(
    sceneId: string,
    itemId: string,
    userId: string,
  ): Promise<void> {
    // Verify scene access
    await this.findOneBySceneId(sceneId, userId);

    // Verify item exists and is not locked
    const item = await this.prisma.sceneItem3D.findFirst({
      where: { id: itemId, sceneId: sceneId },
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
    categoryFilter?: string[],
    includeMetadata?: boolean,
  ): Promise<SceneManifestV2> {
    const scene = await this.findOne(projectId, sceneId, userId);

    // Get all categories referenced by scene items
    let categoryKeys = [...new Set(scene.items.map(item => item.categoryKey))];
    
    // Apply category filter if provided
    if (categoryFilter && categoryFilter.length > 0) {
      categoryKeys = categoryKeys.filter(key => categoryFilter.includes(key));
    }
    
    const categories = await this.prisma.projectCategory3D.findMany({
      where: {
        projectId: projectId,
        categoryKey: { in: categoryKeys },
      },
      include: {
        asset: {
          select: {
            id: true,
            meshoptUrl: true,
            dracoUrl: true,
            ktx2Url: true,
            originalUrl: true,
          },
        },
      },
    });

    // Build categories map for manifest
    const categoriesMap: Record<string, any> = {};
    for (const category of categories) {
      const categoryData: any = {
        assetId: category.asset.id,
        variants: {
          original: { url: category.asset.originalUrl },
          meshopt: category.asset.meshoptUrl ? { url: category.asset.meshoptUrl } : undefined,
          draco: category.asset.dracoUrl ? { url: category.asset.dracoUrl } : undefined,
          ktx2: category.asset.ktx2Url ? { url: category.asset.ktx2Url } : undefined,
        },
      };
      
      // Include additional metadata if requested
      if (includeMetadata) {
        categoryData.metadata = {
          instancing: category.instancing,
          draco: category.draco,
          meshopt: category.meshopt,
          ktx2: category.ktx2,
        };
      }
      
      categoriesMap[category.categoryKey] = categoryData;
    }

    // Debug: log discovered vs found category keys
    try {
      const foundKeys = categories.map(c => c.categoryKey);
      console.debug(`[generateManifest] project=${projectId} scene=${sceneId} discoveredCategoryKeys=${JSON.stringify(categoryKeys)} foundCategoryKeys=${JSON.stringify(foundKeys)}`);
    } catch (e) {
      // ignore logging errors
    }

    // Ensure placeholders exist for any referenced category keys that weren't found in projectCategory3D
    for (const key of categoryKeys) {
      if (!categoriesMap[key]) {
        console.warn(`[generateManifest] missing projectCategory for key='${key}' project='${projectId}' scene='${sceneId}' - adding placeholder`);
        categoriesMap[key] = {
          assetId: null,
          variants: {},
          metadata: includeMetadata ? { instancing: false, draco: false, meshopt: false, ktx2: false } : undefined,
          _missing: true,
        };
      }
    }

    // Filter scene items if category filter is applied
    const filteredItems = categoryFilter 
      ? scene.items.filter(item => categoryFilter.includes(item.categoryKey))
      : scene.items;

    // Get shell asset data if exists
    let shellData: any = undefined;
    if (scene.shellAssetId) {
      const shellAsset = await this.prisma.asset.findUnique({
        where: { id: scene.shellAssetId },
        select: {
          id: true,
          originalUrl: true,
          meshoptUrl: true,
          dracoUrl: true,
        },
      });

      if (shellAsset) {
        shellData = {
          assetId: shellAsset.id,
          castShadow: scene.shellCastShadow ?? true,
          receiveShadow: scene.shellReceiveShadow ?? true,
          url: shellAsset.originalUrl,
          variants: {
            original: shellAsset.originalUrl,
            ...(shellAsset.meshoptUrl && { meshopt: shellAsset.meshoptUrl }),
            ...(shellAsset.dracoUrl && { draco: shellAsset.dracoUrl }),
          },
        };
      }
    }

    const manifest: SceneManifestV2 = {
      scene: {
        id: scene.id,
        name: scene.name,
        version: scene.version,
        scale: scene.scale || undefined,
        exposure: scene.exposure || undefined,
        envHdriUrl: scene.envHdriUrl || undefined,
        envIntensity: scene.envIntensity || undefined,
        spawnPoint: {
          position: {
            x: scene.spawnPositionX,
            y: scene.spawnPositionY,
            z: scene.spawnPositionZ,
          },
          yawDeg: scene.spawnYawDeg,
        },
        navmeshAssetId: scene.navmeshAssetId || undefined,
        shell: shellData,
      },
      items: filteredItems.map(item => ({
        id: item.id,
        categoryKey: item.categoryKey,
        model: item.model || undefined,
        transform: {
          position: {
            x: item.positionX,
            y: item.positionY,
            z: item.positionZ,
          },
          rotation: {
            x: item.rotationX,
            y: item.rotationY,
            z: item.rotationZ,
          },
          scale: {
            x: item.scaleX,
            y: item.scaleY,
            z: item.scaleZ,
          },
        },
        material: item.materialVariant || item.materialOverrides ? {
          variant: item.materialVariant || undefined,
          overrides: item.materialOverrides as Record<string, any> || undefined,
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
   * Generate scene manifest by scene ID only
   */
  async generateManifestBySceneId(
    sceneId: string,
    userId: string,
    categoryFilter?: string[],
    includeMetadata?: boolean,
  ): Promise<SceneManifestV2> {
    const scene = await this.findOneBySceneId(sceneId, userId);

    // Get all categories referenced by scene items
    let categoryKeys = [...new Set(scene.items.map(item => item.categoryKey))];

    // Apply category filter if provided
    if (categoryFilter && categoryFilter.length > 0) {
      categoryKeys = categoryKeys.filter(key => categoryFilter.includes(key));
    }

    const categories = await this.prisma.projectCategory3D.findMany({
      where: {
        projectId: scene.projectId,
        categoryKey: { in: categoryKeys },
      },
      include: {
        asset: {
          select: {
            id: true,
            meshoptUrl: true,
            dracoUrl: true,
            ktx2Url: true,
            originalUrl: true,
          },
        },
      },
    });

    // Build categories map for manifest
    const categoriesMap: Record<string, any> = {};
    for (const category of categories) {
      const categoryData: any = {
        assetId: category.asset.id,
        variants: {
          original: { url: category.asset.originalUrl },
          meshopt: category.asset.meshoptUrl ? { url: category.asset.meshoptUrl } : undefined,
          draco: category.asset.dracoUrl ? { url: category.asset.dracoUrl } : undefined,
          ktx2: category.asset.ktx2Url ? { url: category.asset.ktx2Url } : undefined,
        },
      };

      // Include additional metadata if requested
      if (includeMetadata) {
        categoryData.metadata = {
          instancing: category.instancing,
          draco: category.draco,
          meshopt: category.meshopt,
          ktx2: category.ktx2,
        };
      }

      categoriesMap[category.categoryKey] = categoryData;
    }

    // Debug: log discovered vs found category keys
    try {
      const foundKeys = categories.map(c => c.categoryKey);
      console.debug(`[generateManifestBySceneId] scene=${sceneId} discoveredCategoryKeys=${JSON.stringify(categoryKeys)} foundCategoryKeys=${JSON.stringify(foundKeys)}`);
    } catch (e) {
      // ignore logging errors
    }

    // Ensure placeholders exist for any referenced category keys that weren't found in projectCategory3D
    for (const key of categoryKeys) {
      if (!categoriesMap[key]) {
        console.warn(`[generateManifestBySceneId] missing projectCategory for key='${key}' scene='${sceneId}' - adding placeholder`);
        categoriesMap[key] = {
          assetId: null,
          variants: {},
          metadata: includeMetadata ? { instancing: false, draco: false, meshopt: false, ktx2: false } : undefined,
          _missing: true,
        };
      }
    }

    // Filter scene items if category filter is applied
    const filteredItems = categoryFilter
      ? scene.items.filter(item => categoryFilter.includes(item.categoryKey))
      : scene.items;

    // Get shell asset data if exists
    let shellData: any = undefined;
    if (scene.shellAssetId) {
      const shellAsset = await this.prisma.asset.findUnique({
        where: { id: scene.shellAssetId },
        select: {
          id: true,
          originalUrl: true,
          meshoptUrl: true,
          dracoUrl: true,
        },
      });

      if (shellAsset) {
        shellData = {
          assetId: shellAsset.id,
          castShadow: scene.shellCastShadow ?? true,
          receiveShadow: scene.shellReceiveShadow ?? true,
          url: shellAsset.originalUrl,
          variants: {
            original: shellAsset.originalUrl,
            ...(shellAsset.meshoptUrl && { meshopt: shellAsset.meshoptUrl }),
            ...(shellAsset.dracoUrl && { draco: shellAsset.dracoUrl }),
          },
        };
      }
    }

    const manifest: SceneManifestV2 = {
      scene: {
        id: scene.id,
        name: scene.name,
        version: scene.version,
        scale: scene.scale || undefined,
        exposure: scene.exposure || undefined,
        envHdriUrl: scene.envHdriUrl || undefined,
        envIntensity: scene.envIntensity || undefined,
        spawnPoint: {
          position: {
            x: scene.spawnPositionX,
            y: scene.spawnPositionY,
            z: scene.spawnPositionZ,
          },
          yawDeg: scene.spawnYawDeg,
        },
        navmeshAssetId: scene.navmeshAssetId || undefined,
        shell: shellData,
      },
      items: filteredItems.map(item => ({
        id: item.id,
        categoryKey: item.categoryKey,
        model: item.model || undefined,
        transform: {
          position: {
            x: item.positionX,
            y: item.positionY,
            z: item.positionZ,
          },
          rotation: {
            x: item.rotationX,
            y: item.rotationY,
            z: item.rotationZ,
          },
          scale: {
            x: item.scaleX,
            y: item.scaleY,
            z: item.scaleZ,
          },
        },
        material: item.materialVariant || item.materialOverrides ? {
          variant: item.materialVariant || undefined,
          overrides: item.materialOverrides as Record<string, any> || undefined,
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
   * Get available categories in a scene with their metadata
   */
  async getSceneCategories(
    projectId: string,
    sceneId: string,
    userId: string,
  ) {
    const scene = await this.findOne(projectId, sceneId, userId);

    // Get category usage statistics
    const categoryStats = scene.items.reduce((acc, item) => {
      acc[item.categoryKey] = (acc[item.categoryKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryKeys = Object.keys(categoryStats);
    const categories = await this.prisma.projectCategory3D.findMany({
      where: {
        projectId: projectId,
        categoryKey: { in: categoryKeys },
      },
      include: {
        asset: {
          select: {
            id: true,
          },
        },
      },
    });

    const result = {
      categories: categories.map(category => ({
        categoryKey: category.categoryKey,
        assetId: category.asset.id,
        itemCount: categoryStats[category.categoryKey],
        capabilities: {
          instancing: category.instancing,
          draco: category.draco,
          meshopt: category.meshopt,
          ktx2: category.ktx2,
        },
      })),
    };

    return result;
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
   * Generate delta between two scene versions by scene ID only
   */
  async generateDeltaBySceneId(
    sceneId: string,
    fromVersion: number,
    toVersion: number,
    userId: string,
  ): Promise<SceneDelta> {
    // Verify scene access
    await this.findOneBySceneId(sceneId, userId);

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
   * Get scene version by scene ID only
   */
  async getVersionBySceneId(sceneId: string, userId: string): Promise<number> {
    const scene = await this.findOneBySceneId(sceneId, userId);
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