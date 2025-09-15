import { useRef, useEffect } from 'react';
import { log } from '../../utils/logger';
import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useSelection } from './SelectionContext';
import { useSaveQueueStore } from '../../stores/saveQueueStore';

interface TransformGizmosProps {
  enabled: boolean;
}

export function TransformGizmos({ enabled }: TransformGizmosProps) {
  const { camera } = useThree();
  const { selection, setIsTransforming, updateObjectTransform } = useSelection();
  const { stage } = useSaveQueueStore();
  const transformRef = useRef<any>(null);

  const selectedObject = selection.selectedObject?.object;

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
      controls.setMode(selection.transformMode);
      log('debug', `🔧 Transform mode set to: ${selection.transformMode}`);
      
      try {
        // Verify object is still part of scene graph before attaching
        if (!selectedObject.parent) {
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
  }, [selection.transformMode, selectedObject]);

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
      updateObjectTransform(
        selectedObject.position,
        selectedObject.rotation,
        selectedObject.scale
      );

      // Stage the transform change for delta save
      const itemId = selectedObject.userData?.itemId || selectedObject.userData?.id || selectedObject.name || selectedObject.uuid;
      if (itemId) {
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
      } else {
        console.warn('⚠️ Cannot stage transform: no item ID found on object');
        log('warn', '⚠️ Cannot stage transform: no item ID found', { userData: selectedObject.userData });
      }
    }
  };

  const handleObjectChange = () => {
    // Real-time transform updates during dragging
    if (selectedObject && selection.isTransforming) {
      updateObjectTransform(
        selectedObject.position,
        selectedObject.rotation,
        selectedObject.scale
      );
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
      mode={selection.transformMode}
      size={0.8}
      showX={true}
      showY={true}
      showZ={true}
      space="world"
    />
  );
}