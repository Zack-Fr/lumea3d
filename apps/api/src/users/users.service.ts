import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@lumea/shared';
import * as argon2 from 'argon2';

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role?: Role;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  role?: Role;
  isActive?: boolean;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListResponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  role?: Role;
  search?: string;
  isActive?: boolean;
}

/**
 * Users Service
 * Handles user management operations including CRUD, role management, and profile updates
 */
@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Create a new user (Admin only)
   */
  async createUser(createUserDto: CreateUserDto): Promise<UserResponse> {
    const { email, password, name, role = Role.CLIENT } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await argon2.hash(password);

    // Create the user
    const user = await this.prismaService.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Get all users with pagination and filtering (Admin only)
   */
  async getUsers(query: GetUsersQuery): Promise<UserListResponse> {
    const {
      page = 1,
      limit = 10,
      role,
      search,
      isActive,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (role) {
      where.role = role;
    }
    
    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get users and total count
    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a user by ID
   */
  async getUserById(userId: string): Promise<UserResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile (Users can update their own profile, Admins can update any)
   */
  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    currentUserId: string,
    currentUserRole: Role,
  ): Promise<UserResponse> {
    // Check if user exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Authorization check
    const isOwnProfile = userId === currentUserId;
    const isAdmin = currentUserRole === Role.ADMIN;

    if (!isOwnProfile && !isAdmin) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Role change validation - only admins can change roles
    if (updateUserDto.role && !isAdmin) {
      throw new ForbiddenException('Only administrators can change user roles');
    }

    // Active status change validation - only admins can change active status
    if (typeof updateUserDto.isActive === 'boolean' && !isAdmin) {
      throw new ForbiddenException('Only administrators can change user active status');
    }

    // Email uniqueness check
    if (updateUserDto.email) {
      const emailExists = await this.prismaService.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists && emailExists.id !== userId) {
        throw new ConflictException('Email is already taken');
      }
    }

    // Update the user
    const updatedUser = await this.prismaService.user.update({
      where: { id: userId },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Get user with password
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await argon2.verify(user.password, currentPassword);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await argon2.hash(newPassword);

    // Update password
    await this.prismaService.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Delete user (Admin only)
   */
  async deleteUser(userId: string, currentUserId: string): Promise<{ message: string }> {
    // Check if user exists
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent self-deletion
    if (userId === currentUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    // Delete the user
    await this.prismaService.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }

  /**
   * Get user statistics (Admin only)
   */
  async getUserStats() {
    const [totalUsers, activeUsers, roleStats] = await Promise.all([
      this.prismaService.user.count(),
      this.prismaService.user.count({ where: { isActive: true } }),
      this.prismaService.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
    ]);

    const roleDistribution = roleStats.reduce((acc, stat) => {
      acc[stat.role] = stat._count.role;
      return acc;
    }, {} as Record<Role, number>);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      roleDistribution,
    };
  }
}