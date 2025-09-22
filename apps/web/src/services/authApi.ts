import { Role, User, RoleEnum } from '../providers/AuthProvider'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  displayName?: string
  role?: Role
}

export interface BackendAuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken?: string
}

export interface ApiError {
  message: string
  statusCode: number
  error?: string
}

class AuthApiError extends Error {
  constructor(public statusCode: number, message: string, public error?: string) {
    super(message)
    this.name = 'AuthApiError'
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      let errorData: ApiError
      try {
        errorData = await response.json()
      } catch {
        errorData = {
          message: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        }
      }
      
      throw new AuthApiError(
        errorData.statusCode || response.status,
        errorData.message || 'Request failed',
        errorData.error
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error
    }
    
    // Network or other errors
    throw new AuthApiError(
      0,
      error instanceof Error ? error.message : 'Network error occurred'
    )
  }
}

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    
    // Step 1: Get tokens from login endpoint
    const tokensResponse = await apiRequest<BackendAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // Step 2: Get user profile using the access token
    const userResponse = await apiRequest<User>('/auth/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokensResponse.accessToken}`,
      },
    });
    
    // Step 3: Combine into expected format
    const response: AuthResponse = {
      user: userResponse,
      token: tokensResponse.accessToken,
      refreshToken: tokensResponse.refreshToken
    };
    
    return response;
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    
    // Step 1: Get tokens from register endpoint
    const tokensResponse = await apiRequest<BackendAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...userData,
        role: (userData.role ?? RoleEnum.CLIENT), // Default role as per spec
      }),
    });
    
    // Step 2: Get user profile using the access token
    const userResponse = await apiRequest<User>('/auth/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokensResponse.accessToken}`,
      },
    });
    
    // Step 3: Combine into expected format
    const response: AuthResponse = {
      user: userResponse,
      token: tokensResponse.accessToken,
      refreshToken: tokensResponse.refreshToken
    };
    
    return response;
  },

  async logout(token: string): Promise<void> {
    return apiRequest<void>('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  },

  async getProfile(token: string): Promise<User> {
    return apiRequest<User>('/auth/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },
}

// Mock implementation for development when backend is not available
// export const mockAuthApi = {
//   async login(credentials: LoginRequest): Promise<AuthResponse> {
//     // Simulate API delay
//     await new Promise(resolve => setTimeout(resolve, 1000))
    
//     // Mock validation
//     if (credentials.email === 'demo@lumea.com' && credentials.password === 'demo123') {
//       return {
//         user: {
//           id: '1',
//           email: credentials.email,
//           name: 'Demo User',
//           role: 'designer' as Role,
//           created_at: new Date().toISOString(),
//         },
//         token: 'mock_jwt_token_' + Date.now(),
//       }
//     }
    
//     throw new AuthApiError(401, 'Invalid email or password')
//   },

//   async register(userData: RegisterRequest): Promise<AuthResponse> {
//     // Simulate API delay
//     await new Promise(resolve => setTimeout(resolve, 1200))
    
//     // Mock user creation
//     return {
//       user: {
//         id: String(Date.now()),
//         email: userData.email,
//         name: userData.name || userData.email.split('@')[0],
//         role: (userData.role || 'designer') as Role,
//         created_at: new Date().toISOString(),
//       },
//       token: 'mock_jwt_token_' + Date.now(),
//     }
//   },

//   async logout(): Promise<void> {
//     await new Promise(resolve => setTimeout(resolve, 500))
//   },
// }

// Use mock API in development when VITE_USE_MOCK_API is true
// const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true'

// export const api = useMockApi ? mockAuthApi : authApi
export const api = authApi