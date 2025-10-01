import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Object3D, Vector3, Euler } from 'three';
import { log } from '../../utils/logger';
import { scenesApi } from '../../services/scenesApi';
import { instancedTransformProxyManager } from './InstancedTransformProxy';
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
    
    console.log('🎯 Selection attempt:', {
      objectName: object.name,
      hasUserData: !!userData,
      itemId: userData?.itemId,
      selectable: userData?.selectable,
      isLight: userData?.meta?.isLight,
      isHelper: userData?.isHelper,
      userData: userData
    });
    
    if (!userData || !userData.itemId || !userData.selectable) {
      console.warn('⚠️ Object is not selectable:', {
        objectName: object.name,
        missingUserData: !userData,
        missingItemId: !userData?.itemId,
        notSelectable: !userData?.selectable,
        userData
      });
      log('warn', '⚠️ Object is not selectable:', object.name);
      return;
    }

    if (userData.locked) {
      log('warn', '🔒 Object is locked:', userData.itemId);
      return;
    }

    // For light helpers, we'll transform the actual light directly
    let targetObject = object;
    let isLightHelper = false;
    
    if (userData.isHelper && userData.actualLightObject) {
      // Transform the actual light directly - the helper will follow automatically
      targetObject = userData.actualLightObject;
      isLightHelper = true;
      log('info', '💡 Light helper selected, will transform actual light:', userData.originalLight);
    } else {
      log('info', '🎯 Object selected:', userData.itemId);
    }

    const selectedObject: SelectedObject = {
      id: object.uuid,
      object: targetObject, // Use actual light for transform controls if it's a helper
      itemId: userData.itemId,
      category: userData.category,
      originalPosition: targetObject.position.clone(),
      originalRotation: targetObject.rotation.clone(),
      originalScale: targetObject.scale.clone(),
      transformUpdateCount: 0,
      // Store whether this was selected via helper for reference
      ...(isLightHelper && { isLightHelper: true, helperObject: object })
    };

    setSelection(prev => ({
      ...prev,
      selectedObject,
      isTransforming: false,
    }));
  }, []);

  const deselectObject = useCallback(() => {
    log('info', '🎯 Object deselected');
    
    setSelection(prev => {
      // Clean up instanced mesh proxy if it exists
      if (prev.selectedObject && (prev.selectedObject as any).isInstancedMesh) {
        const selectionObj = prev.selectedObject as any;
        if (selectionObj.cleanup && typeof selectionObj.cleanup === 'function') {
          selectionObj.cleanup();
          log('info', '🧹 Cleaned up instanced mesh proxy on deselect');
        }
      }
      
      return {
        ...prev,
        selectedObject: null,
        isTransforming: false,
      };
    });
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
      const isLightHelper = (prev.selectedObject as any).isLightHelper;
      const helperObject = (prev.selectedObject as any).helperObject;
      const isInstancedMesh = (prev.selectedObject as any).isInstancedMesh;
      const assetId = (prev.selectedObject as any).assetId;

      if (position) {
        console.log('🔄 Transform position update:', {
          objectName: object.name,
          newPosition: position.toArray(),
          isLight: object.type.includes('Light'),
          isLightHelper,
          isInstancedMesh
        });
        
        // Update the object (which is now the actual light if selected via helper)
        object.position.copy(position);
        
        // Force matrix world update for immediate visual feedback
        object.updateMatrixWorld(true);
        
        // If this was a light selected via helper, update the helper's visual representation
        if (isLightHelper && helperObject && 'update' in helperObject && typeof helperObject.update === 'function') {
          helperObject.update();
          console.log('💡 Helper visual updated after light position change');
        }
      }
      if (rotation) {
        object.rotation.copy(rotation);
        object.updateMatrixWorld(true);
      }
      if (scale) {
        object.scale.copy(scale);
        object.updateMatrixWorld(true);
      }

      // CRITICAL: Sync proxy transforms back to instancing pool
      if (isInstancedMesh && prev.selectedObject && prev.selectedObject.itemId && assetId) {
        const itemId = prev.selectedObject.itemId;
        const proxy = instancedTransformProxyManager.getProxy(itemId);
        if (proxy) {
          proxy.syncToPool();
          console.log('🏊 Synced instanced mesh proxy to pool:', itemId);
        } else {
          console.warn('⚠️ No proxy found for instanced mesh:', itemId);
        }
      }

      log('debug', '🔄 Object transform updated:', {
        itemId: prev.selectedObject.itemId,
        position: object.position.toArray(),
        rotation: object.rotation.toArray(),
        scale: object.scale.toArray(),
        isLight: object.type.includes('Light'),
        isInstancedMesh
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
    

    const isTemporaryId = itemId?.startsWith('temp_') || false;
    if (isTemporaryId) {
      log('error', '❌ CRITICAL: Attempting to delete object with temporary ID!', {
        itemId,
        objectName: object.name,
        objectUserData: object.userData
      });
    }
    
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
            
            // DON'T refresh scene automatically - this causes camera reset and scene reload
            // The object is already removed from the scene graph below
            // refreshScene(); // REMOVED: This was causing camera reset
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

        // STEP 5: Skip geometry/material disposal to prevent WebGL context loss
        // GLB assets are shared/cloned, disposing them causes context loss
        // Just removing from scene graph is sufficient - Three.js will GC unused resources
        log('debug', '🗑️ Skipped geometry disposal to prevent WebGL context loss');

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