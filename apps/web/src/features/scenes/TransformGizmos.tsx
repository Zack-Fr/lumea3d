import { useRef, useEffect } from 'react';
import { log } from '../../utils/logger';
import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useSelectionStore } from '../../stores/selectionStore';
import { useSaveQueueStore } from '../../stores/saveQueueStore';

interface TransformGizmosProps {
  enabled: boolean;
}

export function TransformGizmos({ enabled }: TransformGizmosProps) {
  const { camera } = useThree();
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

      // Handle transform updates for all objects
      const isLight = selectedObject.userData?.meta?.isLight || false;
      const dbId = selectedObject.userData?.dbId;
      const tempId = selectedObject.userData?.itemId;
      const itemId = dbId || tempId || selectedObject.userData?.id;
      
      console.log('🔧 Transform update:', {
        name: selectedObject.name,
        isLight,
        dbId,
        tempId,
        finalItemId: itemId
      });
      
      if (itemId) {
        // Try to stage the update if we have a backend ID
        if (dbId) {
          // Object is saved in backend, safe to stage update
          const deltaOp = {
            op: 'update_item' as const,
            id: dbId,
            transform: {
              position: [selectedObject.position.x, selectedObject.position.y, selectedObject.position.z] as [number, number, number],
              rotation_euler: [selectedObject.rotation.x, selectedObject.rotation.y, selectedObject.rotation.z] as [number, number, number],
              scale: [selectedObject.scale.x, selectedObject.scale.y, selectedObject.scale.z] as [number, number, number],
            }
          };
          
          stage(deltaOp);
          console.log('💾 Staged transform update for saved item:', dbId);
          
        } else if (isLight && tempId) {
          // Light with temp ID - try to stage update but handle gracefully if it fails
          console.log('⏳ Attempting to stage update for unsaved light:', tempId);
          
          try {
            const deltaOp = {
              op: 'update_item' as const,
              id: tempId,
              transform: {
                position: [selectedObject.position.x, selectedObject.position.y, selectedObject.position.z] as [number, number, number],
                rotation_euler: [selectedObject.rotation.x, selectedObject.rotation.y, selectedObject.rotation.z] as [number, number, number],
                scale: [selectedObject.scale.x, selectedObject.scale.y, selectedObject.scale.z] as [number, number, number],
              }
            };
            
            stage(deltaOp);
            console.log('💾 Staged update for temp light (may fail gracefully):', tempId);
            
          } catch (error) {
            console.log('⚠️ Could not stage temp light update (expected):', error);
            // This is fine - the light will move visually but not persist until saved
          }
        } else {
          // Regular object without backend ID
          console.log('ℹ️ Local-only transform update for object:', selectedObject.name);
        }
      } else {
        // No ID at all - this is unusual but we still allow the visual movement
        console.warn('⚠️ Transform update with no ID - visual only');
      }
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