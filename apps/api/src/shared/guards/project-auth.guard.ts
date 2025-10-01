import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthzService } from '../services/authz.service';

@Injectable()
export class ProjectAuthGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private authz: AuthzService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any; // Set by JwtAuthGuard
    const body = request.body as any;

    console.log('🔐 ProjectAuthGuard: Checking access');
    console.log('🔐 ProjectAuthGuard: User:', user ? { id: user.id, email: user.email } : 'NO_USER');
    console.log('🔐 ProjectAuthGuard: Request body:', body);
    console.log('🔐 ProjectAuthGuard: Method:', request.method);

    if (!user || !user.id) {
      console.log('❌ ProjectAuthGuard: Missing authentication');
      throw new ForbiddenException('Missing authentication');
    }

    // For create operations, get projectId from request body
    const projectId = body?.projectId;
    console.log('🔐 ProjectAuthGuard: Project ID from body:', projectId);
    
    if (!projectId || typeof projectId !== 'string') {
      console.log('❌ ProjectAuthGuard: Missing or invalid project ID');
      throw new ForbiddenException('Missing or invalid project ID in request body');
    }

    // Check if user has access to the project
    console.log('🔐 ProjectAuthGuard: Checking user access for project:', projectId);
    const hasAccess = await this.authz.userHasProjectAccess(
      user.id,
      projectId,
      request.method,
    );

    console.log('🔐 ProjectAuthGuard: Access result:', hasAccess);

    if (!hasAccess) {
      console.log('❌ ProjectAuthGuard: Insufficient permissions');
      throw new ForbiddenException('Insufficient permissions for this project');
    }

    console.log('✅ ProjectAuthGuard: Access granted');

    // Store project info in request for controllers to use
    (request as any).projectContext = {
      projectId,
    };

    return true;
  }
}