import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { SceneManifestV2, SceneDelta, DeltaOperation } from '../../services/scenesApi';

interface ScenePersistenceState {
  manifest: SceneManifestV2;
  version: number;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: number | null;
  pendingOps: DeltaOperation[];
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  collaborators: Array<{
    id: string;
    name: string;
    role: string;
    lastSeen: number;
  }>;
}

type ScenePersistenceAction =
  | { type: 'APPLY_DELTA'; payload: SceneDelta }
  | { type: 'ADD_PENDING_OP'; payload: DeltaOperation }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS'; payload: { version: number; timestamp: number } }
  | { type: 'SAVE_ERROR'; payload: string }
  | { type: 'CONNECTION_STATUS'; payload: ScenePersistenceState['connectionStatus'] }
  | { type: 'UPDATE_COLLABORATORS'; payload: ScenePersistenceState['collaborators'] }
  | { type: 'RESET_DIRTY' };

interface ScenePersistenceContextType {
  state: ScenePersistenceState;
  actions: {
    applyDelta: (delta: SceneDelta) => void;
    addItem: (item: any) => void;
    updateItem: (id: string, updates: any) => void;
    removeItem: (id: string) => void;
    updateSceneProps: (props: any) => void;
    saveScene: () => Promise<void>;
    connectToScene: (sceneId: string) => void;
    disconnectFromScene: () => void;
  };
}

const ScenePersistenceContext = createContext<ScenePersistenceContextType | null>(null);

function scenePersistenceReducer(
  state: ScenePersistenceState,
  action: ScenePersistenceAction
): ScenePersistenceState {
  switch (action.type) {
    case 'APPLY_DELTA':
      return applyDeltaToState(state, action.payload);
    
    case 'ADD_PENDING_OP':
      return {
        ...state,
        pendingOps: [...state.pendingOps, action.payload],
        isDirty: true
      };
    
    case 'SAVE_START':
      return {
        ...state,
        isSaving: true
      };
    
    case 'SAVE_SUCCESS':
      return {
        ...state,
        isSaving: false,
        isDirty: false,
        version: action.payload.version,
        lastSaved: action.payload.timestamp,
        pendingOps: []
      };
    
    case 'SAVE_ERROR':
      return {
        ...state,
        isSaving: false
      };
    
    case 'CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload
      };
    
    case 'UPDATE_COLLABORATORS':
      return {
        ...state,
        collaborators: action.payload
      };
    
    case 'RESET_DIRTY':
      return {
        ...state,
        isDirty: false
      };
    
    default:
      return state;
  }
}

function applyDeltaToState(state: ScenePersistenceState, delta: SceneDelta): ScenePersistenceState {
  let newManifest = { ...state.manifest };
  
  for (const op of delta.ops) {
    switch (op.type) {
      case 'add':
        // Add or update item
        if (op.item) {
          const itemIndex = newManifest.items.findIndex(item => item.id === op.item!.id);
          if (itemIndex >= 0) {
            newManifest.items[itemIndex] = { ...op.item };
          } else {
            newManifest.items = [...newManifest.items, op.item];
          }
        }
        break;
      
      case 'remove':
        newManifest.items = newManifest.items.filter(item => item.id !== op.id);
        break;
      
      case 'update':
        const updateIndex = newManifest.items.findIndex(item => item.id === op.id);
        if (updateIndex >= 0) {
          const existingItem = newManifest.items[updateIndex];
          newManifest.items[updateIndex] = {
            ...existingItem,
            ...(op.transform && {
              transform: {
                ...existingItem.transform,
                ...op.transform
              }
            }),
            ...(op.material && { material: { ...existingItem.material, ...op.material } }),
            ...(op.selectable !== undefined && { selectable: op.selectable }),
            ...(op.locked !== undefined && { locked: op.locked }),
            ...(op.meta && { meta: { ...existingItem.meta, ...op.meta } })
          };
        }
        break;
      
      case 'scene':
        newManifest = {
          ...newManifest,
          ...(op.exposure !== undefined && { exposure: op.exposure }),
          ...(op.env && { env: { ...newManifest.env, ...op.env } }),
          ...(op.spawn && { spawn: { ...newManifest.spawn, ...op.spawn } })
        };
        break;
      
      case 'category_add':
        if (op.key && op.category) {
          newManifest.categories = {
            ...newManifest.categories,
            [op.key as string]: op.category as any // Type assertion to handle delta type flexibility
          };
        }
        break;
      
      case 'category_remove':
        if (op.key) {
          const { [op.key as string]: removed, ...remainingCategories } = newManifest.categories;
          newManifest.categories = remainingCategories;
        }
        break;
    }
  }
  
  return {
    ...state,
    manifest: newManifest,
    version: delta.v
  };
}

interface ScenePersistenceProviderProps {
  children: React.ReactNode;
  initialManifest: SceneManifestV2;
  sceneId: string;
  userId: string;
  userRole: string;
}

export function ScenePersistenceProvider({
  children,
  initialManifest,
  sceneId,
  userId,
  userRole
}: ScenePersistenceProviderProps) {
  const [state, dispatch] = useReducer(scenePersistenceReducer, {
    manifest: initialManifest,
    version: 1,
    isDirty: false,
    isSaving: false,
    lastSaved: null,
    pendingOps: [],
    connectionStatus: 'disconnected',
    collaborators: []
  });

  const wsRef = useRef<WebSocket | null>(null);
  const saveTimeoutRef = useRef<number>();

  // Auto-save functionality
  useEffect(() => {
    if (state.isDirty && !state.isSaving) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set new timeout for auto-save (5 seconds after last change)
      saveTimeoutRef.current = window.setTimeout(() => {
        saveScene();
      }, 5000);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.isDirty, state.isSaving]);

  const connectToScene = useCallback((sceneId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    dispatch({ type: 'CONNECTION_STATUS', payload: 'connecting' });

    // WebSocket connection for real-time collaboration
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/scenes/${sceneId}`;
    
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      dispatch({ type: 'CONNECTION_STATUS', payload: 'connected' });
      console.log('🔗 ScenePersistence: Connected to scene WebSocket');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const delta: SceneDelta = JSON.parse(event.data);
        console.log('📨 ScenePersistence: Received delta:', delta);
        dispatch({ type: 'APPLY_DELTA', payload: delta });
      } catch (error) {
        console.error('❌ ScenePersistence: Failed to parse WebSocket message:', error);
      }
    };

    wsRef.current.onerror = () => {
      dispatch({ type: 'CONNECTION_STATUS', payload: 'error' });
      console.error('❌ ScenePersistence: WebSocket error');
    };

    wsRef.current.onclose = () => {
      dispatch({ type: 'CONNECTION_STATUS', payload: 'disconnected' });
      console.log('🔌 ScenePersistence: WebSocket disconnected');
    };
  }, []);

  const disconnectFromScene = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const saveScene = useCallback(async () => {
    if (state.isSaving || state.pendingOps.length === 0) {
      return;
    }

    dispatch({ type: 'SAVE_START' });

    try {
      console.log('💾 ScenePersistence: Saving scene with ops:', state.pendingOps);

      const response = await fetch(`/api/scenes/${sceneId}/deltas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseVersion: state.version,
          ops: state.pendingOps,
          actor: { id: userId, role: userRole }
        })
      });

      if (!response.ok) {
        throw new Error(`Save failed: ${response.statusText}`);
      }

      const result = await response.json();
      dispatch({
        type: 'SAVE_SUCCESS',
        payload: {
          version: result.version,
          timestamp: Date.now()
        }
      });

      console.log('✅ ScenePersistence: Scene saved successfully');
    } catch (error) {
      console.error('❌ ScenePersistence: Save failed:', error);
      dispatch({ 
        type: 'SAVE_ERROR', 
        payload: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [sceneId, userId, userRole, state.isSaving, state.pendingOps, state.version]);

  const addItem = useCallback((item: any) => {
    const op: DeltaOperation = { type: 'add', item };
    dispatch({ type: 'ADD_PENDING_OP', payload: op });
  }, []);

  const updateItem = useCallback((id: string, updates: any) => {
    const op: DeltaOperation = { type: 'update', id, ...updates };
    dispatch({ type: 'ADD_PENDING_OP', payload: op });
  }, []);

  const removeItem = useCallback((id: string) => {
    const op: DeltaOperation = { type: 'remove', id };
    dispatch({ type: 'ADD_PENDING_OP', payload: op });
  }, []);

  const updateSceneProps = useCallback((props: any) => {
    const op: DeltaOperation = { type: 'scene', ...props };
    dispatch({ type: 'ADD_PENDING_OP', payload: op });
  }, []);

  const applyDelta = useCallback((delta: SceneDelta) => {
    dispatch({ type: 'APPLY_DELTA', payload: delta });
  }, []);

  const contextValue: ScenePersistenceContextType = {
    state,
    actions: {
      applyDelta,
      addItem,
      updateItem,
      removeItem,
      updateSceneProps,
      saveScene,
      connectToScene,
      disconnectFromScene
    }
  };

  return (
    <ScenePersistenceContext.Provider value={contextValue}>
      {children}
    </ScenePersistenceContext.Provider>
  );
}

export function useScenePersistence() {
  const context = useContext(ScenePersistenceContext);
  if (!context) {
    throw new Error('useScenePersistence must be used within a ScenePersistenceProvider');
  }
  return context;
}