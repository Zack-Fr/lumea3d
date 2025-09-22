import { useCallback, useEffect, useRef } from 'react';
import { useSaveQueueStore, type DeltaOp, type Transform } from '../stores/saveQueueStore';
import * as THREE from 'three';

interface UseDeltaSaveProps {
  sceneId?: string;
  initialVersion?: number;
}

export const useDeltaSave = ({ sceneId, initialVersion = 1 }: UseDeltaSaveProps = {}) => {
  const { stage, setSceneId, saveState, queue } = useSaveQueueStore();
  const isInitializedRef = useRef(false);

  // Initialize scene context
  useEffect(() => {
    if (sceneId && initialVersion && !isInitializedRef.current) {
      setSceneId(sceneId, initialVersion);
      isInitializedRef.current = true;
    }
  }, [sceneId, initialVersion, setSceneId]);

  // Convert THREE.js transform to delta format
  const transformToArray = useCallback((object3D: THREE.Object3D): Transform => {
    return {
      position: [object3D.position.x, object3D.position.y, object3D.position.z],
      rotation_euler: [object3D.rotation.x, object3D.rotation.y, object3D.rotation.z],
      scale: [object3D.scale.x, object3D.scale.y, object3D.scale.z],
    };
  }, []);

  // Stage transform update operation
  const stageTransformUpdate = useCallback((itemId: string, object3D: THREE.Object3D) => {
    const transform = transformToArray(object3D);
    
    const operation: DeltaOp = {
      op: 'update_item',
      id: itemId,
      transform,
    };
    
    stage(operation);
  }, [stage, transformToArray]);

  // Stage item addition
  const stageAddItem = useCallback((assetId: string, object3D: THREE.Object3D, categoryKey?: string, model?: string) => {
    const transform = transformToArray(object3D);
    
    const operation: DeltaOp = {
      op: 'add_item',
      assetId,
      categoryKey,
      model,
      transform,
    };
    
    stage(operation);
  }, [stage, transformToArray]);

  // Stage item removal
  const stageRemoveItem = useCallback((itemId: string) => {
    const operation: DeltaOp = {
      op: 'remove_item',
      id: itemId,
    };
    
    stage(operation);
  }, [stage]);

  // Stage material update
  const stageMaterialUpdate = useCallback((itemId: string, materialOverrides: Record<string, any>) => {
    const operation: DeltaOp = {
      op: 'update_material',
      id: itemId,
      materialOverrides,
    };
    
    stage(operation);
  }, [stage]);

  // Stage scene props update
  const stagePropsUpdate = useCallback((props: Record<string, any>) => {
    const operation: DeltaOp = {
      op: 'update_props',
      ...props,
    };
    
    stage(operation);
  }, [stage]);

  // Transform controls event handlers
  const createTransformHandlers = useCallback((itemId: string) => {
    let isDragging = false;
    let hasChanged = false;

    return {
      onDragStart: () => {
        isDragging = true;
        hasChanged = false;
      },
      
      onDrag: () => {
        hasChanged = true;
      },
      
      onDragEnd: (object3D: THREE.Object3D) => {
        if (isDragging && hasChanged) {
          stageTransformUpdate(itemId, object3D);
        }
        isDragging = false;
        hasChanged = false;
      },
    };
  }, [stageTransformUpdate]);

  // Utility to batch multiple operations
  const stageBatch = useCallback((operations: DeltaOp[]) => {
    operations.forEach(op => stage(op));
  }, [stage]);

  return {
    // Core staging functions
    stageTransformUpdate,
    stageAddItem,
    stageRemoveItem,
    stageMaterialUpdate,
    stagePropsUpdate,
    stageBatch,
    
    // Transform controls helpers
    createTransformHandlers,
    
    // Save state
    saveState,
    queue,
    
    // Utilities
    isReady: Boolean(sceneId && saveState),
    hasUnsavedChanges: queue.length > 0,
  };
};

export default useDeltaSave;