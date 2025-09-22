import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Delta operation types matching the backend
export interface Transform {
  position?: [number, number, number];
  rotation_euler?: [number, number, number];
  scale?: [number, number, number];
}

export interface UpdateItemDeltaOp {
  op: 'update_item';
  id: string;
  transform?: Transform;
}

export interface AddItemDeltaOp {
  op: 'add_item';
  assetId: string;
  categoryKey?: string;
  model?: string;
  transform: Transform;
}

export interface RemoveItemDeltaOp {
  op: 'remove_item';
  id: string;
}

export interface UpdatePropsDeltaOp {
  op: 'update_props';
  [key: string]: any;
}

export interface UpdateMaterialDeltaOp {
  op: 'update_material';
  id: string;
  materialOverrides: Record<string, any>;
}

export type DeltaOp = UpdateItemDeltaOp | AddItemDeltaOp | RemoveItemDeltaOp | UpdatePropsDeltaOp | UpdateMaterialDeltaOp;

export interface SaveState {
  isSaving: boolean;
  lastSaved?: Date;
  saveError?: string;
  currentVersion: number;
  isOffline: boolean;
}

interface SaveQueueState {
  // Queue management
  queue: DeltaOp[];
  pending: boolean;
  sceneId?: string;
  saveState: SaveState;
  
  // Core operations
  stage: (op: DeltaOp) => void;
  flush: () => Promise<void>;
  setSceneId: (sceneId: string, version: number) => void;
  
  // Save state management
  setSaveState: (state: Partial<SaveState>) => void;
  
  // Manual save
  createSnapshot: (label: string) => Promise<void>;
  
  // Conflict resolution
  resync: () => Promise<void>;
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: number;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

export const useSaveQueueStore = create<SaveQueueState>()(
  subscribeWithSelector((set, get) => {
    let debouncedFlush: (() => void) | null = null;

    const flush = async () => {
      const { queue, pending, sceneId, saveState } = get();
      
      if (!queue.length || pending || !sceneId) {
        return;
      }
      
      // Mark as pending and saving
      set({ 
        pending: true, 
        saveState: { ...saveState, isSaving: true, saveError: undefined }
      });

      let operations: DeltaOp[] = [];
      
      try {
        // Copy and clear queue
        operations = [...queue];
        set({ queue: [] });

        console.log('🔍 Sending delta operations:', operations);
        console.log('🔍 Request body:', JSON.stringify({ operations }, null, 2));

        // API call to apply delta operations
        const apiBaseUrl = import.meta?.env?.VITE_API_URL || 'http://192.168.1.10:3000';
        const response = await fetch(`${apiBaseUrl}/scenes/${sceneId}/items`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'If-Match': saveState.currentVersion.toString(),
            // Add auth header - try multiple possible token keys
            'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access_token') || ''}`,
          },
          body: JSON.stringify({ operations }),
        });

        if (response.status === 412) {
          // Precondition failed - version conflict
          console.warn('🔄 Save conflict detected, triggering resync...');
          set({
            pending: false,
            saveState: { 
              ...get().saveState, 
              isSaving: false, 
              saveError: 'Version conflict - syncing changes...' 
            }
          });
          
          // Re-enqueue operations and resync
          set(state => ({ queue: [...operations, ...state.queue] }));
          get().resync();
          return;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Save request failed:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            url: response.url
          });

          // Special handling: drop operations referencing missing temp IDs to avoid infinite 404 loops
          if (response.status === 404) {
            try {
              // Try to extract missing item id from backend message
              // e.g. "Scene item point-light-1758400944888 not found"
              const match = /Scene item\s+([^\s"']+)\s+not found/i.exec(errorText);
              const missingId = match?.[1];
              if (missingId) {
                const filtered = operations.filter(op => {
                  const opId = (op as any).id as string | undefined;
                  return !opId || opId !== missingId;
                });

                console.warn('🧹 Dropping stale operations for missing itemId:', missingId);

                // Track missing IDs globally to prevent re-staging
                try {
                  (window as any).__lumeaNotFoundIds = (window as any).__lumeaNotFoundIds || new Set<string>();
                  (window as any).__lumeaNotFoundIds.add(missingId);
                } catch {}

                // Re-enqueue only the remaining operations
                set(state => ({ queue: [...filtered, ...state.queue] }));
                
                // Update save state and exit gracefully (no throw)
                set({
                  pending: false,
                  saveState: {
                    ...get().saveState,
                    isSaving: false,
                    saveError: `Removed stale item ${missingId} from save queue`,
                  },
                });
                return; // Do not fall-through to generic error handling
              }
            } catch (parseErr) {
              // fallback to generic handling
              console.warn('⚠️ Failed to parse 404 error body:', parseErr);
            }
          }

          throw new Error(`Save failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        
        // Update version and save state
        set({
          pending: false,
          saveState: {
            ...saveState,
            isSaving: false,
            lastSaved: new Date(),
            currentVersion: result.version,
            saveError: undefined,
          },
        });

        console.log(`💾 Saved ${operations.length} operations, new version: ${result.version}`);
        
      } catch (error) {
        console.error('❌ Save failed:', error);
        
        // Re-enqueue failed operations
        set(state => ({ queue: [...operations, ...state.queue] }));
        
        // Update save state with error
        set({
          pending: false,
          saveState: { 
            ...get().saveState, 
            isSaving: false, 
            saveError: error instanceof Error ? error.message : 'Save failed' 
          }
        });
        
        // Check if offline
        if (!navigator.onLine) {
          set(state => ({
            saveState: { ...state.saveState, isOffline: true }
          }));
        }
      }
    };

    // Initialize debounced flush
    debouncedFlush = debounce(flush, 400);

    return {
      queue: [],
      pending: false,
      sceneId: undefined,
      saveState: {
        isSaving: false,
        currentVersion: 1,
        isOffline: false,
      },

      stage: (op: DeltaOp) => {
        set(state => ({ queue: [...state.queue, op] }));
        
        // Trigger debounced flush
        if (debouncedFlush) {
          debouncedFlush();
        }
      },

      flush,

      setSceneId: (sceneId: string, version: number) => {
        set({
          sceneId,
          saveState: { ...get().saveState, currentVersion: version }
        });
      },

      setSaveState: (state: Partial<SaveState>) => {
        set(prevState => ({
          saveState: { ...prevState.saveState, ...state }
        }));
      },

      createSnapshot: async (label: string) => {
        const { sceneId } = get();
        
        if (!sceneId) {
          throw new Error('No scene ID set');
        }

        // First flush any pending changes
        await flush();

        try {
          set(prevState => ({
            saveState: { ...prevState.saveState, isSaving: true }
          }));
          const base = import.meta?.env?.VITE_API_URL || 'http://localhost:3000';
          const response = await fetch(`${base}/scenes/${sceneId}/snapshots`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access_token') || ''}`,
            },
            body: JSON.stringify({ label }),
          });

          if (!response.ok) {
            throw new Error(`Snapshot creation failed: ${response.statusText}`);
          }

          const result = await response.json();
          
          set(prevState => ({
            saveState: { 
              ...prevState.saveState, 
              isSaving: false,
              lastSaved: new Date(),
            }
          }));

          console.log(`📸 Created snapshot: ${result.label}`);
          
        } catch (error) {
          console.error('❌ Snapshot creation failed:', error);
          
          set(prevState => ({
            saveState: { 
              ...prevState.saveState, 
              isSaving: false,
              saveError: error instanceof Error ? error.message : 'Snapshot failed' 
            }
          }));
          
          throw error;
        }
      },

      resync: async () => {
        const { sceneId } = get();
        
        if (!sceneId) {
          return;
        }

        try {
          // Fetch latest scene version
          const apiBaseUrl = import.meta?.env?.VITE_API_URL || 'http://192.168.1.10:3000';
          const response = await fetch(`${apiBaseUrl}/scenes/${sceneId}/version`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access_token') || ''}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Resync failed: ${response.statusText}`);
          }

          const { version } = await response.json();
          
          // Update version and clear conflict error
          set(prevState => ({
            saveState: { 
              ...prevState.saveState, 
              currentVersion: version,
              saveError: undefined,
            }
          }));

          console.log(`🔄 Resynced to version ${version}`);
          
          // Trigger flush to apply any re-enqueued operations
          if (get().queue.length > 0 && debouncedFlush) {
            debouncedFlush();
          }
          
        } catch (error) {
          console.error('❌ Resync failed:', error);
          
          set(prevState => ({
            saveState: { 
              ...prevState.saveState,
              saveError: error instanceof Error ? error.message : 'Resync failed' 
            }
          }));
        }
      },
    };
  })
);

// Network status monitoring
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useSaveQueueStore.getState().setSaveState({ isOffline: false });
    
    // Trigger flush if there are pending operations
    const { queue, flush } = useSaveQueueStore.getState();
    if (queue.length > 0) {
      flush();
    }
  });

  window.addEventListener('offline', () => {
    useSaveQueueStore.getState().setSaveState({ isOffline: true });
  });
}

// Persist unsent operations to localStorage
if (typeof window !== 'undefined') {
  useSaveQueueStore.subscribe(
    (state) => state.queue,
    (queue) => {
      if (queue.length > 0) {
        localStorage.setItem('lumea_unsent_operations', JSON.stringify(queue));
      } else {
        localStorage.removeItem('lumea_unsent_operations');
      }
    }
  );

  // Restore unsent operations on load
  const savedOperations = localStorage.getItem('lumea_unsent_operations');
  if (savedOperations) {
    try {
      const operations = JSON.parse(savedOperations) as DeltaOp[];
      // Sanitize: drop ops that reference temporary IDs (e.g., lights created but not yet persisted)
      const isTempId = (id?: string) => !!id && (id.startsWith('temp_') || id.startsWith('tmp-') || id.startsWith('point-light-') || id.startsWith('spot-light-') || id.startsWith('directional-light-'));
      const sanitized = (operations || []).filter(op => {
        if ((op as any).id && isTempId((op as any).id)) {
          console.warn('🧹 Dropping stale unsent op for temp id:', (op as any).id);
          return false;
        }
        return true;
      });
      useSaveQueueStore.setState({ queue: sanitized });
    } catch (error) {
      console.error('❌ Failed to restore unsent operations:', error);
      localStorage.removeItem('lumea_unsent_operations');
    }
  }
}
