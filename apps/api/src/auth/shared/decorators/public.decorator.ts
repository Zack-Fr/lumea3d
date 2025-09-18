import { SetMetadata } from '@nestjs/common';

/**
 * Key used to mark routes as public (no authentication required)
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark routes as public (no authentication required).
 * 
 * Usage:
 * ```typescript
 * @Public()
 * @Get('some-endpoint')
 * async someEndpoint() {
 *   // This endpoint can be accessed without authentication
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);