import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProjectRole } from '@prisma/client';

@Injectable()
export class AuthzService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if a user has access to a project based on their membership role
   * @param userId - The user ID to check
   * @param projectId - The project ID to check access for
   * @param method - HTTP method (GET/HEAD for read, others for write)
   * @returns Promise<boolean> - Whether the user has access
   */
  async userHasProjectAccess(
    userId: string,
    projectId: string,
    method: string,
  ): Promise<boolean> {
    const member = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
      select: { role: true },
    });

    if (!member) return false;

    const isRead = ['GET', 'HEAD'].includes(method.toUpperCase());
    
    // All roles can read
    if (isRead) return true;

    // Only DESIGNER and ADMIN can write
    return member.role === ProjectRole.DESIGNER || member.role === ProjectRole.ADMIN;
  }

  /**
   * Get user's role in a project
   * @param userId - The user ID
   * @param projectId - The project ID
   * @returns Promise<ProjectRole | null> - The user's role or null if not a member
   */
  async getUserProjectRole(
    userId: string,
    projectId: string,
  ): Promise<ProjectRole | null> {
    const member = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
      select: { role: true },
    });

    return member?.role || null;
  }

  /**
   * Check if user has specific role or higher in project
   * @param userId - The user ID
   * @param projectId - The project ID
   * @param requiredRole - Minimum required role
   * @returns Promise<boolean> - Whether user has required role or higher
   */
  async userHasProjectRole(
    userId: string,
    projectId: string,
    requiredRole: ProjectRole,
  ): Promise<boolean> {
    const userRole = await this.getUserProjectRole(userId, projectId);
    if (!userRole) return false;

    // Role hierarchy: CLIENT < DESIGNER < ADMIN
    const roleHierarchy = {
      [ProjectRole.CLIENT]: 1,
      [ProjectRole.DESIGNER]: 2,
      [ProjectRole.ADMIN]: 3,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }
}