import { useRef, useEffect, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { Raycaster, Vector2, Vector3, Object3D } from 'three';
import * as THREE from 'three';
import { useSelectionStore } from '../../stores/selectionStore';

interface ClickSelectionProps {
  enabled: boolean; // Disable when in FPS mode or transforming
}

export function ClickSelection({ enabled }: ClickSelectionProps) {
  const { camera, gl, scene } = useThree();
  const isTransforming = useSelectionStore((s) => s.isTransforming);
  const setSelected = useSelectionStore((s) => s.set);
  const clearSelection = useSelectionStore((s) => s.clear);

  // Helper functions that match the old context API
  const selectObject = useCallback((object: Object3D) => {
    const userData = object.userData;
    if (!userData || !userData.itemId || !userData.selectable) {
      console.warn('⚠️ Object is not selectable:', object.name);
      return;
    }

    if (userData.locked) {
      console.warn('🔒 Object is locked:', userData.itemId);
      return;
    }

    // If this is a light helper, attach gizmos to the actual light, not the helper mesh
    const targetObject = (userData.isHelper && userData.actualLightObject) ? userData.actualLightObject as Object3D : object;

    setSelected({
      assetId: userData.meta?.assetId || userData.itemId,
      itemId: userData.itemId,
      object: targetObject,
      category: userData.category,
      originalPosition: targetObject.position.clone(),
      originalRotation: targetObject.rotation.clone(),
      originalScale: targetObject.scale.clone(),
    });
  }, [setSelected]);

  const deselectObject = useCallback(() => {
    clearSelection();
  }, [clearSelection]);
  
  const raycasterRef = useRef(new Raycaster());
  const mouseRef = useRef(new Vector2());
  const isClickingRef = useRef(false);
  const clickStartPos = useRef({ x: 0, y: 0 });
  const clickStartTime = useRef(0);
  const dragThreshold = 3; // pixels - reduced for better click detection
  const maxClickDuration = 300; // milliseconds - increased for better click detection
  const lastInteractionRef = useRef(0);
  const interactionCooldown = 100; // milliseconds

  // Handle mouse click for selection
  const handlePointerDown = useCallback((event: PointerEvent) => {
    if (!enabled || isTransforming) return;

    // Check if pointer is locked (FPS mode)
    if (document.pointerLockElement) return;

    // Only track clicks, don't prevent default to allow camera controls
    isClickingRef.current = true;
    clickStartPos.current = { x: event.clientX, y: event.clientY };
    clickStartTime.current = Date.now();
  }, [enabled, isTransforming]);

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
      return;
    }
    
    // Check if click was too long (likely a drag that started as click)
    const now = Date.now();
    const clickDuration = now - clickStartTime.current;
    if (clickDuration > maxClickDuration) {
      return;
    }
    
    // Reduce cooldown for better responsiveness
    if (now - lastInteractionRef.current < 50) {
      return;
    }
    lastInteractionRef.current = now;
    

    // Calculate mouse position in normalized device coordinates
    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    mouseRef.current.x = mouseX;
    mouseRef.current.y = mouseY;
    

    // Perform raycast
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    
    
    // Get all intersectable objects from the scene
    const intersectableObjects: Object3D[] = [];
    const allObjects: any[] = [];
    
    scene.traverse((child) => {
      // Log all objects for debugging (including light helpers)
      if (child.type === 'Mesh' || child.userData?.itemId || child.userData?.isHelper) {
        allObjects.push({
          name: child.name,
          type: child.type,
          userData: child.userData,
          hasUserData: !!child.userData,
          hasItemId: !!(child.userData?.itemId),
          isSelectable: !!(child.userData?.selectable),
          position: child.position.toArray(),
          visible: child.visible
        });
      }
      
      // Include mesh objects and light helpers with selectable userData
      if ((child.type === 'Mesh' || child.userData?.isHelper) && child.userData && child.userData.selectable && child.userData.itemId) {
        intersectableObjects.push(child);
      }
    });
    
    console.log('🎯 Scene traversal found', allObjects.length, 'total objects:', allObjects);
    console.log('🎯 Found', intersectableObjects.length, 'selectable objects');
    console.log('🎯 Selectable objects details:', intersectableObjects.map(obj => {
      // Get bounding box for better debugging
      const bbox = new THREE.Box3().setFromObject(obj);
      return {
        name: obj.name,
        position: obj.position.toArray(),
        worldPosition: obj.getWorldPosition(new Vector3()).toArray(),
        visible: obj.visible,
        matrixAutoUpdate: obj.matrixAutoUpdate,
        boundingBox: {
          min: bbox.min.toArray(),
          max: bbox.max.toArray(),
          center: bbox.getCenter(new Vector3()).toArray(),
          size: bbox.getSize(new Vector3()).toArray()
        }
      };
    }));

    const intersects = raycasterRef.current.intersectObjects(intersectableObjects, true);
    
    // Test raycast against ALL objects in scene (for debugging)
    const allSceneObjects: Object3D[] = [];
    scene.traverse(child => {
      if (child.type === 'Mesh' || child.userData?.isHelper) {
        allSceneObjects.push(child);
      }
    });
    


    if (intersects.length > 0) {
      // Find the closest selectable object
      let selectedObj: Object3D | null = null;
      
      // Helper: ascend to the top-most container group for this itemId
      const getContainerFor = (obj: Object3D): Object3D => {
        const itemId = (obj.userData && obj.userData.itemId) || undefined;
        if (!itemId) return obj;
        let cur: Object3D = obj;
        while (cur.parent && (cur.parent as any).userData && (cur.parent as any).userData.itemId === itemId) {
          cur = cur.parent as Object3D;
        }
        return cur;
      };
      
      for (const intersect of intersects) {
        let obj = intersect.object;
        
        // Traverse up the hierarchy to find an object with itemId
        while (obj && !obj.userData?.itemId) {
          obj = obj.parent!;
        }
        
        if (obj && obj.userData?.selectable && obj.userData?.itemId) {
          // Promote to container group to avoid editing internal GLB nodes
          selectedObj = getContainerFor(obj);
          break;
        }
      }

      if (selectedObj) {
        
        // Check if this is an instanced mesh and handle proxy selection
        const userData = selectedObj.userData;
        if (userData?.meta?.isInstancedMesh && userData?.meta?.assetId) {
          
          // Import the instanced mesh selection handler
          import('./InstancedTransformProxy').then(({ handleInstancedMeshSelection }) => {
            // Find the intersection that corresponds to this selected object
            const relevantIntersection = intersects.find(intersect => 
              intersect.object === selectedObj || intersect.object.userData?.itemId === userData.itemId
            ) || intersects[0];
            
            const proxySelection = handleInstancedMeshSelection(relevantIntersection, selectObject);
            
            if (!proxySelection) {
              // Fallback to regular selection if proxy creation failed
              selectObject(selectedObj);
            }
          }).catch(error => {
            console.error('❌ Failed to load instanced mesh selection handler:', error);
            // Fallback to regular selection
            selectObject(selectedObj);
          });
        } else {
          // Regular non-instanced mesh selection
          selectObject(selectedObj);
        }
      } else {
        deselectObject();
      }
    } else {
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