import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@lumea/shared';

/**
 * Decorator to extract the current user from the request
 * Used in authenticated endpoints to get the user making the request
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);