import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, Scene3D, ProjectMember, ProjectRole } from '@prisma/client';

export interface ProjectWithScenes extends Project {
  scenes3D: {
    id: string;
    name: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }[];
  _count: {
    members: number;
  };
  // Thumbnail fields are already included from Project model
}

export interface ProjectCreationResult {
  projectId: string;
  sceneId: string;
  project: Project;
  scene: Scene3D;
  membership: ProjectMember;
}

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new project with auto-membership and initial scene
   */
  async create(userId: string, createProjectDto: CreateProjectDto): Promise<ProjectCreationResult> {
    const { name, scene: sceneConfig } = createProjectDto;

    // Default spawn settings
    const defaultSpawn = {
      position: [0, 1.7, 5.0] as [number, number, number],
      yaw_deg: 0,
    };

    const spawn = {
      position: sceneConfig?.spawn?.position ?? defaultSpawn.position,
      yaw_deg: sceneConfig?.spawn?.yaw_deg ?? defaultSpawn.yaw_deg,
    };

    // Execute in transaction: Project + ProjectMember(ADMIN) + initial Scene3D
    return await this.prisma.$transaction(async (tx) => {
      console.log(`Creating project "${name}" with initial scene for user ${userId}`);
      
      // 1. Create the project
      const project = await tx.project.create({
        data: {
          name,
          userId, // Project.userId is the owner
        },
      });

      // 2. Create ProjectMember with ADMIN role for the creator
      const membership = await tx.projectMember.create({
        data: {
          userId,
          projectId: project.id,
          role: ProjectRole.ADMIN,
        },
      });

      // 3. Create initial Scene3D with default/provided settings
      const scene = await tx.scene3D.create({
        data: {
          projectId: project.id,
          name: sceneConfig?.name ?? 'Main Scene',
          version: 1,
          
          // Transform and environment settings
          scale: 1.0,
          exposure: sceneConfig?.exposure ?? 1.0,
          envHdriUrl: null,
          envIntensity: 1.0,
          
          // Spawn configuration
          spawnPositionX: spawn.position[0],
          spawnPositionY: spawn.position[1],
          spawnPositionZ: spawn.position[2],
          spawnYawDeg: spawn.yaw_deg,
          
          // Optional asset references
          navmeshAssetId: sceneConfig?.navmesh_asset_id ?? null,
        },
      });

      return {
        projectId: project.id,
        sceneId: scene.id,
        project,
        scene,
        membership,
      };
    });
  }

  /**
   * Get all projects where the user is a member
   */
  async findUserProjects(userId: string): Promise<ProjectWithScenes[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        scenes3D: {
          select: {
            id: true,
            name: true,
            version: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return projects;
  }

  /**
   * Get a specific project by ID (only if user is a member)
   */
  async findOne(projectId: string, userId: string): Promise<ProjectWithScenes> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        scenes3D: {
          select: {
            id: true,
            name: true,
            version: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    return project;
  }

  /**
   * Update a project (only if user is a member with appropriate permissions)
   */
  async updateProject(projectId: string, userId: string, updateData: UpdateProjectDto): Promise<ProjectWithScenes> {
    // First verify the user has access to the project
    const existingProject = await this.findOne(projectId, userId);
    
    // Update the project
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    // Return the updated project
    return this.findOne(projectId, userId);
  }

  /**
   * Get user's role in a project
   */
  async getUserProjectRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      select: {
        role: true,
      },
    });

    return member?.role ?? null;
  }

  /**
   * Delete a project (only if user is the owner)
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    // First verify the user has access to the project
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        userId: true, // Project owner
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // Only the project owner can delete the project
    if (project.userId !== userId) {
      throw new NotFoundException('Only the project owner can delete this project');
    }

    // Delete the project (cascading deletes will handle related data)
    await this.prisma.project.delete({
      where: { id: projectId },
    });
  }
}
