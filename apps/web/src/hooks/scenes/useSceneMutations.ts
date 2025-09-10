import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scenesApi, SceneApiError, SceneUpdateRequest, SceneItemCreateRequest, SceneItemUpdateRequest } from '../../services/scenesApi';
import { useAuth } from '../../providers/AuthProvider';

export interface UseSceneMutationsOptions {
  onSuccess?: () => void;
  onError?: (error: SceneApiError) => void;
  onItemSuccess?: (data: any) => void;
  onItemError?: (error: SceneApiError) => void;
}

/**
 * Hook providing scene mutation operations using flat routes
 */
export function useSceneMutations(sceneId: string, options: UseSceneMutationsOptions = {}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Helper to invalidate related queries
  const invalidateSceneQueries = () => {
    queryClient.invalidateQueries(['scene-manifest', sceneId]);
    queryClient.invalidateQueries(['scene', sceneId]);
    queryClient.invalidateQueries(['scene-version', sceneId]);
  };

  /**
   * Update scene properties (exposure, environment, spawn, etc.)
   */
  const updateScene = useMutation({
    mutationFn: async ({ updates, version }: { updates: SceneUpdateRequest; version?: number }) => {
      if (!token) {
        throw new SceneApiError(401, 'Authentication required');
      }
      return scenesApi.updateScene(sceneId, updates, version?.toString());
    },
    onSuccess: () => {
      invalidateSceneQueries();
      options.onSuccess?.();
    },
    onError: options.onError,
  });

  /**
   * Update multiple scene items with versioning and idempotency
   */
  const updateItems = useMutation({
    mutationFn: async ({ 
      items, 
      version, 
      idempotencyKey 
    }: { 
      items: SceneItemUpdateRequest[]; 
      version: string; 
      idempotencyKey?: string; 
    }) => {
      if (!token) {
        throw new SceneApiError(401, 'Authentication required');
      }
      const key = idempotencyKey || crypto.randomUUID();
      return scenesApi.updateItems(sceneId, items, token, version, key);
    },
    onSuccess: (data) => {
      invalidateSceneQueries();
      options.onItemSuccess?.(data);
    },
    onError: options.onItemError,
  });

  /**
   * Add a single item to the scene
   */
  const addItem = useMutation({
    mutationFn: async (item: SceneItemCreateRequest) => {
      if (!token) {
        throw new SceneApiError(401, 'Authentication required');
      }
      return scenesApi.addItem(sceneId, item, token);
    },
    onSuccess: (data) => {
      invalidateSceneQueries();
      options.onItemSuccess?.(data);
    },
    onError: options.onItemError,
  });

  /**
   * Update a specific scene item
   */
  const updateItem = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: SceneItemUpdateRequest }) => {
      if (!token) {
        throw new SceneApiError(401, 'Authentication required');
      }
      return scenesApi.updateItem(sceneId, itemId, updates, token);
    },
    onSuccess: (data) => {
      invalidateSceneQueries();
      options.onItemSuccess?.(data);
    },
    onError: options.onItemError,
  });

  /**
   * Remove an item from the scene
   */
  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      if (!token) {
        throw new SceneApiError(401, 'Authentication required');
      }
      return scenesApi.removeItem(sceneId, itemId, token);
    },
    onSuccess: () => {
      invalidateSceneQueries();
      options.onItemSuccess?.(null);
    },
    onError: options.onItemError,
  });

  /**
   * Update scene properties (convenience method for common operations)
   */
  const updateSceneProps = async (props: { 
    exposure?: number; 
    env?: { hdri_url?: string; intensity?: number }; 
    spawn?: { position: { x: number; y: number; z: number }; yaw_deg: number }; 
  }) => {
    const updates: SceneUpdateRequest = {};
    
    if (props.exposure !== undefined) {
      updates.exposure = props.exposure;
    }
    
    if (props.env) {
      if (props.env.hdri_url !== undefined) {
        updates.envHdriUrl = props.env.hdri_url;
      }
      if (props.env.intensity !== undefined) {
        updates.envIntensity = props.env.intensity;
      }
    }
    
    if (props.spawn) {
      updates.spawnPoint = {
        position: props.spawn.position,
        yawDeg: props.spawn.yaw_deg,
      };
    }

    return updateScene.mutateAsync({ updates });
  };

  /**
   * Batch update items with automatic versioning
   */
  const batchUpdateItems = async (items: SceneItemUpdateRequest[], currentVersion: string) => {
    return updateItems.mutateAsync({ 
      items, 
      version: currentVersion,
      idempotencyKey: crypto.randomUUID(),
    });
  };

  return {
    // Mutations
    updateScene,
    updateItems,
    addItem,
    updateItem,
    removeItem,
    
    // Convenience methods
    updateSceneProps,
    batchUpdateItems,
    
    // Loading states
    isUpdatingScene: updateScene.isLoading,
    isUpdatingItems: updateItems.isLoading,
    isAddingItem: addItem.isLoading,
    isUpdatingItem: updateItem.isLoading,
    isRemovingItem: removeItem.isLoading,
    
    // Error states
    sceneError: updateScene.error,
    itemsError: updateItems.error,
    addItemError: addItem.error,
    updateItemError: updateItem.error,
    removeItemError: removeItem.error,
  };
}