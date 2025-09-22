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
export class ScenesAuthGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private authz: AuthzService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any; // Set by JwtAuthGuard
    const sceneId = request.params.sceneId;

    if (!user || !user.id) {
      throw new ForbiddenException('Missing authentication');
    }

    if (!sceneId || typeof sceneId !== 'string') {
      throw new ForbiddenException('Missing or invalid scene ID');
    }

    // Get the scene and its project
    const scene = await this.prisma.scene3D.findUnique({
      where: { id: sceneId },
      select: { projectId: true },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    // Check if user has access to the project
    const hasAccess = await this.authz.userHasProjectAccess(
      user.id,
      scene.projectId,
      request.method,
    );

    if (!hasAccess) {
      throw new ForbiddenException('Insufficient permissions for this scene');
    }

    // Store scene info in request for controllers to use
    (request as any).sceneContext = {
      sceneId,
      projectId: scene.projectId,
    };

    return true;
  }
}