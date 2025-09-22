import { useCallback, useRef } from 'react';
import { useScenePersistence } from './ScenePersistenceContext';
import { log } from '../../utils/logger';
import type { Vec3 } from '@/api/sdk';

interface UseSceneEditorProps {
  throttleMs?: number;
}

export function useSceneEditor({ throttleMs = 100 }: UseSceneEditorProps = {}) {
  const { state, actions } = useScenePersistence();
  const throttleRef = useRef<Map<string, number>>(new Map());

  const throttle = useCallback((key: string, fn: () => void) => {
    const now = Date.now();
    const lastCall = throttleRef.current.get(key) || 0;
    
    if (now - lastCall >= throttleMs) {
      throttleRef.current.set(key, now);
      fn();
    }
  }, [throttleMs]);

  const updateItemTransform = useCallback((
    itemId: string,
    transform: {
      position?: Vec3;
      rotation_euler?: Vec3;
      scale?: Vec3;
    }
  ) => {
    throttle(`transform-${itemId}`, () => {
  actions.updateItem(itemId, { transform });
  log('debug', '🔄 SceneEditor: Updated item transform:', itemId, transform);
    });
  }, [actions, throttle]);

  const updateItemPosition = useCallback((itemId: string, position: Vec3) => {
    updateItemTransform(itemId, { position });
  }, [updateItemTransform]);

  const updateItemRotation = useCallback((itemId: string, rotation_euler: Vec3) => {
    updateItemTransform(itemId, { rotation_euler });
  }, [updateItemTransform]);

  const updateItemScale = useCallback((itemId: string, scale: Vec3) => {
    updateItemTransform(itemId, { scale });
  }, [updateItemTransform]);

  const deleteItem = useCallback((itemId: string) => {
  actions.removeItem(itemId);
  log('info', '🗑️ SceneEditor: Deleted item:', itemId);
  }, [actions]);

  const duplicateItem = useCallback((itemId: string) => {
    const item = state.manifest.items.find(item => item.id === itemId);
    if (!item) return null;

    const newItem = {
      ...item,
      id: `${item.id}-copy-${Date.now()}`,
      transform: {
        ...item.transform,
        position: [
          item.transform.position[0] + 2,
          item.transform.position[1],
          item.transform.position[2]
        ] as Vec3
      }
    };

  actions.addItem(newItem);
  log('info', '📋 SceneEditor: Duplicated item:', itemId, '→', newItem.id);
    return newItem.id;
  }, [actions, state.manifest.items]);

  const updateItemMaterial = useCallback((
    itemId: string,
    material: {
      variant?: string;
      overrides?: Record<string, unknown>;
    }
  ) => {
  actions.updateItem(itemId, { material });
  log('debug', '🎨 SceneEditor: Updated item material:', itemId, material);
  }, [actions]);

  const updateItemProperties = useCallback((
    itemId: string,
    properties: {
      selectable?: boolean;
      locked?: boolean;
      meta?: Record<string, string>;
    }
  ) => {
  actions.updateItem(itemId, properties);
  log('debug', '⚙️ SceneEditor: Updated item properties:', itemId, properties);
  }, [actions]);

  const updateSceneExposure = useCallback((exposure: number) => {
    throttle('scene-exposure', () => {
  actions.updateSceneProps({ exposure });
  log('info', '☀️ SceneEditor: Updated scene exposure:', exposure);
    });
  }, [actions, throttle]);

  const updateSceneEnvironment = useCallback((env: {
    hdri_url?: string;
    intensity?: number;
  }) => {
  actions.updateSceneProps({ env });
  log('info', '🌍 SceneEditor: Updated scene environment:', env);
  }, [actions]);

  const updateSceneSpawn = useCallback((spawn: {
    position: Vec3;
    yaw_deg: number;
  }) => {
  actions.updateSceneProps({ spawn });
  log('info', '📍 SceneEditor: Updated scene spawn point:', spawn);
  }, [actions]);

  const getItemById = useCallback((itemId: string) => {
    return state.manifest.items.find(item => item.id === itemId);
  }, [state.manifest.items]);

  const getItemsByCategory = useCallback((category: string) => {
    return state.manifest.items.filter(item => {
      const itemCategory = typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey || '';
      return itemCategory === category;
    });
  }, [state.manifest.items]);

  const isItemLocked = useCallback((itemId: string) => {
    const item = getItemById(itemId);
    return item?.locked || false;
  }, [getItemById]);

  const isItemSelectable = useCallback((itemId: string) => {
    const item = getItemById(itemId);
    return item?.selectable !== false; // Default to true if not specified
  }, [getItemById]);

  return {
    // State
    manifest: state.manifest,
    version: state.version,
    isDirty: state.isDirty,
    isSaving: state.isSaving,
    connectionStatus: state.connectionStatus,
    collaborators: state.collaborators,
    
    // Transform operations
    updateItemTransform,
    updateItemPosition,
    updateItemRotation,
    updateItemScale,
    
    // Item operations
    deleteItem,
    duplicateItem,
    updateItemMaterial,
    updateItemProperties,
    
    // Scene operations
    updateSceneExposure,
    updateSceneEnvironment,
    updateSceneSpawn,
    
    // Queries
    getItemById,
    getItemsByCategory,
    isItemLocked,
    isItemSelectable,
    
    // Actions
    saveScene: actions.saveScene,
    connectToScene: actions.connectToScene,
    disconnectFromScene: actions.disconnectFromScene
  };
}