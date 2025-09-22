import { UsersApi, ProjectsApi } from '@lumea/api-client';
import { Configuration } from '@lumea/api-client';
import { once as logOnce, log } from '../utils/logger';

// API Response Types
export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  role: 'GUEST' | 'CLIENT' | 'DESIGNER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardProject {
  id: string;
  name: string;
  userId: string;
  thumbnailUrl?: string;
  customThumbnailUrl?: string;
  thumbnailUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
  scenes3D: Array<{
    id: string;
    name: string;
    version: number;
    createdAt: string;
    updatedAt: string;
  }>;
  _count: {
    members: number;
  };
}

export interface UserStats {
  totalProjects: number;
  completedProjects: number;
  activeClients: number;
  totalEarnings: string;
  rating: number;
  experience: number;
  level: number;
  nextLevelExp: number;
}

export interface DashboardApiService {
  getUserProfile(): Promise<UserProfile>;
  getUserProjects(): Promise<DashboardProject[]>;
  getUserStats(): Promise<UserStats>;
}

export class DashboardApiServiceImpl implements DashboardApiService {
  private usersApi: UsersApi;
  private projectsApi: ProjectsApi;
  private config: Configuration;

  constructor(basePath?: string) {
    this.config = new Configuration({
      basePath: basePath || (import.meta.env?.VITE_API_URL as string) || '/api',
    });

    this.usersApi = new UsersApi(this.config);
    this.projectsApi = new ProjectsApi(this.config);
  }

  // Method to update the token
  updateToken(token: string | null) {
    logOnce('dashboard:update-token', 'info', '🔐 DASHBOARD_API: Updating token (logged once)');
    log('debug', 'DASHBOARD_API token meta', { hasToken: !!token, tokenLength: token?.length });

    this.config = new Configuration({
      basePath: this.config.basePath,
      accessToken: token || undefined,
    });

    // Recreate API instances with new config
    this.usersApi = new UsersApi(this.config);
    this.projectsApi = new ProjectsApi(this.config);

    logOnce('dashboard:api-recreated', 'info', '🔐 DASHBOARD_API: API instances recreated with new token');
  }

  async getUserProfile(): Promise<UserProfile> {
  logOnce('dashboard:getUserProfile:start', 'info', '🔐 DASHBOARD_API: Making getUserProfile request (logged once)');
  log('debug', 'DASHBOARD_API: Current config accessToken', !!this.config.accessToken);
    
    try {
      // Manually add Authorization header since the generated client doesn't handle it properly
      const headers = this.config.accessToken ? {
        Authorization: `Bearer ${this.config.accessToken}`
      } : {};
      
  log('debug', 'DASHBOARD_API: Request headers', headers);
      const response = await this.usersApi.usersControllerGetCurrentUser({ headers });
  logOnce('dashboard:getUserProfile:success', 'info', '🔐 DASHBOARD_API: getUserProfile success');
      return response.data as UserProfile;
    } catch (error: any) {
      log('error', '🔐 DASHBOARD_API: getUserProfile failed:', error as any);
      log('debug', '🔐 DASHBOARD_API: Error response (debug)', error?.response);

      // Check if it's an authentication error (401)
      if (error?.response?.status === 401) {
        logOnce('dashboard:401', 'warn', '🔐 DASHBOARD_API: 401 error detected (logged once)');
        throw new Error('AUTHENTICATION_FAILED');
      }

      throw new Error('Failed to fetch user profile');
    }
  }

  async getUserProjects(): Promise<DashboardProject[]> {
    try {
      // Manually add Authorization header since the generated client doesn't handle it properly
      const headers = this.config.accessToken ? {
        Authorization: `Bearer ${this.config.accessToken}`
      } : {};
      
  log('debug', 'DASHBOARD_API: getUserProjects request headers', headers);
      const response = await this.projectsApi.projectsControllerFindAll({ headers });
      return response.data as DashboardProject[];
    } catch (error: any) {
      console.error('Failed to fetch user projects:', error);

      // Check if it's an authentication error (401)
      if (error?.response?.status === 401) {
        throw new Error('AUTHENTICATION_FAILED');
      }

      throw new Error('Failed to fetch user projects');
    }
  }

  async getUserStats(): Promise<UserStats> {
    try {
      // Note: This endpoint is Admin-only, so we'll calculate stats from projects data instead
      const projects = await this.getUserProjects();

      // Calculate basic stats from projects data
      const totalProjects = projects.length;
      const completedProjects = projects.filter(p => p.scenes3D && p.scenes3D.length > 0).length;
      const activeClients = new Set(projects.map(p => p.userId)).size;

      // Mock data for fields not available in current API
      return {
        totalProjects,
        completedProjects,
        activeClients,
        totalEarnings: '$0', // Not available in current API
        rating: 0, // Not available in current API
        experience: 0, // Not available in current API
        level: 1, // Not available in current API
        nextLevelExp: 1000, // Not available in current API
      };
    } catch (error: any) {
      console.error('Failed to fetch user stats:', error);

      // Check if it's an authentication error (401) from getUserProjects
      if (error?.message === 'AUTHENTICATION_FAILED' || error?.response?.status === 401) {
        throw new Error('AUTHENTICATION_FAILED');
      }

      throw new Error('Failed to fetch user stats');
    }
  }
}

// Factory function to create the service
export const createDashboardApiService = (basePath?: string): DashboardApiService => {
  return new DashboardApiServiceImpl(basePath);
};

// Global instance for token management
let dashboardApiInstance: DashboardApiServiceImpl | null = null;

export const getDashboardApiService = (): DashboardApiServiceImpl => {
  if (!dashboardApiInstance) {
    dashboardApiInstance = new DashboardApiServiceImpl();
  }
  return dashboardApiInstance;
};

export const updateDashboardApiToken = (token: string | null) => {
  logOnce('dashboard:global:updateToken', 'info', '🔐 DASHBOARD_API_GLOBAL: updateDashboardApiToken called (logged once)');
  log('debug', 'DASHBOARD_API_GLOBAL token meta', { hasToken: !!token, tokenLength: token?.length });
  
  const instance = getDashboardApiService();
  instance.updateToken(token);
};