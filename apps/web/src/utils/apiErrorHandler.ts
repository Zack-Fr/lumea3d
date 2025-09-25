/**
 * Global API Error Handler
 * Handles authentication expiry by intercepting 401/403 responses
 * and automatically triggering the auth expiry handler
 */

import { PATHS } from '@/app/paths';

export interface AuthErrorHandler {
  onAuthenticationError: () => void;
}

let authErrorHandler: AuthErrorHandler | null = null;

/**
 * Register the authentication error handler
 * This should be called from the AuthProvider
 */
export function registerAuthErrorHandler(handler: AuthErrorHandler) {
  authErrorHandler = handler;
  console.log('API_ERROR_HANDLER: Auth error handler registered');
}

/**
 * Unregister the authentication error handler
 */
export function unregisterAuthErrorHandler() {
  authErrorHandler = null;
  console.log('API_ERROR_HANDLER: Auth error handler unregistered');
}

/**
 * Handle API errors, particularly authentication errors
 * This can be used to wrap API calls or check Response objects
 */
export function handleApiError(error: any, context?: string): void {
  // Check if it's an authentication error
  const isAuthError = (
    (error?.statusCode === 401 || error?.statusCode === 403) ||
    (error?.status === 401 || error?.status === 403) ||
    (typeof error === 'object' && error?.message && 
    (error.message.includes('Token has expired') || 
      error.message.includes('Authentication failed') ||
      error.message.includes('Unauthorized')))
  );

  if (isAuthError) {
    console.warn('API_ERROR_HANDLER: Authentication error detected', {
      context: context || 'Unknown',
      statusCode: error?.statusCode || error?.status,
      message: error?.message,
      timestamp: new Date().toISOString()
    });

    // Trigger authentication expiry handling
    if (authErrorHandler) {
      console.log('API_ERROR_HANDLER: Triggering authentication error handler');
      authErrorHandler.onAuthenticationError();
    } else {
      console.warn('API_ERROR_HANDLER: No auth error handler registered, falling back to manual redirect');
      // Fallback: redirect directly if no handler is registered
      window.location.href = PATHS.landing;
    }
  }
}

/**
 * Wrapper for fetch calls to automatically handle auth errors
 * Use this to wrap existing fetch calls in your API services
 */
export async function fetchWithAuthErrorHandling(
  input: RequestInfo | URL,
  init?: RequestInit,
  context?: string
): Promise<Response> {
  try {
    const response = await fetch(input, init);
    
    // Check for auth errors in the response
    if (response.status === 401 || response.status === 403) {
      const error = {
        status: response.status,
        statusCode: response.status,
        message: `HTTP ${response.status}: ${response.statusText}`,
        url: typeof input === 'string' ? input : input.toString()
      };
      
      handleApiError(error, context);
    }
    
    return response;
  } catch (error) {
    // Handle network errors or other fetch errors
    console.error(`API_ERROR_HANDLER: Network error in ${context || 'fetch'}:`, error);
    throw error;
  }
}

/**
 * Wrapper for API calls that throw custom error objects
 * This is useful for existing API services that throw SceneApiError, AuthApiError, etc.
 */
export function wrapApiCall<T>(
  apiCall: () => Promise<T>,
  context?: string
): Promise<T> {
  return apiCall().catch((error) => {
    // Handle the error with our auth error handler
    handleApiError(error, context);
    
    // Re-throw the error for normal error handling
    throw error;
  });
}

/**
 * Check if the current token appears to be expired
 * This is a client-side check and should not be relied upon for security
 */
export function isTokenExpired(token: string): boolean {
  if (!token) return true;
  
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    
    // Consider token expired if it expires within the next 30 seconds
    // This provides a small buffer to account for clock skew
    return now >= (expiryTime - 30000);
  } catch (error) {
    console.warn('API_ERROR_HANDLER: Could not decode token to check expiry', error);
    return true; // Assume expired if we can't decode it
  }
}

/**
 * Proactively check token expiry before making API calls
 * This can prevent unnecessary API calls with expired tokens
 */
export function validateTokenBeforeApiCall(token: string | null, context?: string): boolean {
  if (!token) {
    console.log(`API_ERROR_HANDLER: No token available for ${context || 'API call'}`);
    if (authErrorHandler) {
      authErrorHandler.onAuthenticationError();
    }
    return false;
  }
  
  if (isTokenExpired(token)) {
    console.log(`API_ERROR_HANDLER: Token is expired for ${context || 'API call'}`);
    if (authErrorHandler) {
      authErrorHandler.onAuthenticationError();
    }
    return false;
  }
  
  return true;
}