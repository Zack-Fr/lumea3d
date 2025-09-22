import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface LODLevel {
  distance: number;
  glbUrl?: string;
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material;
  visible?: boolean;
}

interface LODObjectProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  levels: LODLevel[];
  updateDistance?: number; // Distance threshold for updating LOD
}

export function LODObject({ 
  position, 
  rotation = [0, 0, 0], 
  scale = [1, 1, 1], 
  levels,
  updateDistance = 50 
}: LODObjectProps) {
  const { camera } = useThree();
  const lodRef = useRef<THREE.LOD>(null);
  const lastUpdateRef = useRef(0);
  const objectPosition = useMemo(() => new THREE.Vector3(...position), [position]);

  // Load all GLB models for different LOD levels
  const loadedModels = useMemo(() => {
    return levels.map(level => {
      if (level.glbUrl) {
        try {
            const { scene } = useGLTF(level.glbUrl);
            return scene.clone();
        } catch (error) {
            console.warn('⚠️ LODObject: Failed to load GLB for LOD level:', level.glbUrl, error);
            return null;
        }
      }
      return null;
    });
  }, [levels]);

  // Update LOD based on camera distance
  useFrame(() => {
    if (!lodRef.current) return;

    const distance = camera.position.distanceTo(objectPosition);
    
    // Only update if camera moved significantly
    if (Math.abs(distance - lastUpdateRef.current) < updateDistance / 10) return;
    lastUpdateRef.current = distance;

    // Find appropriate LOD level
    let activeLevel = levels.length - 1;
    for (let i = 0; i < levels.length; i++) {
      if (distance <= levels[i].distance) {
        activeLevel = i;
        break;
      }
    }

    // Update LOD visibility
    lodRef.current.children.forEach((child, index) => {
      child.visible = index === activeLevel && (levels[index].visible !== false);
    });
  });

  // Create LOD levels
  const lodLevels = useMemo(() => {
    return levels.map((level, index) => {
      if (loadedModels[index]) {
        return loadedModels[index];
      }
      
      // Fallback: create simple geometry
      if (level.geometry && level.material) {
        const mesh = new THREE.Mesh(level.geometry, level.material);
        return mesh;
      }
      
      // Default fallback
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ 
        color: index === 0 ? 0x00ff00 : index === 1 ? 0xffff00 : 0xff0000 
      });
      return new THREE.Mesh(geometry, material);
    });
  }, [levels, loadedModels]);

  if (levels.length === 0) return null;

  return (
    <lOD ref={lodRef} position={position} rotation={rotation} scale={scale}>
      {lodLevels.map((levelObject, index) => (
        <primitive 
          key={index} 
          object={levelObject} 
          visible={index === 0} // Start with highest detail
        />
      ))}
    </lOD>
  );
}

// Hook for creating LOD configurations
export function useLODConfiguration(baseGlbUrl: string) {
  const lodLevels: LODLevel[] = useMemo(() => {
    // Create different LOD levels based on file naming convention
    const baseName = baseGlbUrl.replace('.glb', '');
    
    return [
      {
        distance: 25,
        glbUrl: `${baseName}_high.glb`, // High detail for close viewing
      },
      {
        distance: 50,
        glbUrl: `${baseName}_med.glb`, // Medium detail for moderate distance
      },
      {
        distance: 100,
        glbUrl: `${baseName}_low.glb`, // Low detail for far viewing
      },
      {
        distance: 200,
        glbUrl: baseGlbUrl, // Original model for very far (if others don't exist)
      },
    ];
  }, [baseGlbUrl]);

  return lodLevels;
}

// Automatic LOD generator for geometries
export function createGeometryLODs(originalGeometry: THREE.BufferGeometry): LODLevel[] {
  const levels: LODLevel[] = [];
  
  try {
    // High detail (original)
    levels.push({
      distance: 25,
      geometry: originalGeometry,
    });

    // Medium detail (50% triangles)
    const mediumGeometry = originalGeometry.clone();
    simplifyGeometry(mediumGeometry, 0.5);
    levels.push({
      distance: 50,
      geometry: mediumGeometry,
    });

    // Low detail (25% triangles)
    const lowGeometry = originalGeometry.clone();
    simplifyGeometry(lowGeometry, 0.25);
    levels.push({
      distance: 100,
      geometry: lowGeometry,
    });

    // Very low detail (10% triangles)
    const veryLowGeometry = originalGeometry.clone();
    simplifyGeometry(veryLowGeometry, 0.1);
    levels.push({
      distance: 200,
      geometry: veryLowGeometry,
    });

  } catch (error) {
    console.warn('⚠️ LOD: Failed to create geometry LODs:', error);
    // Fallback to original geometry for all levels
    levels.push({
      distance: Infinity,
      geometry: originalGeometry,
    });
  }

  return levels;
}

// Simple geometry simplification (basic implementation)
function simplifyGeometry(geometry: THREE.BufferGeometry, ratio: number) {
  // This is a basic implementation. In production, you'd want to use
  // a proper mesh decimation algorithm like the one in three.js examples
  const position = geometry.attributes.position;
  if (!position) return;

  const originalCount = position.count;
  const targetCount = Math.floor(originalCount * ratio);
  
  if (targetCount >= originalCount) return;

  // Simple vertex decimation (not optimal, but functional)
  const indices = geometry.index;
  if (indices) {
    const originalIndices = indices.array;
    const newIndicesCount = Math.floor(originalIndices.length * ratio);
    const newIndices = new Uint32Array(newIndicesCount);
    
    // Sample indices uniformly
    const step = originalIndices.length / newIndicesCount;
    for (let i = 0; i < newIndicesCount; i++) {
      newIndices[i] = originalIndices[Math.floor(i * step)];
    }
    
    geometry.setIndex(new THREE.BufferAttribute(newIndices, 1));
  }

  console.log(`🔧 LOD: Simplified geometry from ${originalCount} to ~${targetCount} vertices (${(ratio * 100).toFixed(0)}%)`);
}

// Performance-aware LOD manager
export class LODManager {
  private objects: Map<string, any> = new Map();
  private performanceTarget = 60; // Target FPS
  private currentPerformance = 60;
  
  updatePerformance(fps: number) {
    this.currentPerformance = fps;
  }
  
  register(id: string, lodObject: any) {
    this.objects.set(id, lodObject);
  }
  
  unregister(id: string) {
    this.objects.delete(id);
  }
  
  // Adjust LOD distances based on performance
  getAdjustedLODLevels(baseLevels: LODLevel[]): LODLevel[] {
    const performanceRatio = this.currentPerformance / this.performanceTarget;
    
    return baseLevels.map(level => ({
      ...level,
      distance: level.distance * performanceRatio, // Closer distances when performance is poor
    }));
  }
}

export const globalLODManager = new LODManager();