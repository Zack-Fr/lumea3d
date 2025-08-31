import { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useSelection } from './SelectionContext';

interface TransformGizmosProps {
  enabled: boolean;
}

export function TransformGizmos({ enabled }: TransformGizmosProps) {
  const { camera, gl } = useThree();
  const { selection, setIsTransforming, updateObjectTransform } = useSelection();
  const transformRef = useRef<any>(null);

  const selectedObject = selection.selectedObject?.object;

  // Update gizmo mode and attach event listeners
  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(selection.transformMode);
      
      // Attach event listeners
      const controls = transformRef.current;
      
      controls.addEventListener('dragging-changed', (event: any) => {
        if (event.value) {
          handleDragStart();
        } else {
          handleDragEnd();
        }
      });
      
      controls.addEventListener('objectChange', handleObjectChange);
      
      return () => {
        controls.removeEventListener('dragging-changed', () => {});
        controls.removeEventListener('objectChange', handleObjectChange);
      };
    }
  }, [selection.transformMode, selectedObject]);

  // Handle transform start/end events
  const handleDragStart = () => {
    console.log('🔧 Transform drag started');
    setIsTransforming(true);
    
    // Disable camera controls during transformation
    if (gl.domElement) {
      gl.domElement.style.cursor = 'grabbing';
    }
  };

  const handleDragEnd = () => {
    console.log('🔧 Transform drag ended');
    setIsTransforming(false);
    
    // Re-enable camera controls
    if (gl.domElement) {
      gl.domElement.style.cursor = 'default';
    }

    // Update the transform in our state
    if (selectedObject) {
      updateObjectTransform(
        selectedObject.position,
        selectedObject.rotation,
        selectedObject.scale
      );
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