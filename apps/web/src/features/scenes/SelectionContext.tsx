import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Object3D, Vector3, Euler } from 'three';
import * as THREE from 'three';
import { log } from '../../utils/logger';
import { scenesApi } from '../../services/scenesApi';
import { useSceneContext } from '../../contexts/SceneContext';

export interface SelectedObject {
  id: string;
  object: Object3D;
  itemId: string;
  category: string;
  originalPosition: Vector3;
  originalRotation: Euler;
  originalScale: Vector3;
  transformUpdateCount?: number; // Force React updates when transforms change
}

export interface SelectionState {
  selectedObject: SelectedObject | null;
  transformMode: 'translate' | 'rotate' | 'scale';
  isTransforming: boolean;
}

export interface SelectionContextType {
  selection: SelectionState;
  selectObject: (object: Object3D) => void;
  deselectObject: () => void;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  setIsTransforming: (transforming: boolean) => void;
  updateObjectTransform: (position?: Vector3, rotation?: Euler, scale?: Vector3) => void;
  deleteObject: () => void;
}

const SelectionContext = createContext<SelectionContextType | null>(null);

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  return context;
}

interface SelectionProviderProps {
  children: ReactNode;
}

export function SelectionProvider({ children }: SelectionProviderProps) {
  const { sceneId, manifest, refreshScene } = useSceneContext();
  const [selection, setSelection] = useState<SelectionState>({
    selectedObject: null,
    transformMode: 'translate',
    isTransforming: false,
  });

  const selectObject = useCallback((object: Object3D) => {
    // Check if object has the required userData for selection
    const userData = object.userData;
    if (!userData || !userData.itemId || !userData.selectable) {
      log('warn', '⚠️ Object is not selectable:', object.name);
      return;
    }

    if (userData.locked) {
      log('warn', '🔒 Object is locked:', userData.itemId);
      return;
    }

    // For light helpers, we'll transform the helper but sync with the actual light
    let targetObject = object;
    let actualLight = null;
    
    if (userData.isHelper && userData.actualLightObject) {
      actualLight = userData.actualLightObject;
      // Use the helper for transform controls (it's in the scene graph)
      // But we'll sync changes to the actual light
      targetObject = object;
      log('info', '💡 Light helper selected, will sync transforms with actual light:', userData.originalLight);
    } else {
      log('info', '🎯 Object selected:', userData.itemId);
    }

    const selectedObject: SelectedObject = {
      id: object.uuid,
      object: targetObject, // Use helper for transform controls
      itemId: userData.itemId,
      category: userData.category,
      originalPosition: targetObject.position.clone(),
      originalRotation: targetObject.rotation.clone(),
      originalScale: targetObject.scale.clone(),
      transformUpdateCount: 0,
      // Store reference to actual light for syncing
      ...(actualLight && { actualLight })
    };

    setSelection(prev => ({
      ...prev,
      selectedObject,
      isTransforming: false,
    }));
  }, []);

  const deselectObject = useCallback(() => {
  log('info', '🎯 Object deselected');
    setSelection(prev => ({
      ...prev,
      selectedObject: null,
      isTransforming: false,
    }));
  }, []);

  const setTransformMode = useCallback((mode: 'translate' | 'rotate' | 'scale') => {
  log('debug', '🔧 Transform mode changed to:', mode);
    setSelection(prev => ({
      ...prev,
      transformMode: mode,
    }));
  }, []);

  const setIsTransforming = useCallback((transforming: boolean) => {
    setSelection(prev => ({
      ...prev,
      isTransforming: transforming,
    }));
  }, []);

  const updateObjectTransform = useCallback((
    position?: Vector3,
    rotation?: Euler,
    scale?: Vector3
  ) => {
    setSelection(prev => {
      if (!prev.selectedObject) return prev;
      
      const { object } = prev.selectedObject;
      const actualLight = (prev.selectedObject as any).actualLight;

      if (position) {
        object.position.copy(position);
        // Sync position to actual light if this is a light helper
        if (actualLight) {
          actualLight.position.copy(position);
          log('debug', '💡 Synced light position:', position.toArray());
        }
      }
      if (rotation) {
        object.rotation.copy(rotation);
        // Sync rotation to actual light if this is a light helper
        if (actualLight) {
          actualLight.rotation.copy(rotation);
          log('debug', '💡 Synced light rotation:', rotation.toArray());
        }
      }
      if (scale) {
        object.scale.copy(scale);
        // Note: lights don't typically need scale syncing
      }

      log('debug', '🔄 Object transform updated:', {
        itemId: prev.selectedObject.itemId,
        position: object.position.toArray(),
        rotation: object.rotation.toArray(),
        scale: object.scale.toArray(),
        isLight: !!actualLight
      });
      
      // Increment transform counter to trigger React updates
      const updatedSelection = {
        ...prev.selectedObject,
        transformUpdateCount: (prev.selectedObject.transformUpdateCount || 0) + 1
      };
      
      return {
        ...prev,
        selectedObject: updatedSelection
      };
    });
  }, []);

  const deleteObject = useCallback(async () => {
    if (!selection.selectedObject) return;

    const { object, itemId } = selection.selectedObject;
    
    log('info', '🗑️ Deleting object:', itemId);

    // STEP 1: First clear the selection to detach transform controls
    setSelection(prev => ({
      ...prev,
      selectedObject: null,
      isTransforming: false,
    }));

    // STEP 2: Small delay to allow transform controls to detach
    setTimeout(async () => {
      try {
        // STEP 3: Try to delete from backend if it's a scene item (not debug object)
        const isDebugObject = object.userData?.meta?.isDebug;
        if (sceneId && !isDebugObject) {
          try {
            await scenesApi.removeItem(sceneId, itemId, manifest?.scene?.version?.toString());
            log('info', '✅ Object deleted from backend:', itemId);
            
            // Refresh scene to update manifest and object counts
            refreshScene();
          } catch (apiError) {
            log('error', '❌ Failed to delete object from backend:', apiError);
            // Continue with local deletion even if API fails
          }
        }
        
        // STEP 4: Remove object from scene graph
        if (object.parent) {
          object.parent.remove(object);
          log('debug', '🗑️ Object removed from scene graph');
        }

        // STEP 5: Clean up geometry and materials
        if (object instanceof THREE.Mesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
          log('debug', '🗑️ Object geometry and materials disposed');
        }

        log('info', '✅ Object deleted successfully:', itemId);
      } catch (error) {
        log('error', '❌ Error during object deletion:', error);
      }
    }, 10); // Small delay to ensure transform controls detach first
  }, [selection.selectedObject, sceneId, manifest?.scene?.version, refreshScene]);

  return (
    <SelectionContext.Provider
      value={{
        selection,
        selectObject,
        deselectObject,
        setTransformMode,
        setIsTransforming,
        updateObjectTransform,
        deleteObject,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}