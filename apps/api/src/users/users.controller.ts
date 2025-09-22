import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { 
  UsersService, 
  CreateUserDto, 
  UpdateUserDto, 
  ChangePasswordDto,
  UserResponse,
  UserListResponse,
  GetUsersQuery
} from './users.service';
import { Auth } from '../auth/shared/decorators/auth.decorator';
import { CurrentUser } from '../auth/shared/decorators/current-user.decorator';
import { RoleEnum } from '@lumea/shared';

/**
 * Users Controller
 * Handles user management endpoints with role-based access control
 */
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create a new user (Admin only)
   */
  @Auth(RoleEnum.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
    type: Object,
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Admin role required',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
        name: { type: 'string' },
        role: { type: 'string', enum: ['GUEST', 'CLIENT', 'DESIGNER', 'ADMIN'] },
      },
      required: ['email', 'password', 'name'],
    },
  })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserResponse> {
    return this.usersService.createUser(createUserDto);
  }

  /**
   * Get all users with pagination and filtering (Admin only)
   */
  @Auth(RoleEnum.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all users with pagination and filtering (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: Object,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Admin role required',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'role', required: false, enum: RoleEnum, description: 'Filter by role' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name or email' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  async getUsers(
    @Query('page', new ValidationPipe({ transform: true })) page?: number,
    @Query('limit', new ValidationPipe({ transform: true })) limit?: number,
    @Query('role') role?: RoleEnum,
    @Query('search') search?: string,
    @Query('isActive', new ValidationPipe({ transform: true })) isActive?: boolean,
  ): Promise<UserListResponse> {
    const query: GetUsersQuery = { page, limit, role, search, isActive };
    return this.usersService.getUsers(query);
  }

  /**
   * Get current user profile
   */
  @Auth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: Object,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getCurrentUser(@CurrentUser() user: UserResponse): Promise<UserResponse> {
    return this.usersService.getUserById(user.id);
  }

  /**
   * Update current user profile
   */
  @Auth()
  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already taken',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        name: { type: 'string' },
      },
    },
  })
  async updateCurrentUser(
    @CurrentUser() user: UserResponse,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.usersService.updateUser(user.id, updateUserDto, user.id, user.role);
  }

  /**
   * Change current user password
   */
  @Auth()
  @Put('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Current password is incorrect',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        currentPassword: { type: 'string' },
        newPassword: { type: 'string', minLength: 8 },
      },
      required: ['currentPassword', 'newPassword'],
    },
  })
  async changePassword(
    @CurrentUser() user: UserResponse,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.usersService.changePassword(user.id, changePasswordDto);
  }

  /**
   * Get user statistics (Admin only)
   */
  @Auth(RoleEnum.ADMIN)
  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    type: Object,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Admin role required',
  })
  async getUserStats() {
    return this.usersService.getUserStats();
  }

  /**
   * Get user by ID (Admin only or own profile)
   */
  @Auth()
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (Admin only or own profile)' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getUserById(
    @Param('id', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: UserResponse,
  ): Promise<UserResponse> {
    // Users can only view their own profile unless they're admin
    if (userId !== currentUser.id && currentUser.role !== RoleEnum.ADMIN) {
      throw new Error('Access denied');
    }
    return this.usersService.getUserById(userId);
  }

  /**
   * Update user by ID (Admin only)
   */
  @Auth(RoleEnum.ADMIN)
  @Put(':id')
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Admin role required',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already taken',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        name: { type: 'string' },
        role: { type: 'string', enum: ['GUEST', 'CLIENT', 'DESIGNER', 'ADMIN'] },
        isActive: { type: 'boolean' },
      },
    },
  })
  async updateUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: UserResponse,
  ): Promise<UserResponse> {
    return this.usersService.updateUser(userId, updateUserDto, currentUser.id, currentUser.role);
  }

  /**
   * Delete user by ID (Admin only)
   */
  @Auth(RoleEnum.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Admin role required',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete own account',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async deleteUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: UserResponse,
  ): Promise<{ message: string }> {
    return this.usersService.deleteUser(userId, currentUser.id);
  }
}