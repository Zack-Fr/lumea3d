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
    // Input validation
    if (!userId || typeof userId !== 'string') {
      console.log('❌ AuthzService: Invalid userId:', userId);
      return false;
    }
    if (!projectId || typeof projectId !== 'string') {
      console.log('❌ AuthzService: Invalid projectId:', projectId);
      return false;
    }

    console.log('🔍 AuthzService: Checking access for user:', userId, 'project:', projectId, 'method:', method);

    const member = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
      select: { role: true },
    });

    console.log('🔍 AuthzService: Membership lookup result:', member);

    if (!member) {
      console.log('❌ AuthzService: User is not a member of this project');
      return false;
    }

    const isRead = ['GET', 'HEAD'].includes(method.toUpperCase());
    
    // All roles can read
    if (isRead) {
      console.log('✅ AuthzService: Read access granted');
      return true;
    }

    // Only DESIGNER and ADMIN can write
    const canWrite = member.role === ProjectRole.DESIGNER || member.role === ProjectRole.ADMIN;
    console.log('🔍 AuthzService: Write access check - Role:', member.role, 'Can write:', canWrite);
    
    return canWrite;
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