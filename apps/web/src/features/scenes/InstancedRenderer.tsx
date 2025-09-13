import { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface InstancedItem {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible?: boolean;
}

interface InstancedObjectProps {
  glbUrl: string;
  items: InstancedItem[];
  frustumCulling?: boolean;
  maxInstances?: number;
  progressive?: boolean;
  batchSize?: number;
}

export function InstancedObject({ 
  glbUrl, 
  items, 
  frustumCulling = true,
  maxInstances = 1000,
  progressive = false,
  batchSize = 5
}: InstancedObjectProps) {
  const { scene } = useGLTF(glbUrl);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const matrixRef = useRef<THREE.Matrix4[]>([]);
  const visibilityRef = useRef<boolean[]>([]);
  const lastUpdateRef = useRef(0);
  const [loadedInstances, setLoadedInstances] = useState(0);
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false);

  // Extract geometry and material from the loaded model
  const { geometry, material } = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    let mat: THREE.Material | null = null;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry && child.material) {
        geo = child.geometry;
        mat = child.material;
        return; // Use first mesh found
      }
    });

    if (!geo) {
      console.warn('🔺 InstancedObject: No geometry found in GLB:', glbUrl);
      geo = new THREE.BoxGeometry(1, 1, 1); // Fallback
    }

    if (!mat) {
      console.warn('🔺 InstancedObject: No material found in GLB:', glbUrl);
      mat = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Fallback
    }

    return { geometry: geo, material: mat };
  }, [scene, glbUrl]);

  // Initialize instance matrices with progressive loading
  useEffect(() => {
    const count = Math.min(items.length, maxInstances);
    matrixRef.current = new Array(count);
    visibilityRef.current = new Array(count);

    if (progressive && count > batchSize) {
      console.log('🔄 InstancedObject: Using progressive loading for', count, 'instances');
      setIsProgressiveLoading(true);
      setLoadedInstances(0);
      
      const loadBatch = (startIndex: number) => {
        const endIndex = Math.min(startIndex + batchSize, count);
        
        for (let i = startIndex; i < endIndex; i++) {
          const item = items[i];
          const matrix = new THREE.Matrix4();
          
          // Apply transform
          const position = new THREE.Vector3(...item.position);
          const rotation = new THREE.Euler(...item.rotation);
          const scale = new THREE.Vector3(...item.scale);
          
          matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
          matrixRef.current[i] = matrix;
          visibilityRef.current[i] = item.visible !== false;
        }
        
        setLoadedInstances(endIndex);
        
        // Load next batch with a small delay to prevent GPU memory spikes
        if (endIndex < count) {
          setTimeout(() => loadBatch(endIndex), 50); // 50ms delay between batches
        } else {
          setIsProgressiveLoading(false);
          console.log('🔧 InstancedObject: Progressive loading completed', count, 'instances for', glbUrl);
        }
      };
      
      // Start progressive loading with initial batch
      loadBatch(0);
    } else {
      // Regular loading for small numbers of instances
      for (let i = 0; i < count; i++) {
        const item = items[i];
        const matrix = new THREE.Matrix4();
        
        // Apply transform
        const position = new THREE.Vector3(...item.position);
        const rotation = new THREE.Euler(...item.rotation);
        const scale = new THREE.Vector3(...item.scale);
        
        matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
        matrixRef.current[i] = matrix;
        visibilityRef.current[i] = item.visible !== false;
      }
      
      setLoadedInstances(count);
      console.log('🔧 InstancedObject: Initialized', count, 'instances for', glbUrl);
    }
  }, [items, maxInstances, glbUrl, progressive, batchSize]);

  // Update instance matrices on every frame (for frustum culling)
  useFrame(({ camera }) => {
    if (!instancedMeshRef.current || !frustumCulling) return;

    const now = performance.now();
    // Only update every 100ms to avoid performance hit
    if (now - lastUpdateRef.current < 100) return;
    lastUpdateRef.current = now;

    const mesh = instancedMeshRef.current;
    const frustum = new THREE.Frustum();
    const cameraMatrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(cameraMatrix);

    let visibleCount = 0;

    // Check each instance against frustum
    for (let i = 0; i < matrixRef.current.length; i++) {
      const matrix = matrixRef.current[i];
      if (!matrix) continue;

      // Extract position from matrix
      const position = new THREE.Vector3();
      matrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());

      // Create a bounding sphere for the instance
      const sphere = new THREE.Sphere(position, 2); // Approximate radius
      const isVisible = frustum.intersectsSphere(sphere) && visibilityRef.current[i];

      if (isVisible) {
        mesh.setMatrixAt(visibleCount, matrix);
        visibleCount++;
      }
    }

    // Update instance count and mark for update
    mesh.count = visibleCount;
    mesh.instanceMatrix.needsUpdate = true;

    // Log performance info occasionally
    if (visibleCount !== matrixRef.current.length) {
      console.log('🎯 InstancedObject: Culled', matrixRef.current.length - visibleCount, 'of', matrixRef.current.length, 'instances');
    }
  });

  // Initial matrix setup (updated to use loadedInstances)
  useEffect(() => {
    if (!instancedMeshRef.current || loadedInstances === 0) return;

    const mesh = instancedMeshRef.current;
    const count = loadedInstances;

    for (let i = 0; i < count; i++) {
      if (matrixRef.current[i]) {
        mesh.setMatrixAt(i, matrixRef.current[i]);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = count;
    
    if (isProgressiveLoading) {
      console.log('📊 InstancedObject: Updated to show', count, 'of', items.length, 'instances');
    }
  }, [loadedInstances, isProgressiveLoading, items.length]);

  if (!geometry || !material || items.length === 0) {
    return null;
  }

  const instanceCount = Math.min(loadedInstances, maxInstances);

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[geometry, material, instanceCount]}
      frustumCulled={false} // We handle culling manually
      castShadow
      receiveShadow
    />
  );
}

// Hook for managing instanced rendering
export function useInstancedRenderer(items: any[], glbUrl: string) {
  const instanceGroups = useMemo(() => {
    // Group items by their model URL for instancing
    const groups = new Map<string, InstancedItem[]>();
    
    items.forEach((item) => {
      const modelUrl = item.category ? glbUrl : item.glb_url || glbUrl;
      if (!groups.has(modelUrl)) {
        groups.set(modelUrl, []);
      }
      
      groups.get(modelUrl)!.push({
        id: item.id,
        position: item.transform.position,
        rotation: item.transform.rotation_euler,
        scale: item.transform.scale,
        visible: item.visible !== false,
      });
    });

    return groups;
  }, [items, glbUrl]);

  const shouldUseInstancing = (count: number) => count >= 3; // Use instancing for 3+ objects

  return {
    instanceGroups,
    shouldUseInstancing,
  };
}

// Preload GLBs for instancing
export function useInstancedPreloader(glbUrls: string[]) {
  useEffect(() => {
    const preloadPromises = glbUrls.map(url => {
      console.log('⚡ InstancedPreloader: Preloading', url);
      return useGLTF.preload(url);
    });

    Promise.all(preloadPromises).then(() => {
      console.log('✅ InstancedPreloader: All GLBs preloaded for instancing');
    }).catch((error) => {
      console.error('❌ InstancedPreloader: Failed to preload GLBs:', error);
    });
  }, [glbUrls]);
}