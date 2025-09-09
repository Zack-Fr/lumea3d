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
 * Hook to fetch scene details using project-nested route
 */
export function useScene(projectId: string, sceneId: string, options: { enabled?: boolean } = {}) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['scene', projectId, sceneId],
    queryFn: () => {
      if (!token) {
        throw new SceneApiError(401, 'Authentication required');
      }
      return scenesApi.getScene(sceneId);
    },
    enabled: !!projectId && !!sceneId && !!token && (options.enabled !== false),
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
export function useSceneVersion(projectId: string, sceneId: string, options: { enabled?: boolean } = {}) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['scene-version', projectId, sceneId],
    queryFn: () => {
      if (!token) {
        throw new SceneApiError(401, 'Authentication required');
      }
      return scenesApi.getVersion(sceneId);
    },
    enabled: !!projectId && !!sceneId && !!token && (options.enabled !== false),
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
 * Hook to fetch available categories in a scene (flat route)
 */
export function useSceneCategories(sceneId: string, options: { enabled?: boolean; querySuffix?: string } = {}) {
  const { token } = useAuth();

  // Only enable query if token is present and sceneId is set
  const enabled = !!sceneId && !!token && (options.enabled !== false);
  const { querySuffix = '' } = options;

  return useQuery({
    queryKey: ['scene-categories', sceneId, token, querySuffix].filter(Boolean),
    queryFn: async () => {
      log('debug', '🔄 useSceneCategories: Loading categories for scene:', sceneId);
      const response = await scenesApi.getCategories(sceneId);
      // Backend returns array directly, but API client expects { categories: [...] }
      // Handle both formats for compatibility
      const categories = Array.isArray(response) ? response : (response?.categories || []);
      
      // Deduplicate categories by categoryKey
      const uniqueCategories = categories.filter((cat: any, index: number, arr: any[]) => {
        const key = typeof cat === 'string' ? cat : cat?.categoryKey || '';
        return arr.findIndex((c: any) => (typeof c === 'string' ? c : c?.categoryKey || '') === key) === index;
      });
      
      logOnce(`scene:categories:loaded:${sceneId}`, 'info', '✅ useSceneCategories: Loaded categories (logged once)');
      log('debug', '✅ useSceneCategories: Loaded categories count', Array.isArray(uniqueCategories) ? uniqueCategories.length : 0);
      log('debug', '✅ useSceneCategories: Unique categories', uniqueCategories);
      return uniqueCategories;
    },
    enabled,
    staleTime: 300000, // 5 minutes - categories don't change often
    retry: (failureCount, error) => {
      if (error instanceof SceneApiError && [401, 403].includes(error.statusCode)) {
        log('warn', 'useSceneCategories: Authentication failed, not retrying');
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to fetch all scenes for a project
 */
export function useScenes(projectId: string, options: { enabled?: boolean } = {}) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['scenes', projectId],
    queryFn: () => {
      if (!token) {
        throw new SceneApiError(401, 'Authentication required');
      }
      log('debug', '🔄 useScenes: Loading scenes for project:', projectId);
      return scenesApi.getScenes(projectId);
    },
    enabled: !!projectId && !!token && (options.enabled !== false),
    staleTime: 30000, // 30 seconds - scenes list changes moderately often
    retry: (failureCount, error: unknown) => {
      if (error instanceof SceneApiError && [401, 403].includes(error.statusCode)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}