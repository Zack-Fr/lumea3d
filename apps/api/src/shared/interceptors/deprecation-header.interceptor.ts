import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class DeprecationHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest();
    
    // Add deprecation headers
    response.setHeader('Deprecation', 'true');
    response.setHeader('Sunset', 'Wed, 05 Nov 2025 00:00:00 GMT');
    
    // Extract sceneId from the nested route path for Link header
    const sceneId = request.params?.sceneId;
    if (sceneId) {
      // Build successor link based on the endpoint
      const path = request.path;
      let successorPath = '';
      
      if (path.includes('/manifest')) {
        successorPath = `/scenes/${sceneId}/manifest`;
      } else if (path.includes('/delta')) {
        successorPath = `/scenes/${sceneId}/delta`;
      } else if (path.includes('/version')) {
        successorPath = `/scenes/${sceneId}/version`;
      } else if (path.includes('/items/')) {
        const itemId = request.params?.itemId;
        successorPath = `/scenes/${sceneId}/items/${itemId}`;
      } else if (path.includes('/items')) {
        successorPath = `/scenes/${sceneId}/items`;
      } else {
        // Base scene route
        successorPath = `/scenes/${sceneId}`;
      }
      
      if (successorPath) {
        response.setHeader('Link', `<${successorPath}>; rel="successor-version"`);
      }
    }
    
    return next.handle().pipe(
      map((data) => data),
    );
  }
}