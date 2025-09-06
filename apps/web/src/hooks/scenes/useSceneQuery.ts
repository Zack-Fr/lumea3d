import { useQuery } from '@tanstack/react-query';
import { scenesApi, SceneApiError } from '../../services/scenesApi';
import { useAuth } from '../../providers/AuthProvider';

export interface UseSceneManifestOptions {
  enabled?: boolean;
  refetchInterval?: number;
  onError?: (error: SceneApiError) => void;
}

/**
 * Hook to fetch scene manifest using flat route
 */
export function useSceneManifest(sceneId: string, options: UseSceneManifestOptions = {}) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['scene-manifest', sceneId],
    queryFn: () => {
      if (!token) {
        throw new SceneApiError(401, 'Authentication required');
      }
      return scenesApi.getManifest(sceneId, token);
    },
    enabled: !!sceneId && !!token && (options.enabled !== false),
    refetchInterval: options.refetchInterval,
    onError: options.onError,
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
      return scenesApi.getScene(sceneId, token);
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
      return scenesApi.getVersion(sceneId, token);
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