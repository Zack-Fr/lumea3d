import { Test, TestingModule } from '@nestjs/testing';
import { ProjectCategory3DService } from './project-category-3d.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

// Mock the PrismaService completely
const mockPrismaService = () => ({
  projectCategory3D: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
  },
  project: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  asset: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  sceneItem3D: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
});

type MockedPrismaService = ReturnType<typeof mockPrismaService>;

describe('ProjectCategory3DService', () => {
  let service: ProjectCategory3DService;
  let prismaService: MockedPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectCategory3DService,
        {
          provide: PrismaService,
          useFactory: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProjectCategory3DService>(ProjectCategory3DService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-1';
    const projectId = 'project-1';
    const createDto = {
      categoryKey: 'furniture_seating',
      assetId: 'asset-1',
      instancing: false,
      draco: true,
      meshopt: true,
      ktx2: false,
    };

    it('should create a new project category', async () => {
      const mockProject = { id: projectId, userId };
      const mockAsset = { id: 'asset-1', uploaderId: userId, status: 'READY' };
      const mockCategory = { id: 'category-1', ...createDto, projectId };

      prismaService.project.findFirst.mockResolvedValue(mockProject as any);
      prismaService.asset.findFirst.mockResolvedValue(mockAsset as any);
      prismaService.projectCategory3D.findFirst.mockResolvedValue(null);
      prismaService.projectCategory3D.create.mockResolvedValue(mockCategory as any);

      const result = await service.create(projectId, userId, createDto);

      expect(result).toEqual(mockCategory);
      expect(prismaService.project.findFirst).toHaveBeenCalledWith({
        where: { id: projectId, userId },
      });
      expect(prismaService.projectCategory3D.create).toHaveBeenCalledWith({
        data: {
          projectId,
          categoryKey: createDto.categoryKey,
          assetId: createDto.assetId,
          instancing: createDto.instancing,
          draco: createDto.draco,
          meshopt: createDto.meshopt,
          ktx2: createDto.ktx2,
        },
        include: {
          asset: {
            select: {
              id: true,
              originalName: true,
              originalUrl: true,
              dracoUrl: true,
              meshoptUrl: true,
              mimeType: true,
              status: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if project not found', async () => {
      prismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.create(projectId, userId, createDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if category already exists', async () => {
      const mockProject = { id: projectId, userId };
      const mockAsset = { id: 'asset-1', uploaderId: userId, status: 'READY' };
      const mockExistingCategory = { id: 'existing-category', categoryKey: createDto.categoryKey };

      prismaService.project.findFirst.mockResolvedValue(mockProject as any);
      prismaService.asset.findFirst.mockResolvedValue(mockAsset as any);
      prismaService.projectCategory3D.findFirst.mockResolvedValue(mockExistingCategory as any);

      await expect(service.create(projectId, userId, createDto))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    const userId = 'user-1';
    const projectId = 'project-1';

    it('should return all categories for a project', async () => {
      const mockProject = { id: projectId, userId };
      const mockCategories = [
        { id: 'cat-1', categoryKey: 'furniture_seating', projectId },
        { id: 'cat-2', categoryKey: 'furniture_tables', projectId },
      ];

      prismaService.project.findFirst.mockResolvedValue(mockProject as any);
      prismaService.projectCategory3D.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.findAll(projectId, userId);

      expect(result).toEqual(mockCategories);
      expect(prismaService.projectCategory3D.findMany).toHaveBeenCalledWith({
        where: { projectId },
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
            }
          }
        },
        orderBy: [
          { categoryKey: 'asc' },
          { createdAt: 'desc' }
        ],
      });
    });

    it('should throw NotFoundException if project not found', async () => {
      prismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.findAll(projectId, userId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    const userId = 'user-1';
    const projectId = 'project-1';
    const categoryId = 'category-1';

    it('should return a specific category', async () => {
      const mockCategory = {
        id: categoryId,
        categoryKey: 'furniture_seating',
        projectId,
        project: { userId },
      };

      prismaService.projectCategory3D.findFirst.mockResolvedValue(mockCategory as any);

      const result = await service.findOne(projectId, categoryId, userId);

      expect(result).toEqual(mockCategory);
      expect(prismaService.projectCategory3D.findFirst).toHaveBeenCalledWith({
        where: {
          id: categoryId,
          projectId,
          project: {
            OR: [
              { userId },
              { members: { some: { userId } } }
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
            }
          }
        },
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      prismaService.projectCategory3D.findFirst.mockResolvedValue(null);

      await expect(service.findOne(projectId, categoryId, userId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const userId = 'user-1';
    const projectId = 'project-1';
    const categoryId = 'category-1';
    const updateDto = {
      instancing: true,
      draco: false,
      meshopt: true,
      ktx2: true,
    };

    it('should update a category', async () => {
      const mockExistingCategory = {
        id: categoryId,
        categoryKey: 'furniture_seating',
        projectId,
        project: { userId },
      };
      const mockUpdatedCategory = { ...mockExistingCategory, ...updateDto };

      prismaService.projectCategory3D.findFirst.mockResolvedValue(mockExistingCategory as any);
      prismaService.projectCategory3D.update.mockResolvedValue(mockUpdatedCategory as any);

      const result = await service.update(projectId, categoryId, userId, updateDto);

      expect(result).toEqual(mockUpdatedCategory);
      expect(prismaService.projectCategory3D.update).toHaveBeenCalledWith({
        where: { id: categoryId },
        data: updateDto,
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
            }
          }
        },
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      prismaService.projectCategory3D.findFirst.mockResolvedValue(null);

      await expect(service.update(projectId, categoryId, userId, updateDto))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const userId = 'user-1';
    const projectId = 'project-1';
    const categoryId = 'category-1';

    it('should delete a category', async () => {
      const mockCategory = {
        id: categoryId,
        categoryKey: 'furniture_seating',
        projectId,
        project: { userId },
      };

      prismaService.projectCategory3D.findFirst.mockResolvedValue(mockCategory as any);
      prismaService.projectCategory3D.delete.mockResolvedValue(mockCategory as any);

      await service.remove(projectId, categoryId, userId);

      expect(prismaService.projectCategory3D.delete).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      prismaService.projectCategory3D.findFirst.mockResolvedValue(null);

      await expect(service.remove(projectId, categoryId, userId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategoryStats', () => {
    const userId = 'user-1';
    const projectId = 'project-1';
    const categoryKey = 'furniture_seating';

    it('should return category statistics', async () => {
      const mockProject = { id: projectId, userId };
      const mockCategory = {
        id: 'cat-1',
        categoryKey,
        projectId,
        asset: { id: 'asset-1', originalName: 'sofa.glb' },
        _count: { sceneItems: 5 },
      };
      const mockSceneItems = [
        { id: 'item-1', scene: { id: 'scene-1' } },
        { id: 'item-2', scene: { id: 'scene-1' } },
        { id: 'item-3', scene: { id: 'scene-2' } },
      ];

      prismaService.project.findFirst.mockResolvedValue(mockProject as any);
      prismaService.projectCategory3D.findFirst.mockResolvedValue(mockCategory as any);
      prismaService.sceneItem3D.findMany.mockResolvedValue(mockSceneItems as any);

      const result = await service.getCategoryStats(projectId, categoryKey, userId);

      expect(result).toEqual({
        categoryKey,
        assetId: undefined,
        assetName: 'sofa.glb',
        totalSceneItems: 3,
        uniqueScenes: 2,
        configuration: {
          instancing: undefined,
          draco: undefined,
          meshopt: undefined,
          ktx2: undefined
        }
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      const mockProject = { id: projectId, userId };
      prismaService.project.findFirst.mockResolvedValue(mockProject as any);
      prismaService.projectCategory3D.findFirst.mockResolvedValue(null);

      await expect(service.getCategoryStats(projectId, categoryKey, userId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkCreate', () => {
    const userId = 'user-1';
    const projectId = 'project-1';
    const categories = [
      {
        categoryKey: 'furniture_seating',
        assetId: 'asset-1',
        instancing: false,
        draco: true,
        meshopt: true,
        ktx2: false,
      },
      {
        categoryKey: 'furniture_tables',
        assetId: 'asset-2',
        instancing: true,
        draco: false,
        meshopt: true,
        ktx2: true,
      },
    ];

    it('should create multiple categories', async () => {
      const mockProject = { id: projectId, userId };

      prismaService.project.findFirst.mockResolvedValue(mockProject as any);
      
      // Mock existing category check
      prismaService.projectCategory3D.findFirst
        .mockResolvedValueOnce(null) // First category doesn't exist
        .mockResolvedValueOnce(null); // Second category doesn't exist
      
      // Mock asset validation to return valid assets
      prismaService.asset.findFirst
        .mockResolvedValueOnce({ id: 'asset-1', name: 'asset1.glb', status: 'READY' })
        .mockResolvedValueOnce({ id: 'asset-2', name: 'asset2.glb', status: 'READY' });
      
      prismaService.projectCategory3D.create
        .mockResolvedValueOnce({ id: 1, ...categories[0] })
        .mockResolvedValueOnce({ id: 2, ...categories[1] });

      const result = await service.bulkCreate(projectId, userId, categories);

      expect(result).toEqual({
        created: 2,
        skipped: 0,
        errors: []
      });
      
      expect(prismaService.projectCategory3D.create).toHaveBeenCalledTimes(2);
      expect(prismaService.projectCategory3D.createMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if project not found', async () => {
      prismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.bulkCreate(projectId, userId, categories))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getAvailableAssets', () => {
    const userId = 'user-1';
    const projectId = 'project-1';

    it('should return available assets for a project', async () => {
      const mockProject = { id: projectId, userId };
      const mockAssets = [
        { id: 'asset-1', originalName: 'sofa.glb', status: 'READY' },
        { id: 'asset-2', originalName: 'table.glb', status: 'READY' },
      ];

      prismaService.project.findFirst.mockResolvedValue(mockProject as any);
      prismaService.projectCategory3D.findMany.mockResolvedValue([]);
      prismaService.asset.findMany.mockResolvedValue(mockAssets as any);

      const result = await service.getAvailableAssets(projectId, userId);

      expect(result).toEqual({
        total: 2,
        assets: [
          {
            id: 'asset-1',
            name: 'sofa.glb',
            mimeType: undefined,
            fileSize: undefined,
            createdAt: undefined,
            variants: {
              original: false,
              meshopt: false,
              draco: false
            }
          },
          {
            id: 'asset-2',
            name: 'table.glb',
            mimeType: undefined,
            fileSize: undefined,
            createdAt: undefined,
            variants: {
              original: false,
              meshopt: false,
              draco: false
            }
          }
        ]
      });
      expect(prismaService.asset.findMany).toHaveBeenCalledWith({
        where: {
          uploaderId: userId,
          status: 'READY',
          id: {
            notIn: [],
          },
        },
        select: {
          id: true,
          originalName: true,
          originalUrl: true,
          dracoUrl: true,
          meshoptUrl: true,
          mimeType: true,
          fileSize: true,
          createdAt: true,
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException if project not found', async () => {
      prismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.getAvailableAssets(projectId, userId))
        .rejects.toThrow(NotFoundException);
    });
  });
});