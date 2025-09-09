import { useQuery } from '@tanstack/react-query';
import { scenesApi, SceneApiError } from '../../services/scenesApi';
import { useAuth } from '../../providers/AuthProvider';
import { log, once as logOnce } from '../../utils/logger';

export interface UseSceneManifestOptions {
  enabled?: boolean;
  refetchInterval?: number;
  onError?: (error: SceneApiError) => void;
  /** Categories to include in manifest. If not provided, all categories are included */
  categories?: string[];
  /** Include additional category metadata like descriptions, tags, and configuration */
  includeMetadata?: boolean;
  /** Custom query key suffix for cache separation when using filters */
  querySuffix?: string;
}

/**
 * Hook to fetch scene manifest using flat route with optional category filtering
 */
export function useSceneManifest(sceneId: string, options: UseSceneManifestOptions = {}) {
  const { token } = useAuth();
  const { 
    enabled = true, 
    refetchInterval, 
    onError, 
    categories, 
    includeMetadata = false,
    querySuffix = ''
  } = options;

  // Create cache key that includes filters for proper cache separation
  const queryKey = [
    'scene-manifest', 
    sceneId,
    categories?.sort().join(',') || 'all',
    includeMetadata ? 'with-metadata' : 'no-metadata',
    querySuffix
  ].filter(Boolean);
  
  return useQuery({
    queryKey,
    queryFn: () => {
      if (!token) {
        throw new SceneApiError(401, 'Authentication required');
      }

      log('debug', '🔄 useSceneManifest: Loading manifest', {
        sceneId,
        categories: categories?.length ? categories : 'all',
        includeMetadata
      });

      return scenesApi.getManifest(sceneId, {
        categories,
        includeMetadata
      });
    },
    enabled: !!sceneId && !!token && enabled,
    refetchInterval,
    onError,
    staleTime: 30000, // 30 seconds
    retry: (failureCount, error: unknown) => {
      // Don't retry on auth errors
      if (error instanceof SceneApiError && [401, 403].includes(error.statusCode)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to fetch scene details using flat route
 */
export function useScene(sceneId: string, options: { enabled?: boolean } = {}) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['scene', sceneId],
    queryFn: () => {
      if (!token) {
        throw new SceneApiError(401, 'Authentication required');
      }
      return scenesApi.getScene(sceneId);
    },
    enabled: !!sceneId && !!token && (options.enabled !== false),
    staleTime: 60000, // 1 minute
    retry: (failureCount, error: unknown) => {
      if (error instanceof SceneApiError && [401, 403].includes(error.statusCode)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to get current scene version for optimistic locking
 */
export function useSceneVersion(sceneId: string, options: { enabled?: boolean } = {}) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['scene-version', sceneId],
    queryFn: () => {
      if (!token) {
        throw new SceneApiError(401, 'Authentication required');
      }
      return scenesApi.getVersion(sceneId);
    },
    enabled: !!sceneId && !!token && (options.enabled !== false),
    staleTime: 5000, // 5 seconds - version changes frequently
    refetchInterval: 10000, // Check for version updates every 10 seconds
    retry: (failureCount, error) => {
      if (error instanceof SceneApiError && [401, 403].includes(error.statusCode)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to fetch available categories in a scene (alias route)
 */
export function useSceneCategories(sceneId: string, options: { enabled?: boolean } = {}) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['scene-categories', sceneId],
    queryFn: async () => {
      if (!token) {
        log('warn', 'useSceneCategories: No authentication token available');
        throw new SceneApiError(401, 'Authentication required');
      }

      log('debug', '🔄 useSceneCategories: Loading categories for scene:', sceneId);
      
      const response = await scenesApi.getCategories(sceneId);
      // Backend returns array directly, but API client expects { categories: [...] }
      // Handle both formats for compatibility
      const categories = Array.isArray(response) ? response : (response?.categories || []);
      
      logOnce(`scene:categories:loaded:${sceneId}`, 'info', '✅ useSceneCategories: Loaded categories (logged once)');
      log('debug', '✅ useSceneCategories: Loaded categories count', categories.length);
      
      return categories;
    },
    enabled: !!sceneId && (options.enabled !== false),
    staleTime: 300000, // 5 minutes - categories don't change often
    retry: (failureCount, error) => {
      if (error instanceof SceneApiError && [401, 403].includes(error.statusCode)) {
        log('warn', 'useSceneCategories: Authentication failed, not retrying');
        return false;
      }
      return failureCount < 3;
    }
  });
}