import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectCategory3D } from '@prisma/client';
import { 
  CreateProjectCategory3DDto, 
  UpdateProjectCategory3DDto, 
  ProjectCategory3DQueryDto 
} from './dto/project-category-3d.dto';

@Injectable()
export class ProjectCategory3DService {
  private readonly logger = new Logger(ProjectCategory3DService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new project category 3D association
   */
  async create(
    projectId: string, 
    userId: string, 
    dto: CreateProjectCategory3DDto
  ): Promise<ProjectCategory3D> {
    // Verify project ownership
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // Verify asset exists and belongs to user
    const asset = await this.prisma.asset.findFirst({
      where: { 
        id: dto.assetId, 
        uploaderId: userId,
        status: 'READY'
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found, not ready, or access denied');
    }

    // Check for duplicate category key within project
    const existing = await this.prisma.projectCategory3D.findFirst({
      where: {
        projectId: projectId,
        assetId: dto.assetId,
        categoryKey: dto.categoryKey,
      },
    });

    if (existing) {
      throw new ConflictException('Category key already exists for this asset in this project');
    }

    const category = await this.prisma.projectCategory3D.create({
      data: {
        projectId: projectId,
        assetId: dto.assetId,
        categoryKey: dto.categoryKey,
        instancing: dto.instancing ?? false,
        draco: dto.draco ?? true,
        meshopt: dto.meshopt ?? true,
        ktx2: dto.ktx2 ?? true,
      },
      include: {
        asset: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            status: true,
            originalUrl: true,
            meshoptUrl: true,
            dracoUrl: true,
          },
        },
      },
    });

    this.logger.log(`Created category ${dto.categoryKey} for asset ${dto.assetId} in project ${projectId}`);

    return category;
  }

  /**
   * Get all project categories for a project
   */
  async findAll(
    projectId: string, 
    userId: string, 
    query?: ProjectCategory3DQueryDto
  ): Promise<ProjectCategory3D[]> {
    // Verify project access (owner or member)
    const projectAccess = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: userId }, // Owner
          { members: { some: { userId: userId } } } // Member
        ]
      },
    });

    if (!projectAccess) {
      throw new NotFoundException('Project not found or access denied');
    }

    const where: any = { projectId: projectId };

    if (query?.categoryKey) {
      where.categoryKey = { contains: query.categoryKey, mode: 'insensitive' };
    }

    if (query?.instancing !== undefined) {
      where.instancing = query.instancing;
    }

    return this.prisma.projectCategory3D.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            status: true,
            originalUrl: true,
            meshoptUrl: true,
            dracoUrl: true,
            navmeshUrl: true,
          },
        },
      },
      orderBy: [
        { categoryKey: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Get a specific project category
   */
  async findOne(
    projectId: string, 
    categoryId: string, 
    userId: string
  ): Promise<ProjectCategory3D> {
    const category = await this.prisma.projectCategory3D.findFirst({
      where: {
        id: categoryId,
        projectId: projectId,
        project: {
          OR: [
            { userId: userId }, // Owner
            { members: { some: { userId: userId } } } // Member
          ]
        },
      },
      include: {
        asset: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            status: true,
            originalUrl: true,
            meshoptUrl: true,
            dracoUrl: true,
            navmeshUrl: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Project category not found or access denied');
    }

    return category;
  }

  /**
   * Update a project category
   */
  async update(
    projectId: string,
    categoryId: string,
    userId: string,
    dto: UpdateProjectCategory3DDto
  ): Promise<ProjectCategory3D> {
    const existingCategory = await this.findOne(projectId, categoryId, userId);

    // Check for duplicate category key if it's being changed
    if (dto.categoryKey && dto.categoryKey !== existingCategory.categoryKey) {
      const duplicate = await this.prisma.projectCategory3D.findFirst({
        where: {
          projectId: projectId,
          categoryKey: dto.categoryKey,
          NOT: { id: categoryId },
        },
      });

      if (duplicate) {
        throw new ConflictException('Category key already exists in this project');
      }
    }

    const updated = await this.prisma.projectCategory3D.update({
      where: { id: categoryId },
      data: {
        categoryKey: dto.categoryKey,
        instancing: dto.instancing,
        draco: dto.draco,
        meshopt: dto.meshopt,
        ktx2: dto.ktx2,
      },
      include: {
        asset: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            status: true,
            originalUrl: true,
            meshoptUrl: true,
            dracoUrl: true,
            navmeshUrl: true,
          },
        },
      },
    });

    this.logger.log(`Updated category ${categoryId} in project ${projectId}`);

    return updated;
  }

  /**
   * Delete a project category
   */
  async remove(projectId: string, categoryId: string, userId: string): Promise<void> {
    const category = await this.findOne(projectId, categoryId, userId);

    // Check if category is being used in any scenes
    const usageCount = await this.prisma.sceneItem3D.count({
      where: {
        categoryKey: category.categoryKey,
        scene: { projectId: projectId },
      },
    });

    if (usageCount > 0) {
      throw new ConflictException(
        `Cannot delete category '${category.categoryKey}' - it is used in ${usageCount} scene items`
      );
    }

    await this.prisma.projectCategory3D.delete({
      where: { id: categoryId },
    });

    this.logger.log(`Deleted category ${categoryId} from project ${projectId}`);
  }

  /**
   * Get categories by asset ID
   */
  async findByAsset(assetId: string, userId: string): Promise<ProjectCategory3D[]> {
    // Verify asset ownership
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, uploaderId: userId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found or access denied');
    }

    return this.prisma.projectCategory3D.findMany({
      where: { assetId: assetId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { categoryKey: 'asc' },
    });
  }

  /**
   * Bulk update compression settings for multiple categories
   */
  async bulkUpdateCompression(
    projectId: string,
    userId: string,
    categoryIds: string[],
    settings: {
      draco?: boolean;
      meshopt?: boolean;
      ktx2?: boolean;
      instancing?: boolean;
    }
  ): Promise<number> {
    // Verify project ownership
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    const result = await this.prisma.projectCategory3D.updateMany({
      where: {
        id: { in: categoryIds },
        projectId: projectId,
      },
      data: settings,
    });

    this.logger.log(`Bulk updated compression settings for ${result.count} categories in project ${projectId}`);

    return result.count;
  }

  /**
   * Get category usage statistics
   */
  async getCategoryStats(
    projectId: string,
    categoryKey: string,
    userId: string,
  ): Promise<{
    categoryKey: string;
    assetId: string;
    assetName: string;
    totalSceneItems: number;
    uniqueScenes: number;
    configuration: {
      instancing: boolean;
      draco: boolean;
      meshopt: boolean;
      ktx2: boolean;
    };
  }> {
    // Get category by categoryKey instead of ID
    const category = await this.prisma.projectCategory3D.findFirst({
      where: {
        projectId: projectId,
        categoryKey: categoryKey,
        project: {
          OR: [
            { userId: userId }, // Owner
            { members: { some: { userId: userId } } } // Member
          ]
        },
      },
      include: {
        asset: {
          select: {
            id: true,
            originalName: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found or access denied');
    }

    // Count scene items using this category
    const sceneItems = await this.prisma.sceneItem3D.findMany({
      where: {
        categoryKey: categoryKey,
        scene: {
          projectId: projectId,
        },
      },
      include: {
        scene: {
          select: { id: true },
        },
      },
    });

    const totalSceneItems = sceneItems.length;
    const uniqueScenes = new Set(sceneItems.map(item => item.scene.id)).size;

    return {
      categoryKey: category.categoryKey,
      assetId: category.assetId,
      assetName: category.asset.originalName,
      totalSceneItems,
      uniqueScenes,
      configuration: {
        instancing: category.instancing,
        draco: category.draco,
        meshopt: category.meshopt,
        ktx2: category.ktx2,
      },
    };
  }

  /**
   * Bulk create categories
   */
  async bulkCreate(
    projectId: string,
    userId: string,
    categories: CreateProjectCategory3DDto[],
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    // Verify project ownership
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const dto of categories) {
      try {
        // Check if category already exists
        const existing = await this.prisma.projectCategory3D.findFirst({
          where: {
            projectId: projectId,
            categoryKey: dto.categoryKey,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Verify asset exists and is ready
        const asset = await this.prisma.asset.findFirst({
          where: {
            id: dto.assetId,
            uploaderId: userId,
            status: 'READY',
          },
        });

        if (!asset) {
          errors.push(`Asset ${dto.assetId} not found or not ready for category ${dto.categoryKey}`);
          continue;
        }

        await this.prisma.projectCategory3D.create({
          data: {
            projectId: projectId,
            categoryKey: dto.categoryKey,
            assetId: dto.assetId,
            instancing: dto.instancing ?? false,
            draco: dto.draco ?? false,
            meshopt: dto.meshopt ?? false,
            ktx2: dto.ktx2 ?? false,
          },
        });

        created++;
      } catch (error) {
        errors.push(`Failed to create category ${dto.categoryKey}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk created ${created} categories, skipped ${skipped}, errors: ${errors.length}`);

    return { created, skipped, errors };
  }

  /**
   * Get available assets for adding to project
   */
  async getAvailableAssets(
    projectId: string,
    userId: string,
    query: { mimeType?: string; search?: string } = {},
  ) {
    // Verify project ownership
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // Get assets already in the project
    const existingCategories = await this.prisma.projectCategory3D.findMany({
      where: { projectId: projectId },
      select: { assetId: true },
    });

    const existingAssetIds = existingCategories.map(cat => cat.assetId);

    // Build where conditions
    const whereConditions: any = {
      uploaderId: userId,
      status: 'READY',
      id: { notIn: existingAssetIds },
    };

    if (query.mimeType) {
      whereConditions.mimeType = query.mimeType;
    }

    if (query.search) {
      whereConditions.originalName = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const assets = await this.prisma.asset.findMany({
      where: whereConditions,
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        createdAt: true,
        originalUrl: true,
        meshoptUrl: true,
        dracoUrl: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      assets: assets.map(asset => ({
        id: asset.id,
        name: asset.originalName,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        createdAt: asset.createdAt,
        variants: {
          original: !!asset.originalUrl,
          meshopt: !!asset.meshoptUrl,
          draco: !!asset.dracoUrl,
        },
      })),
      total: assets.length,
    };
  }
}