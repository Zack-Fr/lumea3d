import { useRef, useEffect, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
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
  const clickStartPos = useRef({ x: 0, y: 0 });
  const clickStartTime = useRef(0);
  const dragThreshold = 5; // pixels
  const maxClickDuration = 200; // milliseconds
  const lastInteractionRef = useRef(0);
  const interactionCooldown = 100; // milliseconds

  // Handle mouse click for selection
  const handlePointerDown = useCallback((event: PointerEvent) => {
    if (!enabled || selection.isTransforming) return;

    // Check if pointer is locked (FPS mode)
    if (document.pointerLockElement) return;

    // Only track clicks, don't prevent default to allow camera controls
    isClickingRef.current = true;
    clickStartPos.current = { x: event.clientX, y: event.clientY };
    clickStartTime.current = Date.now();
  }, [enabled, selection.isTransforming]);

  const handlePointerUp = useCallback((event: PointerEvent) => {
    if (!enabled || !isClickingRef.current) return;
    
    isClickingRef.current = false;

    // Check if pointer is locked (FPS mode)
    if (document.pointerLockElement) return;

    // Check if this was a drag (camera movement) or a click
    const dragDistance = Math.sqrt(
      Math.pow(event.clientX - clickStartPos.current.x, 2) +
      Math.pow(event.clientY - clickStartPos.current.y, 2)
    );
    
    // If dragged too far, don't treat as selection click
    if (dragDistance > dragThreshold) {
      console.log('🎯 Click selection: Drag distance too far:', dragDistance);
      return;
    }
    
    // Check if click was too long (likely a drag that started as click)
    const now = Date.now();
    const clickDuration = now - clickStartTime.current;
    if (clickDuration > maxClickDuration) {
      console.log('🎯 Click selection: Click duration too long:', clickDuration);
      return;
    }
    
    // Add cooldown to prevent conflicts with camera controls
    if (now - lastInteractionRef.current < interactionCooldown) {
      console.log('🎯 Click selection: Cooldown active');
      return;
    }
    lastInteractionRef.current = now;
    
    console.log('🎯 Click selection: Processing click at', { x: event.clientX, y: event.clientY });

    // Calculate mouse position in normalized device coordinates
    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Perform raycast
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    
    // Get all intersectable objects from the scene
    const intersectableObjects: Object3D[] = [];
    const allObjects: any[] = [];
    
    scene.traverse((child) => {
      // Log all objects for debugging
      allObjects.push({
        name: child.name,
        type: child.type,
        userData: child.userData,
        hasUserData: !!child.userData,
        hasItemId: !!(child.userData?.itemId),
        isSelectable: !!(child.userData?.selectable)
      });
      
      // Only include objects with selectable userData
      if (child.userData && child.userData.selectable && child.userData.itemId) {
        intersectableObjects.push(child);
      }
    });
    
    console.log('🎯 Scene traversal found', allObjects.length, 'total objects:', allObjects);
    console.log('🎯 Found', intersectableObjects.length, 'selectable objects');

    const intersects = raycasterRef.current.intersectObjects(intersectableObjects, true);
    
    console.log('🎯 Raycast results:', intersects.length, 'intersections');
    if (intersects.length > 0) {
      intersects.forEach((intersect, i) => {
        console.log(`🎯 Intersect ${i}:`, {
          distance: intersect.distance,
          objectName: intersect.object.name,
          objectType: intersect.object.type,
          userData: intersect.object.userData
        });
      });
    }

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
  }, [enabled, camera, gl.domElement, scene, selectObject, deselectObject, dragThreshold, maxClickDuration, interactionCooldown]);

  // Set up event listeners
  useEffect(() => {
    if (!enabled) return;
    
    const canvas = gl.domElement;
    
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
    };
  }, [enabled, gl.domElement, handlePointerDown, handlePointerUp]);

  return null; // This component doesn't render anything
}