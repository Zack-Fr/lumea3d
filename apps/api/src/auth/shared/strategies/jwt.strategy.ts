import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * JWT Strategy for token-based authentication
 * Validates JWT tokens and loads user from database
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    
    console.log('🔧 JwtStrategy Config:');
    console.log('JWT_SECRET loaded successfully:', !!jwtSecret);
    console.log('JWT_SECRET length:', jwtSecret?.length || 0);
    
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in JwtStrategy');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    console.log('🔍 JWT Strategy validate() called');
    console.log('Payload received:', JSON.stringify(payload, null, 2));
    
    try {
      // Load fresh user data from database to ensure user still exists and is active
      console.log('Looking up user with ID:', payload.sub);
      
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

      console.log('Database lookup result:', user ? 'User found' : 'User not found');
      
      if (!user) {
        console.log('❌ User not found in database - returning null');
        return null; // Will trigger UnauthorizedException
      }
      
      if (!user.isActive) {
        console.log('❌ User is inactive - returning null');
        return null; // Will trigger UnauthorizedException
      }

      console.log('✅ User validation successful:', user.email);
      return user;
      
    } catch (error) {
      console.log('❌ Error in JWT validation:', error.message);
      return null;
    }
  }
}