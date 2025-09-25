/**
 * Authentication API Wrapper
 * Provides utilities to easily wrap existing API services with authentication error handling
 */

import { handleApiError } from './apiErrorHandler';

/**
 * Higher-order function that wraps an entire API service object with auth error handling
 * This allows you to wrap existing API services without modifying each method individually
 */
export function withAuthErrorHandling<T extends Record<string, any>>(
  apiService: T,
  serviceName: string
): T {
  const wrappedService = {} as T;

  for (const [key, value] of Object.entries(apiService)) {
    if (typeof value === 'function') {
      // Wrap function methods
      wrappedService[key as keyof T] = (async (...args: any[]) => {
        try {
          return await value.apply(apiService, args);
        } catch (error) {
          // Handle auth errors for this specific method
          handleApiError(error, `${serviceName}.${key}`);
          throw error; // Re-throw for normal error handling
        }
      }) as any;
    } else {
      // Pass through non-function properties
      wrappedService[key as keyof T] = value;
    }
  }

  return wrappedService;
}

/**
 * Decorator function to wrap individual async methods
 * Usage: const wrappedMethod = withMethodAuthHandling(originalMethod, 'methodName');
 */
export function withMethodAuthHandling<T extends (...args: any[]) => Promise<any>>(
  method: T,
  methodName: string
): T {
  return (async (...args: any[]) => {
    try {
      return await method(...args);
    } catch (error) {
      handleApiError(error, methodName);
      throw error;
    }
  }) as T;
}

/**
 * Wrapper for fetch-based API calls that handles both response errors and thrown errors
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
  context?: string
): Promise<Response> {
  try {
    const response = await fetch(input, init);
    
    // Check for auth errors in successful fetch but HTTP error status
    if (response.status === 401 || response.status === 403) {
      const error = {
        status: response.status,
        statusCode: response.status,
        message: `Authentication error: ${response.statusText}`,
        url: typeof input === 'string' ? input : input.toString()
      };
      
      handleApiError(error, context);
    }
    
    return response;
  } catch (error) {
    // Handle network or other fetch errors
    console.error(`Network error in ${context || 'fetch'}:`, error);
    throw error;
  }
}

/**
 * Create a wrapped version of an existing API object
 * This is useful for gradually migrating existing services
 */
export function createAuthAwareApi<T extends Record<string, any>>(
  originalApi: T,
  serviceName: string
): T {
  console.log(`🔐 AUTH_WRAPPER: Creating auth-aware wrapper for ${serviceName}`);
  return withAuthErrorHandling(originalApi, serviceName);
}

/**
 * Batch wrapper for multiple API services
 * Usage: const [wrappedScenesApi, wrappedProjectsApi] = wrapMultipleServices(
 *   [scenesApi, 'scenesApi'],
 *   [projectsApi, 'projectsApi']
 * );
 */
export function wrapMultipleServices<T extends Record<string, any>[]>(
  ...services: Array<[T[number], string]>
): T {
  return services.map(([service, name]) => 
    withAuthErrorHandling(service, name)
  ) as T;
}