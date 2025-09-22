import { useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { log } from '../../utils/logger';
import * as THREE from 'three';

interface LODSettings {
  enabled: boolean;
  adaptToPerformance: boolean;
  targetFPS: number;
  debugMode: boolean;
}

export function useLODSystem({
  enabled = true,
  adaptToPerformance = true,
  targetFPS = 60,
  debugMode = false
}: Partial<LODSettings> = {}) {
  const { scene, camera } = useThree();
  const lastUpdateRef = useRef(0);
  const performanceHistoryRef = useRef<number[]>([]);
  const lodLevelsRef = useRef(new Map<string, number>());

    const updateLOD = useCallback(() => {
        if (!enabled) return;

    const cameraPosition = camera.position;
    let objectsProcessed = 0;
    let lodChanges = 0;

    scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.userData.lodEnabled) {
        return;
    } 

    objectsProcessed++;
    const distance = cameraPosition.distanceTo(object.position);
    const currentLOD = lodLevelsRef.current.get(object.uuid) || 0;
    let newLOD = currentLOD;

      // Determine LOD level based on distance
    if (distance < 50) {
        newLOD = 0; // Highest detail
    } else if (distance < 150) {
        newLOD = 1; // Medium detail
    } else if (distance < 300) {
        newLOD = 2; // Low detail
    } else {
        newLOD = 3; // Lowest detail or hidden
    }

      // Performance-based adjustment
    if (adaptToPerformance && performanceHistoryRef.current.length > 0) {
        const avgFPS = performanceHistoryRef.current.reduce((a, b) => a + b, 0) / performanceHistoryRef.current.length;
        if (avgFPS < targetFPS * 0.8) {
          // Reduce quality if performance is poor
          newLOD = Math.min(3, newLOD + 1);
        } else if (avgFPS > targetFPS * 1.1) {
          // Increase quality if performance is good
          newLOD = Math.max(0, newLOD - 1);
        }
      }

      // Apply LOD changes
      if (newLOD !== currentLOD) {
        lodLevelsRef.current.set(object.uuid, newLOD);
        applyLODLevel(object, newLOD);
        lodChanges++;
      }
    });

    if (debugMode && lodChanges > 0) {
      log('debug', `🎚️ LOD System: Updated ${lodChanges}/${objectsProcessed} objects`);
    }
  }, [enabled, adaptToPerformance, targetFPS, debugMode, camera, scene]);

  const trackPerformance = useCallback((fps: number) => {
    performanceHistoryRef.current.push(fps);
    if (performanceHistoryRef.current.length > 10) {
      performanceHistoryRef.current.shift();
    }
  }, []);

  useFrame(() => {
    const now = performance.now();
    if (now - lastUpdateRef.current > 200) { // Update every 200ms
      updateLOD();
      lastUpdateRef.current = now;
    }
  });

  return {
    updateLOD,
    trackPerformance,
    enableLODForObject: (object: THREE.Object3D) => {
      object.userData.lodEnabled = true;
      lodLevelsRef.current.set(object.uuid, 0);
    },
    disableLODForObject: (object: THREE.Object3D) => {
      object.userData.lodEnabled = false;
      lodLevelsRef.current.delete(object.uuid);
    }
  };
}

function applyLODLevel(object: THREE.Mesh, level: number) {
  switch (level) {
    case 0: // Highest detail
      object.visible = true;
      if (object.material instanceof THREE.MeshStandardMaterial || 
          object.material instanceof THREE.MeshBasicMaterial) {
        object.material.wireframe = false;
      }
      break;
    case 1: // Medium detail
      object.visible = true;
      // Could apply texture reduction here
      break;
    case 2: // Low detail
      object.visible = true;
      if (object.material instanceof THREE.MeshStandardMaterial || 
          object.material instanceof THREE.MeshBasicMaterial) {
        // Could use wireframe or simplified material
      }
      break;
    case 3: // Lowest detail or hidden
      object.visible = false;
      break;
  }
}