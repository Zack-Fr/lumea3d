import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the current user from the request
 * Used in authenticated endpoints to get the user making the request
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // Debug logging
    console.log('CurrentUser decorator called:', {
      requestedProperty: data,
      user: user,
      userKeys: user ? Object.keys(user) : 'user is null/undefined'
    });
    
    if (data && user) {
      const extractedValue = user[data];
      console.log(`Extracted '${data}':`, extractedValue);
      return extractedValue;
    }
    
    return user;
  },
);
