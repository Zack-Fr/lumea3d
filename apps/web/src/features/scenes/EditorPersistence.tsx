import { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { useSelection } from './SelectionContext';

interface CameraState {
  position: [number, number, number];
  rotation: [number, number, number];
  zoom: number;
  target?: [number, number, number];
}

interface EditorState {
  camera: CameraState;
  transformMode: 'translate' | 'rotate' | 'scale';
  showGrid: boolean;
  showPerformance: boolean;
  lightingMode: 'realistic' | 'flat';
  selectionMode: 'select' | 'navigate';
  layerStates: Record<string, {
    visible: boolean;
    locked: boolean;
    expanded: boolean;
  }>;
  selectedObjectId?: string;
  cameraMode: 'orbit' | 'fps';
}

interface EditorPersistenceProps {
  enabled?: boolean;
  sceneId?: string;
  autoSaveInterval?: number; // in milliseconds
  onStateLoaded?: (state: EditorState) => void;
  onStateSaved?: (state: EditorState) => void;
}

export function useEditorPersistence({
  enabled = true,
  sceneId = 'default',
  autoSaveInterval = 30000, // 30 seconds
  onStateLoaded,
  onStateSaved
}: EditorPersistenceProps = {}) {
  const { camera } = useThree();
  const { selection } = useSelection();
  const lastSaveTime = useRef<number>(0);
  const autoSaveTimer = useRef<number | null>(null);

  // Storage key based on scene ID
  const getStorageKey = useCallback((key: string) => {
    return `lumea_editor_${sceneId}_${key}`;
  }, [sceneId]);

  // Save current camera state
  const saveCameraState = useCallback((): CameraState => {
    return {
      position: camera.position.toArray() as [number, number, number],
      rotation: camera.rotation.toArray().slice(0, 3) as [number, number, number],
      zoom: camera.zoom,
    };
  }, [camera]);

  // Load camera state
  const loadCameraState = useCallback((state: CameraState) => {
    camera.position.fromArray(state.position);
    camera.rotation.fromArray(state.rotation);
    camera.zoom = state.zoom;
    camera.updateProjectionMatrix();
    console.log('📹 Camera state loaded:', state);
  }, [camera]);

  // Save complete editor state
  const saveEditorState = useCallback((additionalState: Partial<EditorState> = {}) => {
    if (!enabled) return;

    const state: EditorState = {
      camera: saveCameraState(),
      transformMode: selection.transformMode,
      showGrid: true, // These would come from actual state
      showPerformance: false,
      lightingMode: 'realistic',
      selectionMode: 'select',
      layerStates: {},
      selectedObjectId: selection.selectedObject?.itemId,
      cameraMode: 'orbit',
      ...additionalState
    };

    try {
      localStorage.setItem(getStorageKey('editor_state'), JSON.stringify(state));
      lastSaveTime.current = Date.now();
      onStateSaved?.(state);
      console.log('💾 Editor state saved for scene:', sceneId);
    } catch (error) {
      console.error('❌ Failed to save editor state:', error);
    }
  }, [
    enabled,
    saveCameraState,
    selection.transformMode,
    selection.selectedObject,
    sceneId,
    getStorageKey,
    onStateSaved
  ]);

  // Load complete editor state
  const loadEditorState = useCallback((): EditorState | null => {
    if (!enabled) return null;

    try {
      const savedState = localStorage.getItem(getStorageKey('editor_state'));
      if (savedState) {
        const state: EditorState = JSON.parse(savedState);
        
        // Load camera state
        loadCameraState(state.camera);
        
        onStateLoaded?.(state);
        console.log('📂 Editor state loaded for scene:', sceneId);
        return state;
      }
    } catch (error) {
      console.error('❌ Failed to load editor state:', error);
    }
    
    return null;
  }, [enabled, getStorageKey, loadCameraState, onStateLoaded, sceneId]);

  // Clear stored state
  const clearEditorState = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey('editor_state'));
      console.log('🗑️ Editor state cleared for scene:', sceneId);
    } catch (error) {
      console.error('❌ Failed to clear editor state:', error);
    }
  }, [getStorageKey, sceneId]);

  // Save camera position separately (for quick saves)
  const saveCameraPosition = useCallback((name: string = 'bookmark') => {
    if (!enabled) return;

    const cameraState = saveCameraState();
    const bookmarks = getStorageKey('camera_bookmarks');
    
    try {
      const existing = localStorage.getItem(bookmarks);
      const bookmarkData = existing ? JSON.parse(existing) : {};
      
      bookmarkData[name] = {
        ...cameraState,
        timestamp: Date.now(),
        name
      };
      
      localStorage.setItem(bookmarks, JSON.stringify(bookmarkData));
      console.log(`📍 Camera position saved as "${name}"`);
    } catch (error) {
      console.error('❌ Failed to save camera bookmark:', error);
    }
  }, [enabled, saveCameraState, getStorageKey]);

  // Load camera position from bookmark
  const loadCameraPosition = useCallback((name: string = 'bookmark') => {
    if (!enabled) return false;

    try {
      const bookmarks = localStorage.getItem(getStorageKey('camera_bookmarks'));
      if (bookmarks) {
        const bookmarkData = JSON.parse(bookmarks);
        const bookmark = bookmarkData[name];
        
        if (bookmark) {
          loadCameraState(bookmark);
          console.log(`📍 Camera position loaded from "${name}"`);
          return true;
        }
      }
    } catch (error) {
      console.error('❌ Failed to load camera bookmark:', error);
    }
    
    return false;
  }, [enabled, getStorageKey, loadCameraState]);

  // List available camera bookmarks
  const getCameraBookmarks = useCallback(() => {
    try {
      const bookmarks = localStorage.getItem(getStorageKey('camera_bookmarks'));
      if (bookmarks) {
        return Object.keys(JSON.parse(bookmarks));
      }
    } catch (error) {
      console.error('❌ Failed to get camera bookmarks:', error);
    }
    return [];
  }, [getStorageKey]);

  // Auto-save functionality
  useEffect(() => {
    if (!enabled || !autoSaveInterval) return;

    const setupAutoSave = () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
      }

      autoSaveTimer.current = setInterval(() => {
        const now = Date.now();
        // Only save if enough time has passed since last manual save
        if (now - lastSaveTime.current > autoSaveInterval) {
          saveEditorState();
          console.log('💾 Auto-saved editor state');
        }
      }, autoSaveInterval);
    };

    setupAutoSave();

    return () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
      }
    };
  }, [enabled, autoSaveInterval, saveEditorState]);

  // Load state on mount
  useEffect(() => {
    if (enabled) {
      loadEditorState();
    }
  }, [enabled, loadEditorState]);

  return {
    saveEditorState,
    loadEditorState,
    clearEditorState,
    saveCameraPosition,
    loadCameraPosition,
    getCameraBookmarks,
    isEnabled: enabled
  };
}

// React component for editor persistence
export function EditorPersistence({
  enabled = true,
  sceneId = 'default',
  autoSaveInterval = 30000,
  onStateLoaded,
  onStateSaved
}: EditorPersistenceProps) {
  const persistence = useEditorPersistence({
    enabled,
    sceneId,
    autoSaveInterval,
    onStateLoaded,
    onStateSaved
  });

  // Save state on page unload
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      persistence.saveEditorState();
      console.log('💾 Editor state saved before page unload');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, persistence]);

  return null; // This component doesn't render anything
}

export default EditorPersistence;