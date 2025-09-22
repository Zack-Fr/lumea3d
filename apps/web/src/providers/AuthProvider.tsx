import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react'
import { once as logOnce, log } from '../utils/logger'
import { api } from '../services/authApi'
import { updateApiClientToken } from '../services/scenesApi'
import { updateAssetApiToken } from '../services/assetsApi'
import { updateDashboardApiToken } from '../services/dashboardApi'

export enum RoleEnum {
  GUEST = 'GUEST',
  DESIGNER = 'DESIGNER', 
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT'
}
export type Role = RoleEnum

export interface User {
  id: string
  email: string
  displayName: string
  role: Role
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  clearError: () => void
  error: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

const AUTH_TOKEN_KEY = 'lumea_auth_token'
const AUTH_USER_KEY = 'lumea_auth_user'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
const [state, setState] = useState<AuthState>(() => {
  try {
    const token = localStorage.getItem('lumea_auth_token');
    const userJson = localStorage.getItem('lumea_auth_user');
    
    const looksValid = !!userJson && userJson !== 'undefined' && userJson !== 'null';
    if (token && looksValid) {
      const user = JSON.parse(userJson!) as User;
      return { user, token, isAuthenticated: true, isLoading: false };
    }
    // clear junk and start unauthenticated
    localStorage.removeItem('lumea_auth_token');
    localStorage.removeItem('lumea_auth_user');
    return { user: null, token: null, isAuthenticated: false, isLoading: false };
  } catch (error) {
    console.error('Auth initialization error:', error);
    localStorage.removeItem('lumea_auth_token');
    localStorage.removeItem('lumea_auth_user');
    return { user: null, token: null, isAuthenticated: false, isLoading: false };
  }
});
  
  const [error, setError] = useState<string | null>(null)
  const setAuthData = (user: User, token: string) => {
    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    })
    
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  }

  // Update API client token whenever auth token changes
  useEffect(() => {

    // Additional debugging for authentication issues
    console.log('🔐 Auth token updated:', {
      hasToken: !!state.token,
      tokenPreview: state.token ? state.token.substring(0, 20) + '...' : 'NULL',
      userId: state.user?.id,
      userEmail: state.user?.email,
      timestamp: new Date().toISOString()
    });

    if (state.token) {
      updateApiClientToken(state.token);
      updateAssetApiToken(state.token);
      updateDashboardApiToken(state.token);
    } else {
      updateApiClientToken(null);
      updateAssetApiToken(null);
      updateDashboardApiToken(null);
    }
  }, [state.token]);

  const clearAuthData = () => {
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    })
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    
    // Clear API tokens
    updateApiClientToken(null)
    updateAssetApiToken(null)
    updateDashboardApiToken(null)
  }

  const login = useCallback (async (email: string, password: string) => {
    try {
      setError(null)
      setState(prev => ({ ...prev, isLoading: true }))

      const data = await api.login({ email, password })
  setAuthData(data.user, data.token)
  logOnce('auth:login-success', 'info', '🔐 LOGIN: Auth data set and stored (logged once)');
  log('debug', 'AUTH: localStorage token preview', localStorage.getItem(AUTH_TOKEN_KEY)?.substring(0, 20) + '...');
  log('debug', 'AUTH: localStorage user', localStorage.getItem(AUTH_USER_KEY));
    } catch (err) {
  log('error', '🔐 LOGIN: Login failed:', err as any);
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      setState(prev => ({ ...prev, isLoading: false }))
      throw err
    }
  }, [])

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      setError(null)
      setState(prev => ({ ...prev, isLoading: true }))

      const data = await api.register({ email, password, displayName })
      setAuthData(data.user, data.token)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      setState(prev => ({ ...prev, isLoading: false }))
      throw err
    }
  },[])

  const logout = useCallback(() => {
    clearAuthData()
    setError(null)
  },[])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: AuthContextType = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    clearError,
    error,
  }), [state, login, register, logout, clearError, error])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useUser(): User | null {
  const { user } = useAuth()
  return user
}

export function useRequireAuth(): User {
  const { user, isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    throw new Error('Auth is still loading')
  }
  
  if (!isAuthenticated || !user) {
    throw new Error('User must be authenticated')
  }
  
  return user
}