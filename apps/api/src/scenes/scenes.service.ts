import { Injectable, NotFoundException, ForbiddenException, ConflictException, Inject, forwardRef, PreconditionFailedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ValidationService } from '../shared/services/validation.service';
import { StorageService } from '../storage/storage.service';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { CreateSceneItemDto } from './dto/create-scene-item.dto';
import { UpdateSceneItemDto } from './dto/update-scene-item.dto';
import { SceneManifestV2, SceneManifestFrontend, SceneDelta } from './dto/scene-manifest.dto';
import { DeltaOp, BatchDeltaResponseDto } from './dto/delta-operations.dto';
import { CreateSnapshotDto, CreateSnapshotResponseDto, RestoreSnapshotDto, RestoreSnapshotResponseDto, ListSnapshotsResponseDto } from './dto/snapshot.dto';
import { Scene3D, SceneItem3D, SceneSnapshot, Prisma } from '@prisma/client';

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
    private storageService: StorageService,
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
   * Generate scene manifest for client consumption (frontend-compatible format)
   */
  async generateManifest(
    projectId: string,
    sceneId: string,
    userId: string,
    categoryFilter?: string[],
    includeMetadata?: boolean,
  ): Promise<SceneManifestFrontend> {
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
            originalName: true,
          },
        },
      },
    });

    // Build categories map for manifest (frontend-compatible format)
    const categoriesMap: Record<string, any> = {};
    for (const category of categories) {
      // Use the best available URL (prefer meshopt for performance, fallback to original)
      let assetUrl = category.asset.meshoptUrl || category.asset.originalUrl;
      
      if (assetUrl) {
        // If it's not already a full URL, generate a public URL
        if (!assetUrl.startsWith('http')) {
          try {
            const originalAssetUrl = assetUrl;
            assetUrl = this.storageService.generatePublicDownloadUrl(assetUrl);
            console.log(`[DEBUG] URL Generation - Original: ${originalAssetUrl} -> Generated: ${assetUrl}`);
          } catch (error) {
            console.warn(`Failed to generate public URL for asset ${category.asset.id}:`, error);
            assetUrl = ''; // Fallback to empty URL
          }
        } else {
          console.log(`[DEBUG] URL Generation - Already full URL: ${assetUrl}`);
        }
        
        categoriesMap[category.categoryKey] = {
          url: assetUrl, // Frontend expects simple url field
          name: category.categoryKey, // Use categoryKey as name
          description: `Category ${category.categoryKey}`,
          tags: [],
          capabilities: {
            physics: false,
            interaction: false,
          },
        };
      }
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
          url: '', // Empty URL for missing categories
          name: key,
          description: `Missing category ${key}`,
          tags: [],
          capabilities: {
            physics: false,
            interaction: false,
          },
        };
      }
    }

    // Filter scene items if category filter is applied
    const filteredItems = categoryFilter 
      ? scene.items.filter(item => categoryFilter.includes(item.categoryKey))
      : scene.items;

    // Transform items to frontend-compatible format
    const transformedItems = filteredItems.map(item => {
      // Find the category to get the asset name
      const category = categories.find(c => c.categoryKey === item.categoryKey);
      const assetName = category?.asset?.originalName || item.categoryKey;
      
      return {
        id: item.id,
        name: assetName, // Use asset's original name
        category: item.categoryKey, // Frontend expects 'category' field
        model: item.model || '',
        transform: {
          position: [
            item.positionX,
            item.positionY,
            item.positionZ,
          ] as [number, number, number], // Array format
          rotation_euler: [
            item.rotationX,
            item.rotationY,
            item.rotationZ,
          ] as [number, number, number], // Frontend expects rotation_euler
          scale: [
            item.scaleX,
            item.scaleY,
            item.scaleZ,
          ] as [number, number, number], // Array format
        },
        material: item.materialVariant || item.materialOverrides ? {
          variant: item.materialVariant || undefined,
          overrides: item.materialOverrides as Record<string, any> || undefined,
        } : {},
        selectable: item.selectable ?? true,
        locked: item.locked ?? false,
        meta: item.meta as Record<string, any> || {},
      };
    });

    // Build spawn point in frontend-compatible format
    const spawn = scene.spawnPositionX !== undefined ? {
      position: [
        scene.spawnPositionX,
        scene.spawnPositionY || 0,
        scene.spawnPositionZ || 0,
      ] as [number, number, number],
      rotation: scene.spawnYawDeg ? [
        0, 0, scene.spawnYawDeg, 1, // Convert yaw to quaternion approximation
      ] as [number, number, number, number] : undefined,
    } : undefined;

    // Get navmesh URL if exists
    let navmeshUrl: string | undefined = undefined;
    if (scene.navmeshAssetId) {
      const navmeshAsset = await this.prisma.asset.findUnique({
        where: { id: scene.navmeshAssetId },
        select: {
          navmeshUrl: true,
          originalUrl: true,
        },
      });

      if (navmeshAsset) {
        // Use navmesh URL if available, otherwise fallback to original
        let assetUrl = navmeshAsset.navmeshUrl || navmeshAsset.originalUrl;
        
        if (assetUrl) {
          // If it's not already a full URL, generate a public URL
          if (!assetUrl.startsWith('http')) {
            try {
              assetUrl = this.storageService.generatePublicDownloadUrl(assetUrl);
            } catch (error) {
              console.warn(`Failed to generate public URL for navmesh asset ${scene.navmeshAssetId}:`, error);
              assetUrl = undefined;
            }
          }
          navmeshUrl = assetUrl;
        }
      }
    }

    const manifest: SceneManifestFrontend = {
      scene: {
        id: scene.id,
        name: scene.name,
        version: scene.version,
      },
      items: transformedItems,
      categories: categoriesMap,
      generatedAt: new Date().toISOString(),
      spawn,
      env: scene.envHdriUrl ? {
        hdri_url: scene.envHdriUrl,
      } : {},
      navmesh_url: navmeshUrl,
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
   * Apply batched delta operations atomically
   */
  async applyDelta(
    sceneId: string,
    userId: string,
    operations: DeltaOp[],
    ifMatch?: number,
    idempotencyKey?: string,
  ): Promise<BatchDeltaResponseDto> {
    // Verify scene access first
    const scene = await this.findOneBySceneId(sceneId, userId);
    
    // Check version match if provided
    if (ifMatch !== undefined && scene.version !== ifMatch) {
      throw new PreconditionFailedException(
        `Scene version conflict. Expected ${ifMatch}, got ${scene.version}`,
      );
    }

    // Apply operations within a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Process each operation
      for (const op of operations) {
        switch (op.op) {
          case 'update_item':
            await this.applyUpdateItemOp(tx, sceneId, op, userId);
            break;
          case 'add_item':
            await this.applyAddItemOp(tx, sceneId, op, userId, scene.projectId);
            break;
          case 'remove_item':
            await this.applyRemoveItemOp(tx, sceneId, op, userId);
            break;
          case 'update_props':
            await this.applyUpdatePropsOp(tx, sceneId, op);
            break;
          case 'update_material':
            await this.applyUpdateMaterialOp(tx, sceneId, op, userId);
            break;
          default:
            throw new BadRequestException(`Unknown operation type: ${(op as any).op}`);
        }
      }

      // Increment scene version once per batch
      const updatedScene = await tx.scene3D.update({
        where: { id: sceneId },
        data: { version: { increment: 1 } },
      });

      return { version: updatedScene.version };
    });

    // Generate ETag for response
    const etag = `W/"v${result.version}"`;

    // Notify realtime clients
    this.notifySceneUpdate(sceneId, {
      type: 'batch_update',
      target: 'scene',
      operations: operations.length,
      version: result.version,
    });

    return {
      version: result.version,
      etag,
    };
  }

  /**
   * Create a scene snapshot
   */
  async createSnapshot(
    sceneId: string,
    userId: string,
    createSnapshotDto: CreateSnapshotDto,
  ): Promise<CreateSnapshotResponseDto> {
    // Generate current manifest for the snapshot
    const manifest = await this.generateManifestBySceneId(sceneId, userId);
    
    // Create the snapshot
    const snapshot = await this.prisma.sceneSnapshot.create({
      data: {
        sceneId,
        label: createSnapshotDto.label,
        manifest: manifest as any,
      },
    });

    return {
      snapshotId: snapshot.id,
      label: snapshot.label,
      createdAt: snapshot.createdAt.toISOString(),
    };
  }

  /**
   * List snapshots for a scene
   */
  async listSnapshots(
    sceneId: string,
    userId: string,
  ): Promise<ListSnapshotsResponseDto> {
    // Verify access to scene
    await this.findOneBySceneId(sceneId, userId);
    
    const snapshots = await this.prisma.sceneSnapshot.findMany({
      where: { sceneId },
      select: {
        id: true,
        label: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      snapshots: snapshots.map(s => ({
        id: s.id,
        label: s.label,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Restore scene from snapshot
   */
  async restoreFromSnapshot(
    sceneId: string,
    userId: string,
    restoreSnapshotDto: RestoreSnapshotDto,
  ): Promise<RestoreSnapshotResponseDto> {
    // Verify access to scene
    const scene = await this.findOneBySceneId(sceneId, userId);
    
    // Get the snapshot
    const snapshot = await this.prisma.sceneSnapshot.findFirst({
      where: {
        id: restoreSnapshotDto.snapshotId,
        sceneId,
      },
    });

    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }

    // Restore from manifest within transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const manifest = snapshot.manifest as any as SceneManifestV2;
      
      // Clear existing items
      await tx.sceneItem3D.deleteMany({
        where: { sceneId },
      });

      // Restore items from manifest
      for (const item of manifest.items) {
        await tx.sceneItem3D.create({
          data: {
            id: item.id,
            sceneId,
            categoryKey: item.categoryKey,
            model: item.model,
            positionX: item.transform.position.x,
            positionY: item.transform.position.y,
            positionZ: item.transform.position.z,
            rotationX: item.transform.rotation.x,
            rotationY: item.transform.rotation.y,
            rotationZ: item.transform.rotation.z,
            scaleX: item.transform.scale.x,
            scaleY: item.transform.scale.y,
            scaleZ: item.transform.scale.z,
            materialVariant: item.material?.variant,
            materialOverrides: item.material?.overrides,
            selectable: item.behavior.selectable,
            locked: item.behavior.locked,
            meta: item.meta,
          },
        });
      }

      // Update scene properties and increment version
      const updatedScene = await tx.scene3D.update({
        where: { id: sceneId },
        data: {
          name: manifest.scene.name,
          scale: manifest.scene.scale,
          exposure: manifest.scene.exposure,
          envHdriUrl: manifest.scene.envHdriUrl,
          envIntensity: manifest.scene.envIntensity,
          spawnPositionX: manifest.scene.spawnPoint.position.x,
          spawnPositionY: manifest.scene.spawnPoint.position.y,
          spawnPositionZ: manifest.scene.spawnPoint.position.z,
          spawnYawDeg: manifest.scene.spawnPoint.yawDeg,
          navmeshAssetId: manifest.scene.navmeshAssetId,
          shellAssetId: manifest.scene.shell?.assetId,
          shellCastShadow: manifest.scene.shell?.castShadow,
          shellReceiveShadow: manifest.scene.shell?.receiveShadow,
          version: { increment: 1 },
        },
      });

      return { version: updatedScene.version };
    });

    // Generate ETag for response
    const etag = `W/"v${result.version}"`;

    // Notify realtime clients
    this.notifySceneUpdate(sceneId, {
      type: 'restore',
      target: 'scene',
      snapshotId: restoreSnapshotDto.snapshotId,
      version: result.version,
    });

    return {
      version: result.version,
      etag,
      restoredLabel: snapshot.label,
    };
  }

  /**
   * Helper methods for applying delta operations
   */
  private async applyUpdateItemOp(
    tx: Prisma.TransactionClient,
    sceneId: string,
    op: Extract<DeltaOp, { op: 'update_item' }>,
    userId: string,
  ) {
    const item = await tx.sceneItem3D.findFirst({
      where: { id: op.id, sceneId },
    });

    if (!item) {
      throw new NotFoundException(`Scene item ${op.id} not found`);
    }

    if (item.locked) {
      throw new ForbiddenException('Cannot modify locked scene item');
    }

    const updateData: any = {};
    
    if (op.transform) {
      if (op.transform.position) {
        updateData.positionX = op.transform.position[0];
        updateData.positionY = op.transform.position[1];
        updateData.positionZ = op.transform.position[2];
      }
      if (op.transform.rotation_euler) {
        updateData.rotationX = op.transform.rotation_euler[0];
        updateData.rotationY = op.transform.rotation_euler[1]; // yawDeg maps to rotationY
        updateData.rotationZ = op.transform.rotation_euler[2];
      }
      if (op.transform.scale) {
        updateData.scaleX = op.transform.scale[0];
        updateData.scaleY = op.transform.scale[1];
        updateData.scaleZ = op.transform.scale[2];
      }
    }

    await tx.sceneItem3D.update({
      where: { id: op.id },
      data: updateData,
    });
  }

  private async applyAddItemOp(
    tx: Prisma.TransactionClient,
    sceneId: string,
    op: Extract<DeltaOp, { op: 'add_item' }>,
    userId: string,
    projectId: string,
  ) {
    // For now, we'll use categoryKey if provided, or derive it from assetId
    // In a full implementation, you'd have asset-to-category mapping
    const categoryKey = op.categoryKey || 'default';
    
    await tx.sceneItem3D.create({
      data: {
        sceneId,
        categoryKey,
        model: op.model,
        positionX: op.transform.position?.[0] ?? 0,
        positionY: op.transform.position?.[1] ?? 0,
        positionZ: op.transform.position?.[2] ?? 0,
        rotationX: op.transform.rotation_euler?.[0] ?? 0,
        rotationY: op.transform.rotation_euler?.[1] ?? 0,
        rotationZ: op.transform.rotation_euler?.[2] ?? 0,
        scaleX: op.transform.scale?.[0] ?? 1,
        scaleY: op.transform.scale?.[1] ?? 1,
        scaleZ: op.transform.scale?.[2] ?? 1,
      },
    });
  }

  private async applyRemoveItemOp(
    tx: Prisma.TransactionClient,
    sceneId: string,
    op: Extract<DeltaOp, { op: 'remove_item' }>,
    userId: string,
  ) {
    const item = await tx.sceneItem3D.findFirst({
      where: { id: op.id, sceneId },
    });

    if (!item) {
      throw new NotFoundException(`Scene item ${op.id} not found`);
    }

    if (item.locked) {
      throw new ForbiddenException('Cannot remove locked scene item');
    }

    await tx.sceneItem3D.delete({
      where: { id: op.id },
    });
  }

  private async applyUpdatePropsOp(
    tx: Prisma.TransactionClient,
    sceneId: string,
    op: Extract<DeltaOp, { op: 'update_props' }>,
  ) {
    // Get current scene props
    const scene = await tx.scene3D.findUnique({
      where: { id: sceneId },
      select: { props: true },
    });

    const currentProps = (scene?.props as any) || {};
    const { op: opType, ...propsUpdate } = op;
    
    // Deep merge the props update
    const mergedProps = this.mergeDeep(currentProps, propsUpdate);

    await tx.scene3D.update({
      where: { id: sceneId },
      data: { props: mergedProps },
    });
  }

  private async applyUpdateMaterialOp(
    tx: Prisma.TransactionClient,
    sceneId: string,
    op: Extract<DeltaOp, { op: 'update_material' }>,
    userId: string,
  ) {
    const item = await tx.sceneItem3D.findFirst({
      where: { id: op.id, sceneId },
    });

    if (!item) {
      throw new NotFoundException(`Scene item ${op.id} not found`);
    }

    if (item.locked) {
      throw new ForbiddenException('Cannot modify locked scene item');
    }

    await tx.sceneItem3D.update({
      where: { id: op.id },
      data: { materialOverrides: op.materialOverrides },
    });
  }

  private mergeDeep(target: any, source: any): any {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target))
            Object.assign(output, { [key]: source[key] });
          else
            output[key] = this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Notify realtime clients of scene updates
   */
  private notifySceneUpdate(sceneId: string, operation: any) {
    if (this.scenesGateway?.emitSceneUpdate) {
      // Use FlatScenesGateway's emitSceneUpdate method
      this.scenesGateway.emitSceneUpdate(sceneId, 'scene:update', {
        ...operation,
        userId: 'system',
        timestamp: Date.now(),
      });
    }
  }
}
