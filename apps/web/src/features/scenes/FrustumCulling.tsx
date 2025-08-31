import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface FrustumCullingProps {
  enabled?: boolean;
  updateInterval?: number; // ms between culling updates
  debugMode?: boolean;
}

export function FrustumCulling({ 
  enabled = true, 
  updateInterval = 100,
  debugMode = false 
}: FrustumCullingProps) {
  const { scene, camera } = useThree();
  const lastUpdateRef = useRef(0);
  const frustumRef = useRef(new THREE.Frustum());
  const matrixRef = useRef(new THREE.Matrix4());
  const culledObjectsRef = useRef<Set<THREE.Object3D>>(new Set());
  const totalObjectsRef = useRef(0);

  useFrame(() => {
    if (!enabled) return;

    const now = performance.now();
    if (now - lastUpdateRef.current < updateInterval) return;
    lastUpdateRef.current = now;

    // Update frustum from camera
    matrixRef.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(matrixRef.current);

    let totalObjects = 0;
    let culledObjects = 0;
    const newlyCulled = new Set<THREE.Object3D>();

    // Traverse scene and cull objects outside frustum
    scene.traverse((object) => {
      // Only cull meshes and skip certain object types
      if (!(object instanceof THREE.Mesh) || 
          object.userData.noCull || 
          object.userData.isHelper ||
          object.userData.isUI) {
        return;
      }

      totalObjects++;

      // Check if object is in frustum
      const isInFrustum = isObjectInFrustum(object, frustumRef.current);
      
      if (!isInFrustum) {
        // Cull object (make invisible)
        if (object.visible) {
          object.visible = false;
          newlyCulled.add(object);
          culledObjects++;
        }
      } else {
        // Un-cull object (make visible)
        if (!object.visible && culledObjectsRef.current.has(object)) {
          object.visible = true;
          culledObjectsRef.current.delete(object);
        }
      }
    });

    // Update culled objects set
    newlyCulled.forEach(obj => culledObjectsRef.current.add(obj));
    totalObjectsRef.current = totalObjects;

    // Debug logging
    if (debugMode && culledObjects > 0) {
      console.log(`🎯 FrustumCulling: Culled ${culledObjects}/${totalObjects} objects (${((culledObjects/totalObjects)*100).toFixed(1)}%)`);
    }
  });

  return null;
}

// Check if an object's bounding box intersects with the frustum
function isObjectInFrustum(object: THREE.Object3D, frustum: THREE.Frustum): boolean {
  // Update world matrix
  object.updateMatrixWorld();

  // Get bounding box
  let boundingBox: THREE.Box3;
  
  if (object instanceof THREE.Mesh && object.geometry) {
    // Use geometry bounding box if available
    if (!object.geometry.boundingBox) {
      object.geometry.computeBoundingBox();
    }
    boundingBox = object.geometry.boundingBox!.clone();
    boundingBox.applyMatrix4(object.matrixWorld);
  } else {
    // Fallback: create bounding box from object bounds
    boundingBox = new THREE.Box3().setFromObject(object);
  }

  // Test intersection with frustum
  return frustum.intersectsBox(boundingBox);
}

// Enhanced frustum culling with distance-based culling
interface AdvancedFrustumCullingProps extends FrustumCullingProps {
  maxDistance?: number; // Maximum render distance
  useLODCulling?: boolean; // Enable LOD-based culling
}

export function AdvancedFrustumCulling({ 
  enabled = true,
  updateInterval = 100,
  debugMode = false,
  maxDistance = 500,
  useLODCulling = true
}: AdvancedFrustumCullingProps) {
  const { scene, camera } = useThree();
  const lastUpdateRef = useRef(0);
  const frustumRef = useRef(new THREE.Frustum());
  const matrixRef = useRef(new THREE.Matrix4());
  const statsRef = useRef({
    totalObjects: 0,
    frustumCulled: 0,
    distanceCulled: 0,
    lodCulled: 0,
  });

  useFrame(() => {
    if (!enabled) return;

    const now = performance.now();
    if (now - lastUpdateRef.current < updateInterval) return;
    lastUpdateRef.current = now;

    // Update frustum
    matrixRef.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(matrixRef.current);

    const stats = { totalObjects: 0, frustumCulled: 0, distanceCulled: 0, lodCulled: 0 };
    const cameraPosition = camera.position;

    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || 
          object.userData.noCull || 
          object.userData.isHelper ||
          object.userData.isUI) {
        return;
      }

      stats.totalObjects++;
      let shouldRender = true;
      let cullingReason = '';

      // Distance culling
      const distance = cameraPosition.distanceTo(object.position);
      if (distance > maxDistance) {
        shouldRender = false;
        cullingReason = 'distance';
        stats.distanceCulled++;
      }

      // Frustum culling (only if not distance culled)
      if (shouldRender && !isObjectInFrustum(object, frustumRef.current)) {
        shouldRender = false;
        cullingReason = 'frustum';
        stats.frustumCulled++;
      }

      // LOD culling (skip very detailed objects at far distances)
      if (shouldRender && useLODCulling) {
        const lodThreshold = object.userData.lodThreshold || 100;
        if (distance > lodThreshold && object.userData.isHighDetail) {
          shouldRender = false;
          cullingReason = 'lod';
          stats.lodCulled++;
        }
      }

      // Apply culling
      if (object.visible !== shouldRender) {
        object.visible = shouldRender;
        if (debugMode) {
          object.userData.cullingReason = cullingReason;
        }
      }
    });

    statsRef.current = stats;

    // Debug output
    if (debugMode) {
      const totalCulled = stats.frustumCulled + stats.distanceCulled + stats.lodCulled;
      if (totalCulled > 0) {
        console.log(`🎯 AdvancedCulling: Rendered ${stats.totalObjects - totalCulled}/${stats.totalObjects} objects`, {
          frustum: stats.frustumCulled,
          distance: stats.distanceCulled,
          lod: stats.lodCulled,
        });
      }
    }
  });

  return null;
}

// Hook to get culling statistics
export function useCullingStats() {
  const statsRef = useRef({
    totalObjects: 0,
    visibleObjects: 0,
    culledObjects: 0,
    cullingReasons: {
      frustum: 0,
      distance: 0,
      lod: 0,
    },
  });

  return statsRef.current;
}

// Utility to mark objects as uncullable
export function markAsUncullable(object: THREE.Object3D) {
  object.userData.noCull = true;
  object.traverse((child) => {
    child.userData.noCull = true;
  });
}

// Utility to set LOD threshold for objects
export function setLODThreshold(object: THREE.Object3D, threshold: number) {
  object.userData.lodThreshold = threshold;
}

// Utility to mark objects as high detail (subject to LOD culling)
export function markAsHighDetail(object: THREE.Object3D, isHighDetail = true) {
  object.userData.isHighDetail = isHighDetail;
}