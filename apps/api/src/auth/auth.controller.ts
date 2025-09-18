import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  Res,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService, RegisterDto, LoginDto, AuthTokens, UserResponse } from './auth.service';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { CurrentUser } from './shared/decorators/current-user.decorator';
import { Public } from './shared/decorators/auth.decorator';

class RefreshTokenDto {
  refreshToken: string;
}

/**
 * Authentication Controller
 * Handles user registration, login, token refresh, and profile management
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: Object,
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
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
  async register(@Body() registerDto: RegisterDto): Promise<AuthTokens> {
    return this.authService.register(registerDto);
  }

  /**
   * Login with email and password
   */
  @Public()
  // @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: Object,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
      },
      required: ['email', 'password'],
    },
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthTokens> {
    return this.authService.login(loginDto);
  }

  /**
   * Refresh access token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
    type: Object,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string' },
      },
      required: ['refreshToken'],
    },
  })
  async refresh(@Body() { refreshToken }: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refreshTokens(refreshToken);
  }

  /**
   * Get current user profile
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
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
  async getProfile(@CurrentUser() user: UserResponse): Promise<UserResponse> {
    return this.authService.getProfile(user.id);
  }

  /**
   * Logout (client-side token removal)
   * Note: In a JWT implementation, logout is typically handled client-side
   * by removing the tokens from storage. For enhanced security, you could
   * implement a token blacklist mechanism here.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async logout(): Promise<{ message: string }> {
    // In JWT implementation, logout is handled client-side
    // Here we just return a success message
    return { message: 'Successfully logged out' };
  }

  /**
   * Google OAuth login initiation
   */
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth' })
  async googleAuth(@Query('invitation') invitationToken?: string) {
    // This initiates the Google OAuth flow
    // The invitation token will be preserved in the state
  }

  /**
   * Google OAuth callback
   */
  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect with tokens' })
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('state') state?: string
  ) {
    const user = req.user as any;
    
    // Extract invitation token from state if present
    let invitationToken: string | undefined;
    try {
      if (state) {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        invitationToken = stateData.invitation;
      }
    } catch (error) {
      // Invalid state, continue without invitation
    }

    // Handle invitation signup if token is present
    let finalUser = user;
    if (invitationToken) {
      finalUser = await this.authService.handleInvitationSignup({
        email: user.email,
        displayName: user.displayName,
        googleId: user.googleId || user.id,
      }, invitationToken);
    }

    // Generate JWT tokens
    const tokens = await this.authService.generateTokens(finalUser);

    // Redirect to frontend with tokens
    const frontendUrl = process.env.WEB_ORIGIN || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`;
    
    res.redirect(redirectUrl);
  }

  /**
   * Google OAuth login with invitation
   */
  @Public()
  @Get('google/invite/:token')
  @ApiOperation({ summary: 'Google OAuth login with invitation token' })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth with invitation state' })
  async googleAuthWithInvitation(
    @Req() req: Request,
    @Res() res: Response,
    @Param('token') invitationToken: string
  ) {
    // Encode invitation token in state for OAuth callback
    const state = Buffer.from(JSON.stringify({ invitation: invitationToken })).toString('base64');
    
    // Redirect to Google OAuth with state
    const googleAuthUrl = `/auth/google?state=${state}`;
    res.redirect(googleAuthUrl);
  }
}
