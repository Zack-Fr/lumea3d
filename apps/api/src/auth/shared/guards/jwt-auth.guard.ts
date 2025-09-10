import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

/**
 * JWT Authentication Guard
 * Validates JWT tokens on protected routes
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: any) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    console.log('🔍 JWT_GUARD: Processing authentication request');
    console.log('🔍 JWT_GUARD: Request URL:', request.url);
    console.log('🔍 JWT_GUARD: Method:', request.method);
    console.log('🔍 JWT_GUARD: Auth header present:', !!authHeader);
    console.log('🔍 JWT_GUARD: Auth header preview:', authHeader ? authHeader.substring(0, 50) + '...' : 'NONE');
    console.log('🔍 JWT_GUARD: Error:', err ? err.message : 'none');
    console.log('🔍 JWT_GUARD: User found:', !!user);
    console.log('🔍 JWT_GUARD: Info:', info ? info.message || info.name || info : 'none');
    
    // Handle JWT-specific errors
    if (info instanceof TokenExpiredError) {
      console.log('❌ JWT_GUARD: Token expired');
      throw new UnauthorizedException('Token has expired');
    }
    
    if (info instanceof JsonWebTokenError) {
      console.log('❌ JWT_GUARD: Invalid token format');
      throw new UnauthorizedException('Invalid token');
    }
    
    if (err) {
      console.log('❌ JWT_GUARD: Authentication error:', err.message);
      throw new UnauthorizedException('Authentication failed');
    }
    
    if (!user) {
      console.log('❌ JWT_GUARD: No user found after token validation');
      throw new UnauthorizedException('Authentication failed');
    }
    
    console.log('✅ JWT_GUARD: Authentication successful for user:', user.email);
    return user;
  }
}
