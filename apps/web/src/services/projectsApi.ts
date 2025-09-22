// Types for project creation
export interface CreateProjectDto {
  name: string;
  scene?: {
    name?: string;
    spawn?: {
      position?: [number, number, number];
      yaw_deg?: number;
    };
    navmesh_asset_id?: string;
    shell_asset_id?: string;
    exposure?: number;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface ProjectCreationResult {
  projectId: string;
  sceneId: string;
  project: {
    id: string;
    name: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
  };
  scene: {
    id: string;
    name: string;
    version: number;
    createdAt: string;
    updatedAt: string;
  };
  membership: {
    userId: string;
    projectId: string;
    role: 'CLIENT' | 'DESIGNER' | 'ADMIN';
  };
}

export interface ProjectWithScenes {
  id: string;
  name: string;
  userId: string;
  thumbnailUrl?: string;
  customThumbnailUrl?: string;
  thumbnailUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
  scenes3D: {
    id: string;
    name: string;
    version: number;
    createdAt: string;
    updatedAt: string;
  }[];
  _count: {
    members: number;
  };
}

/**
 * Error class for Project API related errors
 */
export class ProjectApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ProjectApiError';
  }
}

/**
 * Generic API request handler for projects
 */
async function projectApiRequest<T>(
  endpoint: string, 
  options: RequestInit,
  token: string
): Promise<T> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Use default error message if JSON parsing fails
      }

      throw new ProjectApiError(errorMessage, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ProjectApiError) {
      throw error;
    }
    throw new ProjectApiError(
      'Network error occurred while communicating with the projects API',
      undefined,
      error as Error
    );
  }
}

/**
 * Projects API service - handles project-level operations
 * 
 * This service provides methods for:
 * - Creating new projects (returns { projectId, sceneId } for direct editor navigation)
 * - Listing user projects
 * - Getting project details
 * - Managing project-scoped collections (scenes, categories)
 */
export const projectsApi = {
  /**
   * Create a new project with auto-membership and initial scene
   * Returns { projectId, sceneId } for direct editor navigation
   */
  async create(dto: CreateProjectDto, token: string): Promise<ProjectCreationResult> {
    return projectApiRequest<ProjectCreationResult>(
      '/projects',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      token
    );
  },

  /**
   * Get all projects where the user is a member
   */
  async getUserProjects(token: string): Promise<ProjectWithScenes[]> {
    return projectApiRequest<ProjectWithScenes[]>(
      '/projects',
      {
        method: 'GET',
      },
      token
    );
  },

  /**
   * Get a specific project by ID (only if user is a member)
   */
  async getProject(projectId: string, token: string): Promise<ProjectWithScenes> {
    return projectApiRequest<ProjectWithScenes>(
      `/projects/${projectId}`,
      {
        method: 'GET',
      },
      token
    );
  },

  /**
   * Get scenes in a project (project-scoped collection)
   */
  async getScenes(projectId: string, token: string): Promise<any[]> {
    return projectApiRequest<any[]>(
      `/projects/${projectId}/scenes`,
      {
        method: 'GET',
      },
      token
    );
  },

  /**
   * Get categories in a project (project-scoped collection)
   */
  async getCategories(projectId: string, token: string): Promise<any[]> {
    return projectApiRequest<any[]>(
      `/projects/${projectId}/categories`,
      {
        method: 'GET',
      },
      token
    );
  },

  /**
   * Create a new category in a project (project-scoped)
   */
  async createCategory(projectId: string, category: any, token: string): Promise<any> {
    return projectApiRequest<any>(
      `/projects/${projectId}/categories`,
      {
        method: 'POST',
        body: JSON.stringify(category),
      },
      token
    );
  },
};

export default projectsApi;