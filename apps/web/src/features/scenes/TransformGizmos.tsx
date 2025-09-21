import { useRef, useEffect } from 'react';
import { log } from '../../utils/logger';
import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useSelectionStore } from '../../stores/selectionStore';
import { useSaveQueueStore } from '../../stores/saveQueueStore';
import * as THREE from 'three';

interface TransformGizmosProps {
  enabled: boolean;
}

function isInSceneGraph(object: THREE.Object3D | null | undefined, scene: THREE.Scene): boolean {
  let cur: THREE.Object3D | null | undefined = object || null;
  while (cur) {
    if (cur === scene) return true;
    cur = cur.parent as any;
  }
  return false;
}

export function TransformGizmos({ enabled }: TransformGizmosProps) {
  const { camera, scene } = useThree();
  const selected = useSelectionStore((s) => s.selected);
  const transformMode = useSelectionStore((s) => s.transformMode);
  const isTransforming = useSelectionStore((s) => s.isTransforming);
  const setIsTransforming = useSelectionStore((s) => s.setIsTransforming);
  const { stage } = useSaveQueueStore();
  const transformRef = useRef<any>(null);

  const selectedObject = selected?.object;

  // Update gizmo mode and attach event listeners
  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;

    // Always detach first to prevent "not part of scene graph" errors
    try {
      controls.detach();
      log('debug', '🔧 Transform controls detached');
    } catch (error) {
      // Ignore detach errors - object might already be detached
    }

    if (selectedObject) {
      // Set the correct mode
      controls.setMode(transformMode);
      log('debug', `🔧 Transform mode set to: ${transformMode}`);
      
      try {
        // Verify object is still part of scene graph before attaching
        const inGraph = isInSceneGraph(selectedObject, scene as any);
        if (!inGraph) {
          log('warn', '⚠️ Cannot attach transform controls: object not in scene graph');
          return;
        }
        
        // Attach object to transform controls
        controls.attach(selectedObject);
        log('debug', '🔧 Transform controls attached to:', selectedObject.name || selectedObject.uuid);
      } catch (error) {
        log('error', '❌ Failed to attach transform controls:', error);
        return;
      }
      
      const handleDragChanged = (event: any) => {
        if (event.value) {
          handleDragStart();
        } else {
          handleDragEnd();
        }
      };
      
      controls.addEventListener('dragging-changed', handleDragChanged);
      controls.addEventListener('objectChange', handleObjectChange);
      
      return () => {
        controls.removeEventListener('dragging-changed', handleDragChanged);
        controls.removeEventListener('objectChange', handleObjectChange);
        // Detach on cleanup
        try {
          controls.detach();
          log('debug', '🔧 Transform controls detached on cleanup');
        } catch (error) {
          // Ignore detach errors during cleanup
        }
      };
    }
  }, [transformMode, selectedObject]);

  // Handle transform start/end events
  const handleDragStart = () => {
    console.log('🔧 Transform drag started for object:', selectedObject?.name || selectedObject?.uuid);
    log('debug', '🔧 Transform drag started');
    setIsTransforming(true);
  };

  const handleDragEnd = () => {
    console.log('🔧 Transform drag ended for object:', selectedObject?.name || selectedObject?.uuid);
    log('debug', '🔧 Transform drag ended');
    setIsTransforming(false);

    // Update the transform in our state
    if (selectedObject) {

      // If the selected object has a helper, sync it visually after moving
      try {
        if (selectedObject.userData?.updateHelper && typeof selectedObject.userData.updateHelper === 'function') {
          selectedObject.userData.updateHelper();
        }
      } catch {}

      // Stage the transform change for delta save - only when we have a real backend ID
      const itemId = selectedObject.userData?.itemId as string | undefined;
      const isTemp = !itemId || itemId.startsWith('temp_') || itemId.startsWith('tmp-') || itemId.startsWith('point-light-') || itemId.startsWith('spot-light-') || itemId.startsWith('directional-light-') || selectedObject.userData?.localOnly;
      if (isTemp) {
        console.warn('⚠️ Skipping transform stage for unsaved object (no real itemId yet)', {
          name: selectedObject.name,
          userData: selectedObject.userData,
        });
        log('warn', '⚠️ Skipping transform stage for unsaved object (no real itemId yet)', { name: selectedObject.name });
        return;
      }

      // Skip if backend previously reported this ID missing (avoid re-404 loops)
      try {
        const missing = (window as any).__lumeaNotFoundIds as Set<string> | undefined;
        if (missing && itemId && missing.has(itemId)) {
          console.warn('⚠️ Skipping transform stage for ID previously reported missing:', itemId);
          return;
        }
      } catch {}

      const deltaOp = {
        op: 'update_item' as const,
        id: itemId,
        transform: {
          position: [selectedObject.position.x, selectedObject.position.y, selectedObject.position.z] as [number, number, number],
          rotation_euler: [selectedObject.rotation.x, selectedObject.rotation.y, selectedObject.rotation.z] as [number, number, number],
          scale: [selectedObject.scale.x, selectedObject.scale.y, selectedObject.scale.z] as [number, number, number],
        }
      };
      
      stage(deltaOp);
      console.log('💾 Staged transform update for item:', itemId);
      log('debug', '💾 Transform staged for delta save', { itemId, transform: deltaOp.transform });
    }
  };

  const handleObjectChange = () => {
    // Real-time transform updates during dragging
    if (selectedObject && isTransforming) {
      // Real-time transform updates during dragging
      // Update will be handled by store automatically
    }
  };

  if (!enabled || !selectedObject) {
    return null;
  }

  return (
    <TransformControls
      ref={transformRef}
      object={selectedObject}
      camera={camera}
      mode={transformMode}
      size={0.8}
      showX={true}
      showY={true}
      showZ={true}
      space="world"
    />
  );
}