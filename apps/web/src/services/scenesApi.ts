import { 
  FlatScenesApi,
  Configuration
} from '@lumea/shared';

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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create configuration and API instances
let apiConfig: Configuration | null = null;
let scenesApiInstance: FlatScenesApi | null = null;

function getApiConfig(): Configuration {
  if (!apiConfig) {
    apiConfig = new Configuration({
      basePath: API_BASE_URL,
    });
  }
  return apiConfig;
}

function getScenesApi(): FlatScenesApi {
  if (!scenesApiInstance) {
    scenesApiInstance = new FlatScenesApi(getApiConfig());
  }
  return scenesApiInstance;
}

export function updateApiClientToken(token: string | null) {
  if (token) {
    apiConfig = new Configuration({
      basePath: API_BASE_URL,
      accessToken: token,
    });
  } else {
    apiConfig = new Configuration({
      basePath: API_BASE_URL,
    });
  }
  
  // Reset instances to use new config
  scenesApiInstance = null;
}

// Type definitions for existing interfaces
export interface SceneItemCreateRequest {
  name: string;
  categoryKey: string;
  transform: {
    position: [number, number, number];
    rotation: [number, number, number, number];
    scale: [number, number, number];
  };
  assetId?: string;
  properties?: Record<string, any>;
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

function getCurrentToken(): string | null {
  const token = apiConfig?.accessToken;
  return typeof token === 'string' ? token : null;
}

export const scenesApi = {
  /**
   * Get scene manifest using flat route with optional filters
   */
  async getManifest(
    sceneId: string, 
    opts?: { categories?: string[]; includeMetadata?: boolean }
  ): Promise<SceneManifestV2> {
    const api = getScenesApi();
    const response = await api.flatScenesControllerGenerateManifest(
      sceneId,
      opts?.categories?.length ? opts.categories.join(',') : undefined,
      opts?.includeMetadata ?? false
    );
    // Cast the response to our expected type structure
    return response.data as unknown as SceneManifestV2;
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
    version: string
  ): Promise<any> {
    const api = getScenesApi();
    const response = await api.flatScenesControllerUpdate(
      sceneId,
      'If-Match',
      `W/"${version}"`,
      body
    );
    return response.data;
  },

  /**
   * Generate SSE events URL for realtime updates
   */
  eventsUrl: (sceneId: string): string => `/scenes/${sceneId}/events`,

  /**
   * Get scene details using flat route
   */
  async getScene(sceneId: string): Promise<any> {
    const api = getScenesApi();
    const response = await api.flatScenesControllerFindOne(sceneId);
    return response.data;
  },

  /**
   * Add item to scene using flat route
   */
  async addItem(
    sceneId: string,
    item: SceneItemCreateRequest,
    version?: string
  ): Promise<any> {
    const api = getScenesApi();
    const response = await api.flatScenesControllerAddItem(
      sceneId,
      'If-Match',
      version ? `W/"${version}"` : '"*"',
      item
    );
    return response.data;
  },

  /**
   * Update specific scene item using flat route
   */
  async updateItem(
    sceneId: string,
    itemId: string,
    updates: SceneItemUpdateRequest,
    version?: string
  ): Promise<any> {
    const api = getScenesApi();
    const response = await api.flatScenesControllerUpdateItem(
      sceneId,
      itemId,
      'If-Match',
      version ? `W/"${version}"` : '"*"',
      updates
    );
    return response.data;
  },

  /**
   * Remove item from scene using flat route
   */
  async removeItem(sceneId: string, itemId: string, version?: string): Promise<void> {
    const api = getScenesApi();
    await api.flatScenesControllerRemoveItem(
      sceneId,
      itemId,
      'If-Match',
      version ? `W/"${version}"` : '"*"'
    );
  },

  /**
   * Get scene version for optimistic locking
   */
  async getVersion(sceneId: string): Promise<SceneVersionResponse> {
    const api = getScenesApi();
    await api.flatScenesControllerGetVersion(sceneId);
    // The API returns void, so we need to construct a version response
    // This will need to be handled differently - perhaps get version from scene data
    const sceneData = await this.getScene(sceneId);
    return {
      version: sceneData.version || '1',
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Generate delta between scene versions
   */
  async getDelta(
    sceneId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<SceneDelta> {
    const api = getScenesApi();
    const response = await api.flatScenesControllerGenerateDelta(
      sceneId,
      fromVersion,
      toVersion
    );
    
    // Transform the response to match our expected format
    const delta = response.data;
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
    const api = getScenesApi();
    const response = await api.flatScenesControllerGetSceneCategories(sceneId);
    return response.data;
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
  async updateScene(
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
      if (item.id) {
        const result = await this.updateItem(sceneId, item.id, item, version);
        results.push(result);
      }
    }
    return results;
  },

  getSSEUrl(sceneId: string): string {
    return `${API_BASE_URL}/scenes/${sceneId}/events`;
  },
};

// Export the custom SceneManifestV2 interface for use by other modules