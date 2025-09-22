/**
 * Authentication Diagnostics Utility
 * Tests the entire authentication flow from frontend to backend
 */

import { scenesApi, updateApiClientToken } from '../services/scenesApi';

export interface AuthDiagnostics {
  environment: {
    viteApiUrl: string | undefined;
    apiBaseUrl: string;
    currentHost: string;
  };
  localStorage: {
    hasToken: boolean;
    tokenPreview: string | null;
    hasUser: string | null;
    tokenLength: number;
  };
  apiClient: {
    currentTokenSet: boolean;
    tokenPreview: string | null;
  };
  networkTest: {
    withoutAuth: {
      status: number;
      message: string;
    };
    withAuth: {
      status: number;
      message: string;
      authHeaderSent: boolean;
    };
  };
  tokenValidation: {
    isValidJWT: boolean;
    payload: any;
    expired: boolean;
    malformed: boolean;
  };
}

export async function runAuthDiagnostics(projectId: string): Promise<AuthDiagnostics> {
  console.log('🔍 Starting comprehensive authentication diagnostics...');

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  
  const results: AuthDiagnostics = {
    environment: {
      viteApiUrl: import.meta.env.VITE_API_URL,
      apiBaseUrl: API_BASE_URL,
      currentHost: window.location.origin,
    },
    localStorage: {
      hasToken: false,
      tokenPreview: null,
      hasUser: null,
      tokenLength: 0,
    },
    apiClient: {
      currentTokenSet: false,
      tokenPreview: null,
    },
    networkTest: {
      withoutAuth: {
        status: 0,
        message: '',
      },
      withAuth: {
        status: 0,
        message: '',
        authHeaderSent: false,
      },
    },
    tokenValidation: {
      isValidJWT: false,
      payload: null,
      expired: false,
      malformed: false,
    },
  };

  // 0. Check environment configuration
  console.log('🌍 Checking environment configuration...');
  console.log('🌍 Environment results:', results.environment);

  // 1. Check localStorage
  console.log('📋 Checking localStorage...');
  const storedToken = localStorage.getItem('lumea_auth_token');
  const storedUser = localStorage.getItem('lumea_auth_user');
  
  results.localStorage.hasToken = !!storedToken;
  results.localStorage.tokenPreview = storedToken ? storedToken.substring(0, 30) + '...' : null;
  results.localStorage.hasUser = storedUser;
  results.localStorage.tokenLength = storedToken?.length || 0;

  console.log('📋 localStorage results:', results.localStorage);

  // 2. Check if token is valid JWT
  if (storedToken) {
    console.log('🔍 Validating JWT structure...');
    try {
      const parts = storedToken.split('.');
      if (parts.length === 3) {
        results.tokenValidation.isValidJWT = true;
        
        // Decode payload (without verification)
        const payload = JSON.parse(atob(parts[1]));
        results.tokenValidation.payload = payload;
        
        // Check if expired
        const now = Math.floor(Date.now() / 1000);
        results.tokenValidation.expired = payload.exp < now;
        
        console.log('🔍 JWT payload:', {
          sub: payload.sub,
          email: payload.email,
          exp: new Date(payload.exp * 1000).toISOString(),
          expired: results.tokenValidation.expired,
        });
      } else {
        results.tokenValidation.malformed = true;
      }
    } catch (error) {
      console.error('❌ JWT parsing error:', error);
      results.tokenValidation.malformed = true;
    }
  }

  // 3. Test API client token state
  console.log('🔧 Checking API client token state...');
  // Update the token in API client
  if (storedToken) {
    updateApiClientToken(storedToken);
  }

  // 4. Test network requests
  console.log('🌐 Testing network requests...');

  // Test without auth first
  try {
    const apiBaseUrl = import.meta?.env?.VITE_API_URL || 'http://192.168.1.10:3000';
    const responseWithoutAuth = await fetch(`${apiBaseUrl}/projects/${projectId}/scenes`);
    results.networkTest.withoutAuth.status = responseWithoutAuth.status;
    results.networkTest.withoutAuth.message = responseWithoutAuth.statusText;
    console.log('🌐 Request without auth:', results.networkTest.withoutAuth);
  } catch (error) {
    console.error('❌ Network test without auth failed:', error);
    results.networkTest.withoutAuth.message = error instanceof Error ? error.message : String(error);
  }

  // Test with auth
  if (storedToken) {
    try {
      const headers = {
        'Authorization': `Bearer ${storedToken}`,
        'Content-Type': 'application/json',
      };

      console.log('🌐 Sending request with headers:', {
        hasAuth: true,
        tokenPreview: storedToken.substring(0, 30) + '...',
      });

      const apiBaseUrl = import.meta?.env?.VITE_API_URL || 'http://192.168.1.10:3000';
      const responseWithAuth = await fetch(`${apiBaseUrl}/projects/${projectId}/scenes`, {
        headers,
      });

      results.networkTest.withAuth.status = responseWithAuth.status;
      results.networkTest.withAuth.message = responseWithAuth.statusText;
      results.networkTest.withAuth.authHeaderSent = true;

      console.log('🌐 Request with auth:', results.networkTest.withAuth);

      // If still 401, check response body for details
      if (responseWithAuth.status === 401) {
        const errorBody = await responseWithAuth.text();
        console.log('❌ 401 Error body:', errorBody);
      }

    } catch (error) {
      console.error('❌ Network test with auth failed:', error);
      results.networkTest.withAuth.message = error instanceof Error ? error.message : String(error);
    }
  }

  // 5. Test using scenesApi.getScenes
  console.log('🎯 Testing scenesApi.getScenes...');
  try {
    const scenes = await scenesApi.getScenes(projectId);
    console.log('✅ scenesApi.getScenes success:', scenes);
  } catch (error) {
    console.error('❌ scenesApi.getScenes failed:', error);
  }

  console.log('🔍 Complete diagnostics results:', results);
  return results;
}

// Helper function to run diagnostics and display in console
export function diagnoseAuth(projectId: string) {
  console.log('🚀 Running authentication diagnostics...');
  runAuthDiagnostics(projectId)
    .then(results => {
      console.log('\n=== AUTHENTICATION DIAGNOSTICS COMPLETE ===');
      console.log('\n🌍 Environment Configuration:');
      console.table({
        'VITE_API_URL': results.environment.viteApiUrl || 'NOT SET',
        'Resolved API Base': results.environment.apiBaseUrl || 'EMPTY',
        'Frontend Host': results.environment.currentHost,
      });
      
      console.log('\n🔐 Authentication Status:');
      console.table({
        'Token in localStorage': results.localStorage.hasToken ? '✅' : '❌',
        'Token length': results.localStorage.tokenLength,
        'Valid JWT structure': results.tokenValidation.isValidJWT ? '✅' : '❌',
        'Token expired': results.tokenValidation.expired ? '❌ EXPIRED' : '✅',
        'Token malformed': results.tokenValidation.malformed ? '❌ MALFORMED' : '✅',
        'Request without auth': results.networkTest.withoutAuth.status === 401 ? '✅ Properly blocked' : '❌',
        'Request with auth': results.networkTest.withAuth.status === 200 ? '✅ Success' : `❌ Status: ${results.networkTest.withAuth.status}`,
      });

      if (results.tokenValidation.payload) {
        console.log('\n🔍 Token payload:');
        console.table({
          'User ID': results.tokenValidation.payload.sub,
          'Email': results.tokenValidation.payload.email,
          'Role': results.tokenValidation.payload.role,
          'Issued': new Date(results.tokenValidation.payload.iat * 1000).toLocaleString(),
          'Expires': new Date(results.tokenValidation.payload.exp * 1000).toLocaleString(),
        });
      }
    })
    .catch(error => {
      console.error('❌ Diagnostics failed:', error);
    });
}

// Make it globally available for browser console testing
(window as any).diagnoseAuth = diagnoseAuth;
