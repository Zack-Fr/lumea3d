import type { SceneManifestV2, SceneDelta } from '@lumea/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SceneApiErrorData {
  message: string;
  statusCode: number;
  error?: string;
}

export interface SceneUpdateRequest {
  name?: string;
  scale?: number;
  exposure?: number;
  envHdriUrl?: string;
  envIntensity?: number;
  spawnPoint?: {
    position: { x: number; y: number; z: number };
    yawDeg: number;
  };
  navmeshAssetId?: string;
}

export interface SceneItemCreateRequest {
  categoryKey: string;
  model?: string;
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  materialVariant?: string;
  materialOverrides?: Record<string, any>;
  selectable?: boolean;
  locked?: boolean;
  meta?: Record<string, any>;
}

export interface SceneItemUpdateRequest {
  model?: string;
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  materialVariant?: string;
  materialOverrides?: Record<string, any>;
  selectable?: boolean;
  locked?: boolean;
  meta?: Record<string, any>;
}

export interface SceneVersionResponse {
  version: number;
}

export class SceneApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public error?: string
  ) {
    super(message);
    this.name = 'SceneApiError';
  }
}

async function sceneApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorData: SceneApiErrorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          message: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }
      
      throw new SceneApiError(
        errorData.statusCode || response.status,
        errorData.message || 'Request failed',
        errorData.error
      );
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof SceneApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new SceneApiError(
      0,
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}

export const scenesApi = {
  /**
   * Get scene manifest using flat route
   */
  async getManifest(sceneId: string, token: string): Promise<SceneManifestV2> {
    return sceneApiRequest<SceneManifestV2>(
      `/scenes/${sceneId}/manifest`,
      { method: 'GET' },
      token
    );
  },

  /**
   * Get scene details using flat route
   */
  async getScene(sceneId: string, token: string): Promise<any> {
    return sceneApiRequest<any>(
      `/scenes/${sceneId}`,
      { method: 'GET' },
      token
    );
  },

  /**
   * Update scene properties using flat route with versioning
   */
  async updateScene(
    sceneId: string, 
    updates: SceneUpdateRequest, 
    token: string,
    version?: number
  ): Promise<any> {
    const queryParams = version ? `?version=${version}` : '';
    return sceneApiRequest<any>(
      `/scenes/${sceneId}${queryParams}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      },
      token
    );
  },

  /**
   * Update scene items using flat route with versioning and idempotency
   */
  async updateItems(
    sceneId: string,
    items: SceneItemUpdateRequest[],
    token: string,
    version: string,
    idempotencyKey?: string
  ): Promise<any> {
    return sceneApiRequest<any>(
      `/scenes/${sceneId}/items`,
      {
        method: 'PATCH',
        body: JSON.stringify({ items }),
        headers: {
          'If-Match': `W/"${version}"`,
          ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey }),
        },
      },
      token
    );
  },

  /**
   * Add item to scene using flat route
   */
  async addItem(
    sceneId: string,
    item: SceneItemCreateRequest,
    token: string
  ): Promise<any> {
    return sceneApiRequest<any>(
      `/scenes/${sceneId}/items`,
      {
        method: 'POST',
        body: JSON.stringify(item),
      },
      token
    );
  },

  /**
   * Update specific scene item using flat route
   */
  async updateItem(
    sceneId: string,
    itemId: string,
    updates: SceneItemUpdateRequest,
    token: string
  ): Promise<any> {
    return sceneApiRequest<any>(
      `/scenes/${sceneId}/items/${itemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      },
      token
    );
  },

  /**
   * Remove item from scene using flat route
   */
  async removeItem(sceneId: string, itemId: string, token: string): Promise<void> {
    return sceneApiRequest<void>(
      `/scenes/${sceneId}/items/${itemId}`,
      { method: 'DELETE' },
      token
    );
  },

  /**
   * Get scene version for optimistic locking
   */
  async getVersion(sceneId: string, token: string): Promise<SceneVersionResponse> {
    return sceneApiRequest<SceneVersionResponse>(
      `/scenes/${sceneId}/version`,
      { method: 'GET' },
      token
    );
  },

  /**
   * Generate delta between scene versions
   */
  async getDelta(
    sceneId: string,
    fromVersion: number,
    toVersion: number,
    token: string
  ): Promise<SceneDelta> {
    return sceneApiRequest<SceneDelta>(
      `/scenes/${sceneId}/delta?fromVersion=${fromVersion}&toVersion=${toVersion}`,
      { method: 'GET' },
      token
    );
  },

  /**
   * Create SSE connection URL for scene events
   */
  getSSEUrl(sceneId: string): string {
    return `${API_BASE_URL}/scenes/${sceneId}/events`;
  },

  /**
   * Download scene assets
   */
  async downloadManifest(
    sceneId: string,
    token: string,
    options?: {
      variant?: 'original' | 'meshopt' | 'draco' | 'navmesh';
      cacheDuration?: number;
      includeCdn?: boolean;
    }
  ): Promise<any> {
    const queryParams = new URLSearchParams();
    if (options?.variant) queryParams.append('variant', options.variant);
    if (options?.cacheDuration) queryParams.append('cacheDuration', options.cacheDuration.toString());
    if (options?.includeCdn) queryParams.append('includeCdn', options.includeCdn.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/scenes/${sceneId}/download/manifest${queryString ? `?${queryString}` : ''}`;
    
    return sceneApiRequest<any>(endpoint, { method: 'GET' }, token);
  },

  /**
   * Get asset download URL
   */
  getAssetDownloadUrl(sceneId: string, assetId: string, variant?: string): string {
    const queryParams = variant ? `?variant=${variant}` : '';
    return `${API_BASE_URL}/scenes/${sceneId}/assets/${assetId}/redirect${queryParams}`;
  },

  /**
   * Get asset metadata
   */
  async getAssetMetadata(sceneId: string, assetId: string, token: string): Promise<any> {
    return sceneApiRequest<any>(
      `/scenes/${sceneId}/assets/${assetId}/metadata`,
      { method: 'GET' },
      token
    );
  },
};

// Project-scoped endpoints that remain unchanged
export const projectsApi = {
  /**
   * Get project categories (project-scoped)
   */
  async getCategories(projectId: string, token: string): Promise<any> {
    return sceneApiRequest<any>(
      `/projects/${projectId}/categories`,
      { method: 'GET' },
      token
    );
  },

  /**
   * Create project category (project-scoped)
   */
  async createCategory(projectId: string, category: any, token: string): Promise<any> {
    return sceneApiRequest<any>(
      `/projects/${projectId}/categories`,
      {
        method: 'POST',
        body: JSON.stringify(category),
      },
      token
    );
  },

  /**
   * List project scenes (project-scoped)
   */
  async getScenes(projectId: string, token: string): Promise<any> {
    return sceneApiRequest<any>(
      `/projects/${projectId}/scenes`,
      { method: 'GET' },
      token
    );
  },

  /**
   * Create new scene (project-scoped) - should return { projectId, sceneId }
   */
  async createScene(projectId: string, scene: any, token: string): Promise<{ projectId: string; sceneId: string }> {
    return sceneApiRequest<{ projectId: string; sceneId: string }>(
      `/projects/${projectId}/scenes`,
      {
        method: 'POST',
        body: JSON.stringify(scene),
      },
      token
    );
  },
};