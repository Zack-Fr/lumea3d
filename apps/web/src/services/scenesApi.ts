import { once as logOnce, log } from '../utils/logger';

// Override the generated types with our actual data structure
export interface SceneManifestV2 {
  scene: {
    id: string;
    name: string;
    description?: string;
    version: number;
    [key: string]: any;
  };
  items: SceneItem[];
  categories: Record<string, CategoryInfo>;
  generatedAt: string;
  spawn?: {
    position: [number, number, number];
    rotation?: [number, number, number, number];
  };
  env?: {
    hdri_url?: string;
    [key: string]: any;
  };
  navmesh_url?: string;
}

export interface SceneItem {
  id: string;
  name: string;
  category: string;
  model: string;
  transform: {
    position: [number, number, number];
    rotation_euler: [number, number, number];
    scale: [number, number, number];
  };
  material?: Record<string, any>;
  materialOverrides?: Record<string, any>;
  selectable?: boolean;
  locked?: boolean;
  meta?: Record<string, any>;
  [key: string]: any;
}

export interface CategoryInfo {
  url: string;
  name: string;
  description?: string;
  tags?: string[];
  capabilities?: {
    physics?: boolean;
    interaction?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

// Custom SceneDelta that matches our frontend expectations
export interface SceneDelta {
  fromVersion: number;
  toVersion: number;
  v: number; // version alias
  ops: DeltaOperation[];
  timestamp: string;
}

export interface DeltaOperation {
  type: 'add' | 'remove' | 'update' | 'scene' | 'category_add' | 'category_remove';
  id?: string;
  key?: string | undefined; // for category operations
  item?: SceneItem;
  material?: Record<string, any>;
  transform?: {
    position?: [number, number, number];
    rotation_euler?: [number, number, number];
    scale?: [number, number, number];
  };
  meta?: Record<string, any>;
  env?: Record<string, any>;
  spawn?: {
    position: [number, number, number];
    rotation?: [number, number, number, number];
  };
  // Additional properties for compatibility
  selectable?: boolean;
  locked?: boolean;
  exposure?: number;
  category?: Record<string, any>;
}

// Legacy delta operation format for ScenePersistenceContext
export interface DeltaOp {
  op: 'upsert_item' | 'update_item' | 'remove_item' | 'scene_props' | 'category_add' | 'category_remove';
  id?: string;
  key?: string;
  item?: SceneItem;
  material?: Record<string, any>;
  transform?: {
    position?: [number, number, number];
    rotation_euler?: [number, number, number];
    scale?: [number, number, number];
  };
  meta?: Record<string, any>;
  env?: Record<string, any>;
  spawn?: {
    position: [number, number, number];
    rotation?: [number, number, number, number];
  };
  exposure?: number;
  selectable?: boolean;
  locked?: boolean;
  category?: Record<string, any>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Explicit token storage to fix race conditions
let currentAuthToken: string | null = null;

export function updateApiClientToken(token: string | null) {
  // Store token explicitly to avoid race conditions
  currentAuthToken = token;
  
  // Enhanced logging for debugging
  console.log('🔐 SCENES_API: updateApiClientToken called');
  console.log('🔐 SCENES_API: Token updated:', {
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'NULL',
    timestamp: new Date().toISOString()
  });
  
  // Log token update for debugging
  logOnce('api:token-updated', 'info', '🔐 SCENES_API: Token updated');
}

// Type definitions for existing interfaces
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
  selectable?: boolean;
  locked?: boolean;
  meta?: any;
  materialOverrides?: any;
}

export interface SceneItemUpdateRequest {
  name?: string;
  categoryKey?: string;
  transform?: {
    position?: [number, number, number];
    rotation?: [number, number, number, number];
    scale?: [number, number, number];
  };
  assetId?: string;
  properties?: Record<string, any>;
}

export interface SceneUpdateRequest {
  name?: string;
  description?: string;
  env?: {
    hdri_url?: string;
    [key: string]: any;
  };
  spawn?: {
    position?: [number, number, number];
    rotation?: [number, number, number, number];
  };
  [key: string]: any;
}

export interface SceneVersionResponse {
  version: string;
  timestamp: string;
}

// Error class for scene API operations
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

export interface SceneApiErrorData {
  message: string;
  statusCode?: number;
  error?: string;
}

export function getCurrentToken(): string | null {
  // Fallback to localStorage if in-memory token is missing (fixes page refresh issue)
  if (!currentAuthToken) {
    const storedToken = localStorage.getItem('lumea_auth_token');
    if (storedToken) {
      console.log('🔄 SCENES_API: Restored token from localStorage after page refresh');
      currentAuthToken = storedToken;
    }
  }
  
  return currentAuthToken;
}

export const scenesApi = {
  /**
   * Get scene manifest using flat route with optional filters
   */
  async getManifest(
    sceneId: string, 
    opts?: { categories?: string[]; includeMetadata?: boolean }
  ): Promise<SceneManifestV2> {
    const token = getCurrentToken();
    
    // Use direct fetch since we need flat routes
    const url = `${API_BASE_URL}/scenes/${sceneId}/manifest`;
    const queryParams = new URLSearchParams();
    if (opts?.categories?.length) queryParams.append('categories', opts.categories.join(','));
    if (opts?.includeMetadata) queryParams.append('includeMetadata', 'true');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(
      `${url}${queryParams.toString() ? '?' + queryParams.toString() : ''}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new SceneApiError(response.status, `Failed to get manifest: ${response.statusText}`);
    }
    
    return response.json() as Promise<SceneManifestV2>;
  },

  /**
   * Update scene items using flat route with versioning and idempotency
   * Note: The flat API doesn't support batch updates, use updateItem for individual updates
   */
  async patchItems(
    _sceneId: string,
    _items: any[],
    _version: string
  ): Promise<any> {
    throw new Error('Batch item updates not supported by flat API - use updateItem for individual updates');
  },

  /**
   * Update scene properties using flat route with versioning
   */
  async patchProps(
    sceneId: string,
    body: any,
    version?: string
  ): Promise<any> {
    const token = getCurrentToken();
    const url = `${API_BASE_URL}/scenes/${sceneId}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...(version && { 'If-Match': parseInt(version.toString(), 10).toString() }),
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new SceneApiError(response.status, `Failed to update scene: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Generate SSE events URL for realtime updates
   */
  eventsUrl: (projectId: string, sceneId: string): string => `/projects/${projectId}/scenes/${sceneId}/events`,

  /**
   * Create a new scene using flat route
   */
  async createScene(sceneData: { name: string; projectId: string; [key: string]: any }): Promise<any> {
    const token = getCurrentToken();
    const url = `${API_BASE_URL}/scenes`;
    
    console.log('🎨 SCENES_API: createScene called');
    console.log('🎨 SCENES_API: URL:', url);
    console.log('🎨 SCENES_API: Has token:', !!token);
    console.log('🎨 SCENES_API: Token preview:', token ? token.substring(0, 20) + '...' : 'NO_TOKEN');
    console.log('🎨 SCENES_API: Scene data:', sceneData);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      console.log('✅ SCENES_API: Authorization header set');
    } else {
      console.error('❌ SCENES_API: NO TOKEN - Authorization header NOT set!');
    }
    
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(sceneData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SCENES_API: Error response body:', errorText);
      throw new SceneApiError(response.status, `Failed to create scene: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ SCENES_API: Scene created successfully:', result);
    return result;
  },

  /**
   * Get scene details using flat route
   */
  async getScene(sceneId: string): Promise<any> {
    const token = getCurrentToken();
    const url = `${API_BASE_URL}/scenes/${sceneId}`;
    
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new SceneApiError(response.status, `Failed to get scene: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get all scenes for a project
   */
  async getScenes(projectId: string): Promise<any[]> {
    const token = getCurrentToken();
    const url = `${API_BASE_URL}/projects/${projectId}/scenes`;
    
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new SceneApiError(response.status, `Failed to get scenes: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Add item to scene using flat route
   */
  async addItem(
    sceneId: string,
    item: SceneItemCreateRequest,
    version?: string
  ): Promise<any> {
    const token = getCurrentToken();
    const url = `${API_BASE_URL}/scenes/${sceneId}/items`;
    
    // Validate required fields
    if (!sceneId) {
      throw new SceneApiError(400, 'sceneId is required');
    }
    if (!item.categoryKey) {
      throw new SceneApiError(400, 'categoryKey is required in item payload');
    }
    if (!token) {
      throw new SceneApiError(401, 'Authentication token required');
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // Backend expects numeric version in If-Match header (required)
    const numericVersion = version ? parseInt(version.toString(), 10) : 1;
    headers['If-Match'] = numericVersion.toString();
    
    console.log('📦 SCENES_API: addItem headers:', headers);
    console.log('📦 SCENES_API: addItem payload:', JSON.stringify(item, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(item),
    });
    
    console.log('📦 SCENES_API: addItem response status:', response.status, response.statusText);
    
    if (!response.ok) {
      let errorMessage = `Failed to add item: ${response.statusText}`;
      let errorDetails = '';
      
      try {
        const errorBody = await response.text();
        console.error('📦 SCENES_API: addItem error response body:', errorBody);
        errorDetails = errorBody;
        
        // Try to parse as JSON for better error message
        try {
          const errorJson = JSON.parse(errorBody);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
          if (errorJson.error) {
            errorDetails = errorJson.error;
          }
        } catch (jsonError) {
          // Not JSON, use raw text
        }
      } catch (textError) {
        console.error('📦 SCENES_API: Could not read error response body:', textError);
      }
      
      throw new SceneApiError(response.status, errorMessage, errorDetails);
    }
    
    const result = await response.json();
    console.log('✅ SCENES_API: addItem success:', result);
    return result;
  },

  /**
   * Update specific scene item using project-nested route
   */
  async updateItem(
    sceneId: string,
    itemId: string,
    updates: SceneItemUpdateRequest,
    version?: string
  ): Promise<any> {
    const token = getCurrentToken();
    const url = `${API_BASE_URL}/scenes/${sceneId}/items/${itemId}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (version) {
      // Backend expects numeric version in If-Match header (consistent with addItem/removeItem)
      const numericVersion = parseInt(version.toString(), 10);
      headers['If-Match'] = numericVersion.toString();
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new SceneApiError(response.status, `Failed to update item: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Remove item from scene using project-nested route
   */
  async removeItem(sceneId: string, itemId: string, version?: string): Promise<void> {
    const token = getCurrentToken();
    const url = `${API_BASE_URL}/scenes/${sceneId}/items/${itemId}`;
    

    console.log('🗑️ SCENES_API: removeItem request:', {
      sceneId,
      itemId,
      version,
      url,
      isTemporaryId: itemId?.startsWith('temp_')
    });
    
    const headers: Record<string, string> = {};
    if (version) {
      // Backend expects numeric version in If-Match header (same as addItem)
      const numericVersion = parseInt(version.toString(), 10);
      headers['If-Match'] = numericVersion.toString();
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('🗑️ SCENES_API: removeItem headers:', headers);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    
    console.log('🗑️ SCENES_API: removeItem response status:', response.status, response.statusText);
    
    if (!response.ok) {
      // Get response body for better error details
      let errorMessage = `Failed to remove item: ${response.statusText}`;
      let errorDetails = '';
      
      try {
        const errorBody = await response.text();
        console.error('🗑️ SCENES_API: removeItem error response body:', errorBody);
        errorDetails = errorBody;
        
        // Try to parse as JSON for better error message
        try {
          const errorJson = JSON.parse(errorBody);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
          if (errorJson.error) {
            errorDetails = errorJson.error;
          }
        } catch (jsonError) {
          // Not JSON, use raw text
        }
      } catch (textError) {
        console.error('🗑️ SCENES_API: Could not read error response body:', textError);
      }
      
      throw new SceneApiError(response.status, errorMessage, errorDetails);
    }
    
    console.log('✅ SCENES_API: removeItem success');
  },

  /**
   * Update scene properties like environment, lighting, shell settings
   */
  async updateScene(
    sceneId: string,
    updates: SceneUpdateRequest,
    version?: string
  ): Promise<any> {
    const token = getCurrentToken();
    const url = `${API_BASE_URL}/scenes/${sceneId}`;
    
    // Validate required fields
    if (!sceneId) {
      throw new SceneApiError(400, 'sceneId is required');
    }
    if (!token) {
      throw new SceneApiError(401, 'Authentication token required');
    }
    
    console.log('🎨 SCENES_API: updateScene request:', {
      sceneId,
      version,
      url,
      updates
    });
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // Backend expects numeric version in If-Match header
    const numericVersion = version ? parseInt(version.toString(), 10) : 1;
    headers['If-Match'] = numericVersion.toString();
    
    console.log('🎨 SCENES_API: updateScene headers:', headers);
    console.log('🎨 SCENES_API: updateScene payload:', JSON.stringify(updates, null, 2));
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    
    console.log('🎨 SCENES_API: updateScene response status:', response.status, response.statusText);
    
    if (!response.ok) {
      let errorMessage = `Failed to update scene: ${response.statusText}`;
      let errorDetails = '';
      
      try {
        const errorBody = await response.text();
        console.error('🎨 SCENES_API: updateScene error response body:', errorBody);
        errorDetails = errorBody;
        
        // Try to parse as JSON for better error message
        try {
          const errorJson = JSON.parse(errorBody);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
          if (errorJson.error) {
            errorDetails = errorJson.error;
          }
        } catch (jsonError) {
          // Not JSON, use raw text
        }
      } catch (textError) {
        console.error('🎨 SCENES_API: Could not read error response body:', textError);
      }
      
      throw new SceneApiError(response.status, errorMessage, errorDetails);
    }
    
    const result = await response.json();
    console.log('✅ SCENES_API: updateScene success:', result);
    return result;
  },

  /**
   * Get scene version for optimistic locking using flat route
   */
  async getVersion(sceneId: string): Promise<SceneVersionResponse> {
    const token = getCurrentToken();
    const url = `${API_BASE_URL}/scenes/${sceneId}/version`;
    
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new SceneApiError(response.status, `Failed to get scene version: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      version: data.version || '1',
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Generate delta between scene versions using flat route
   */
  async getDelta(
    sceneId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<SceneDelta> {
    const token = getCurrentToken();
    const url = `${API_BASE_URL}/scenes/${sceneId}/delta?from=${fromVersion}&to=${toVersion}`;
    
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new SceneApiError(response.status, `Failed to get delta: ${response.statusText}`);
    }
    
    const delta = await response.json();
    return {
      fromVersion: delta.fromVersion,
      toVersion: delta.toVersion,
      v: delta.toVersion, // version alias
      ops: [], // TODO: Parse operations from the API response when actual delta format is determined
      timestamp: delta.timestamp,
    } as SceneDelta;
  },

  /**
   * Get scene categories
   */
  async getCategories(sceneId: string): Promise<any> {
    const token = getCurrentToken();
    const url = `${API_BASE_URL}/scenes/${sceneId}/categories`;
    
    logOnce('scene:getCategories:start', 'info', '🔐 SCENE_API: getCategories called (logged once)');
    console.log('🔍 SCENE_API: getCategories detailed request:', {
      sceneId,
      url,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'NO_TOKEN',
      API_BASE_URL,
      currentAuthTokenValue: currentAuthToken ? 'SET' : 'NULL'
    });
    
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        console.log('✅ SCENE_API: Token available, adding Authorization header');
      } else {
        console.warn('⚠️ SCENE_API: No token available for getCategories - may cause 401 error if not loading');
        console.log('🔍 SCENE_API: currentAuthToken value:', currentAuthToken);
        console.log('🔍 SCENE_API: Debugging token state...');
        
        // Check if we can get auth state from somewhere else for debugging
        const authStateFromLocalStorage = localStorage.getItem('lumea_auth_token');
        console.log('🔍 SCENE_API: localStorage token exists:', !!authStateFromLocalStorage);
        
        // Let's try to use the localStorage token as fallback if available
        if (authStateFromLocalStorage) {
          console.log('🔄 SCENE_API: Using localStorage token as emergency fallback');
          headers.Authorization = `Bearer ${authStateFromLocalStorage}`;
        }
      }
      
      console.log('🔍 SCENE_API: Final request details:', { 
        url, 
        headers: {
          ...headers,
          Authorization: headers.Authorization ? headers.Authorization.substring(0, 20) + '...' : 'NOT_SET'
        }
      });
      
      const response = await fetch(url, { headers });
      
      console.log('🔍 SCENE_API: Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SCENE_API: Error response body:', errorText);
        throw new SceneApiError(response.status, `Failed to get categories: ${response.statusText}`);
      }
      
      const data = await response.json();
      logOnce('scene:getCategories:success', 'info', '✅ SCENE_API: getCategories success');
      console.log('✅ SCENE_API: Categories data received:', data?.length || 0, 'items');
      return data;
    } catch (error: any) {
      log('error', '❌ SCENE_API: getCategories failed:', error);
      log('debug', 'SCENE_API: Error details', {
        status: error?.statusCode || error?.response?.status,
        message: error?.message
      });
      throw error;
    }
  },

  /**
   * Download scene assets
   */
  async downloadManifest(
    sceneId: string,
    options?: {
      variant?: 'original' | 'meshopt' | 'draco' | 'navmesh';
      cacheDuration?: number;
      includeCdn?: boolean;
    }
  ): Promise<any> {
    // Note: This needs to be implemented via the assets API or scene downloads API
    // For now, construct the URL directly
    const queryParams = new URLSearchParams();
    if (options?.variant) queryParams.append('variant', options.variant);
    if (options?.cacheDuration) queryParams.append('cacheDuration', options.cacheDuration.toString());
    if (options?.includeCdn) queryParams.append('includeCdn', options.includeCdn.toString());
    
    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/scenes/${sceneId}/download/manifest${queryString ? `?${queryString}` : ''}`;
    
    const token = getCurrentToken();
    const response = await fetch(url, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download manifest: ${response.statusText}`);
    }
    
    return response.json();
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
  async getAssetMetadata(sceneId: string, assetId: string): Promise<any> {
    // Note: This needs to be implemented via the assets API
    const url = `${API_BASE_URL}/scenes/${sceneId}/assets/${assetId}/metadata`;
    
    const token = getCurrentToken();
    const response = await fetch(url, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get asset metadata: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Legacy methods for backward compatibility
  async updateSceneLegacy(
    sceneId: string, 
    updates: any, 
    token: string,
    version?: number
  ): Promise<any> {
    // Update token if provided
    if (token && getCurrentToken() !== token) {
      updateApiClientToken(token);
    }
    return this.patchProps(sceneId, updates, version?.toString() || '1');
  },

  async updateItems(
    sceneId: string,
    items: any[],
    token: string,
    version: string,
    _idempotencyKey?: string
  ): Promise<any> {
    // Update token if provided
    if (token && getCurrentToken() !== token) {
      updateApiClientToken(token);
    }
    
    // Handle batch updates by calling individual updateItem for each
    const results = [];
    for (const item of items) {
      if (item.id && item.updates) {
        const result = await this.updateItem(sceneId, item.id, item.updates, version);
        results.push(result);
      }
    }
    return results;
  },

  getSSEUrl(projectId: string, sceneId: string): string {
    return `${API_BASE_URL}/projects/${projectId}/scenes/${sceneId}/events`;
  },

  /**
   * Get project categories
   */
  async getProjectCategories(projectId: string): Promise<ProjectCategory[]> {
    const token = getCurrentToken();
    const url = `${API_BASE_URL}/projects/${projectId}/categories`;
    
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new SceneApiError(response.status, `Failed to get project categories: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Create a new project category
   */
  async createProjectCategory(
    projectId: string,
    categoryData: CreateProjectCategoryRequest
  ): Promise<ProjectCategory> {
    const token = getCurrentToken();
    const url = `${API_BASE_URL}/projects/${projectId}/categories`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(categoryData),
    });
    
    if (!response.ok) {
      throw new SceneApiError(response.status, `Failed to create project category: ${response.statusText}`);
    }
    
    return response.json();
  },
};

// Export the custom SceneManifestV2 interface for use by other modules
export interface ProjectCategory {
  id: string;
  categoryKey: string;
  assetId: string;
  asset: {
    id: string;
    originalName: string;
    status: string;
    originalUrl: string;
    meshoptUrl?: string;
    dracoUrl?: string;
  };
  instancing: boolean;
  draco: boolean;
  meshopt: boolean;
  ktx2: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectCategoryRequest {
  assetId: string;
  categoryKey: string;
  instancing?: boolean;
  draco?: boolean;
  meshopt?: boolean;
  ktx2?: boolean;
}