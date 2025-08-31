import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

interface AuthenticatedSocket extends Socket {
  userId: string;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: AuthenticatedSocket = context.switchToWs().getClient();
    
    try {
      // Extract token from handshake auth or query
      const token = this.extractTokenFromClient(client);
      
      if (!token) {
        client.emit('error', { 
          type: 'AUTHENTICATION_REQUIRED',
          message: 'JWT token required',
          timestamp: Date.now(),
        });
        return false;
      }

      // Verify and decode token
      const payload = this.jwtService.verify(token);
      
      // Attach user info to socket
      client.userId = payload.sub;
      
      return true;
    } catch (error) {
      client.emit('error', {
        type: 'AUTHENTICATION_FAILED', 
        message: 'Invalid or expired token',
        timestamp: Date.now(),
      });
      return false;
    }
  }

  private extractTokenFromClient(client: Socket): string | null {
    // Try to get token from authorization header in handshake
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query parameters
    const tokenFromQuery = client.handshake.query.token;
    if (typeof tokenFromQuery === 'string') {
      return tokenFromQuery;
    }

    // Try to get token from auth object
    const tokenFromAuth = client.handshake.auth?.token;
    if (typeof tokenFromAuth === 'string') {
      return tokenFromAuth;
    }

    return null;
  }
}