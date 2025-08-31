import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Raycaster, Vector2, Object3D } from 'three';
import { useSelection } from './SelectionContext';

interface ClickSelectionProps {
  enabled: boolean; // Disable when in FPS mode or transforming
}

export function ClickSelection({ enabled }: ClickSelectionProps) {
  const { camera, gl, scene } = useThree();
  const { selectObject, deselectObject, selection } = useSelection();
  
  const raycasterRef = useRef(new Raycaster());
  const mouseRef = useRef(new Vector2());
  const isClickingRef = useRef(false);

  // Handle mouse click for selection
  const handlePointerDown = (event: PointerEvent) => {
    if (!enabled || selection.isTransforming) return;

    // Check if pointer is locked (FPS mode)
    if (document.pointerLockElement) return;

    isClickingRef.current = true;
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!enabled || !isClickingRef.current) return;
    
    isClickingRef.current = false;

    // Check if pointer is locked (FPS mode)
    if (document.pointerLockElement) return;

    // Calculate mouse position in normalized device coordinates
    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Perform raycast
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    
    // Get all intersectable objects from the scene
    const intersectableObjects: Object3D[] = [];
    scene.traverse((child) => {
      // Only include objects with selectable userData
      if (child.userData && child.userData.selectable && child.userData.itemId) {
        intersectableObjects.push(child);
      }
    });

    const intersects = raycasterRef.current.intersectObjects(intersectableObjects, true);

    if (intersects.length > 0) {
      // Find the closest selectable object
      let selectedObj: Object3D | null = null;
      
      for (const intersect of intersects) {
        let obj = intersect.object;
        
        // Traverse up the hierarchy to find an object with itemId
        while (obj && !obj.userData?.itemId) {
          obj = obj.parent!;
        }
        
        if (obj && obj.userData?.selectable && obj.userData?.itemId) {
          selectedObj = obj;
          break;
        }
      }

      if (selectedObj) {
        console.log('🎯 Click selection hit:', selectedObj.userData.itemId);
        selectObject(selectedObj);
      } else {
        console.log('🎯 Click selection miss - deselecting');
        deselectObject();
      }
    } else {
      console.log('🎯 Click selection miss - deselecting');
      deselectObject();
    }
  };

  // Set up event listeners
  useFrame(() => {
    const canvas = gl.domElement;
    
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
    };
  });

  return null; // This component doesn't render anything
}