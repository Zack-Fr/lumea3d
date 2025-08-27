import { 
  Injectable, 
  ConflictException, 
  UnauthorizedException,
  NotFoundException 
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleEnum } from '@lumea/shared';
import {Role as PrismaRole} from '@prisma/client';

export interface RegisterDto {
  email: string;
  password: string;
  displayName: string;
  role?: RoleEnum;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  email: string;
  displayName: string;
  role: RoleEnum;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Authentication Service
 * Handles user registration, login, token management, and password validation
 */
@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<AuthTokens> {
    const { email, password, displayName, role = RoleEnum.CLIENT } = registerDto;

    // Check if user already exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await argon2Hash(password);

    // Create the user - role values now match between shared and Prisma
    const user = await this.prismaService.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        displayName,
        role: role as PrismaRole,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate tokens directly - no mapping needed
    return this.generateTokens(user as UserResponse);
  }

  /**
   * Login user with email and password
   */
  async login(loginDto: LoginDto): Promise<AuthTokens> {
    const { email, password } = loginDto;

    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  /**
   * Validate user credentials (used by LocalStrategy)
   */
  async validateUser(email: string, password: string): Promise<UserResponse | null> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        passwordHash: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // Verify password
    const isPasswordValid = await argon2Verify(user.passwordHash, password);
    if (!isPasswordValid) {
      return null;
    }

    // Remove password from response - roles are now canonical
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword as UserResponse;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return this.generateTokens(user as UserResponse);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user as UserResponse;
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(user: UserResponse): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
  
}