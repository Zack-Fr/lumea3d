import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as THREE from 'three';

export interface Part {
  name: string;
  mesh: THREE.InstancedMesh;
}

export interface InstancingPool {
  root: THREE.Object3D;         // group at identity
  parts: Part[];                // one InstancedMesh per sub-mesh/material
  ids: string[];                // instanceIndex -> itemId
  indexOf: Map<string, number>; // itemId -> instanceIndex
  assetBBoxLocal: THREE.Box3;   // union of sub-mesh bboxes, in asset space
  baseRotationQ?: THREE.Quaternion; // optional correction per asset
  originOffset?: THREE.Vector3; // e.g., ground origin
}

interface InstancingPoolState {
  pools: Map<string, InstancingPool>;
  
  // Core pool management
  getOrCreatePool: (assetId: string, gltf: any) => InstancingPool;
  getPool: (assetId: string) => InstancingPool | undefined;
  
  // Instance operations
  addInstance: (assetId: string, itemId: string, transform: { position: [number, number, number]; yaw_deg?: number; scale?: [number, number, number] }) => number;
  removeInstance: (assetId: string, itemId: string) => boolean;
  updateInstanceId: (assetId: string, oldItemId: string, newItemId: string) => boolean;
  duplicateInstance: (assetId: string, fromItemId: string, newItemId: string) => number | null;
  
  // Optimistic operations with backend sync
  duplicateInstanceOptimistic: (sceneId: string, assetId: string, fromItemId: string, transform?: { position: [number, number, number]; yaw_deg?: number; scale?: [number, number, number] }) => Promise<string>;
  deleteInstanceWithBackend: (sceneId: string, assetId: string, itemId: string) => Promise<boolean>;
  
  // Matrix operations
  setInstanceMatrix: (assetId: string, index: number, matrix: THREE.Matrix4) => void;
  getInstanceMatrix: (assetId: string, index: number) => THREE.Matrix4 | null;
  
  // Helper functions
  instanceWorldBox: (assetId: string, index: number) => THREE.Box3 | null;
  buildMatrix: (tr: { position: [number, number, number]; yaw_deg?: number; scale?: [number, number, number] }, pool: InstancingPool) => THREE.Matrix4;
  
  // Scene management
  reset: () => void;
}

export const useInstancingPool = create<InstancingPoolState>()(
  subscribeWithSelector((set, get) => ({
    pools: new Map(),
    
    getOrCreatePool: (assetId: string, gltf: any) => {
      const { pools } = get();
      
      if (pools.has(assetId)) {
        return pools.get(assetId)!;
      }
      
      // Create root group at identity
      const root = new THREE.Object3D();
      root.name = `instancing-pool-${assetId}`;
      
      // Compute asset-local bbox
      const assetBBoxLocal = computeAssetBBoxLocal(gltf);
      
      // Extract parts (geometries and materials) from GLTF
      const parts: Part[] = [];
      const geometries: THREE.BufferGeometry[] = [];
      const materials: THREE.Material[] = [];
      
      gltf.scene.traverse((child: any) => {
        if (child.isMesh && child.geometry && child.material) {
          // Clone geometry and material to prevent disposal issues
          const clonedGeometry = child.geometry.clone();
          const clonedMaterial = child.material.clone();
          
          geometries.push(clonedGeometry);
          materials.push(clonedMaterial);
        }
      });
      
      // Create InstancedMesh for each geometry/material pair
      geometries.forEach((geometry, index) => {
        const material = materials[index];
        const mesh = new THREE.InstancedMesh(geometry, material, 1); // Start with count 1
        
        // Critical: Set dynamic usage for frequent updates
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.userData = { assetId, partIndex: index };
        mesh.name = `${assetId}-part-${index}`;
        
        const part: Part = {
          name: `Part${index}`,
          mesh
        };
        
        parts.push(part);
        root.add(mesh);
      });
      
      // HOTFIX: Check if this asset needs rotation correction
      // Common GLB exports are Z-forward, but Three.js expects -Z forward
      let baseRotationQ: THREE.Quaternion | undefined;
      
      // Detect if GLB needs +90° Y rotation correction
      // This is a heuristic - adjust per your specific assets
      const needsRotationFix = gltf.scene.children.some((child: any) => {
        // Check if the object appears to be oriented incorrectly
        return child.isMesh && child.geometry;
      });
      
      if (needsRotationFix) {
        baseRotationQ = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, Math.PI / 2, 0) // +90° Y rotation
        );
        console.log(`🔄 Applied +90° Y rotation correction for asset ${assetId}`);
      }
      
      const pool: InstancingPool = {
        root,
        parts,
        ids: [],
        indexOf: new Map(),
        assetBBoxLocal,
        baseRotationQ, // Now properly set if needed
        originOffset: undefined
      };
      
      set(state => ({
        pools: new Map(state.pools).set(assetId, pool)
      }));
      
      console.log(`🏊 Created instancing pool for ${assetId} with ${parts.length} parts`);
      return pool;
    },
    
    getPool: (assetId: string) => {
      const { pools } = get();
      return pools.get(assetId);
    },
    
    addInstance: (assetId: string, itemId: string, transform: { position: [number, number, number]; yaw_deg?: number; scale?: [number, number, number] }) => {
      const { pools, buildMatrix } = get();
      const pool = pools.get(assetId);
      
      if (!pool) {
        console.error(`❌ Pool not found for asset ${assetId}`);
        return -1;
      }
      
      const newIndex = pool.ids.length;
      const matrix = buildMatrix(transform, pool);
      
      // Add to all parts
      pool.parts.forEach(part => {
        part.mesh.setMatrixAt(newIndex, matrix);
        part.mesh.count = newIndex + 1;
        part.mesh.instanceMatrix.needsUpdate = true;
      });
      
      pool.ids.push(itemId);
      pool.indexOf.set(itemId, newIndex);
      
      console.log(`➕ Added instance ${itemId} at index ${newIndex} to pool ${assetId}`);
      return newIndex;
    },
    
    removeInstance: (assetId: string, itemId: string) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      
      if (!pool) {
        console.error(`❌ Pool not found for asset ${assetId}`);
        return false;
      }
      
      const index = pool.indexOf.get(itemId);
      if (index === undefined) {
        console.warn(`⚠️ Instance ${itemId} not found in pool ${assetId}`);
        return false;
      }
      
      const last = pool.ids.length - 1;
      
      // Swap-remove: move last item to the removed slot (if not already the last)
      if (index !== last) {
        const tmp = new THREE.Matrix4();
        pool.parts.forEach(part => {
          part.mesh.getMatrixAt(last, tmp);
          part.mesh.setMatrixAt(index, tmp);
          part.mesh.instanceMatrix.needsUpdate = true;
        });
        
        const movedId = pool.ids[last];
        pool.ids[index] = movedId;
        pool.indexOf.set(movedId, index);
      }
      
      // Shrink all parts
      pool.parts.forEach(part => {
        part.mesh.count = last;
        part.mesh.instanceMatrix.needsUpdate = true;
      });
      
      pool.ids.pop();
      pool.indexOf.delete(itemId);
      
      console.log(`➖ Removed instance ${itemId} from index ${index} in pool ${assetId} (swap-remove)`);
      return true;
    },
    
    updateInstanceId: (assetId: string, oldItemId: string, newItemId: string) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      
      if (!pool) {
        console.error(`❌ Pool not found for asset ${assetId}`);
        return false;
      }
      
      const index = pool.indexOf.get(oldItemId);
      if (index === undefined) {
        console.warn(`⚠️ Instance ${oldItemId} not found in pool ${assetId}`);
        return false;
      }
      
      // Check if new ID already exists
      if (pool.indexOf.has(newItemId)) {
        console.warn(`⚠️ New ID ${newItemId} already exists in pool ${assetId}`);
        return false;
      }
      
      // Update the mappings
      pool.ids[index] = newItemId;
      pool.indexOf.delete(oldItemId);
      pool.indexOf.set(newItemId, index);
      
      console.log(`🔄 Updated instance ID from ${oldItemId} to ${newItemId} at index ${index} in pool ${assetId}`);
      return true;
    },
    
    duplicateInstance: (assetId: string, fromItemId: string, newItemId: string) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      
      if (!pool) {
        console.error(`❌ Pool not found for asset ${assetId}`);
        return null;
      }
      
      const fromIndex = pool.indexOf.get(fromItemId);
      if (fromIndex === undefined) {
        console.error(`❌ Source instance ${fromItemId} not found in pool ${assetId}`);
        return null;
      }
      
      const newIndex = pool.ids.length;
      const tmp = new THREE.Matrix4();
      
      // Copy matrix from source to new index for all parts
      pool.parts.forEach(part => {
        part.mesh.getMatrixAt(fromIndex, tmp);
        part.mesh.setMatrixAt(newIndex, tmp);
        part.mesh.count = newIndex + 1;
        part.mesh.instanceMatrix.needsUpdate = true;
      });
      
      pool.ids.push(newItemId);
      pool.indexOf.set(newItemId, newIndex);
      
      console.log(`🔄 Duplicated ${fromItemId} -> ${newItemId} at index ${newIndex} in pool ${assetId}`);
      return newIndex;
    },
    
    setInstanceMatrix: (assetId: string, index: number, matrix: THREE.Matrix4) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      
      if (!pool) return;
      
      // Set matrix for ALL parts at this index
      pool.parts.forEach(part => {
        part.mesh.setMatrixAt(index, matrix);
        part.mesh.instanceMatrix.needsUpdate = true;
      });
    },
    
    getInstanceMatrix: (assetId: string, index: number) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      
      if (!pool || pool.parts.length === 0) return null;
      
      const matrix = new THREE.Matrix4();
      pool.parts[0].mesh.getMatrixAt(index, matrix);
      return matrix;
    },
    
    instanceWorldBox: (assetId: string, index: number) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      
      if (!pool || pool.parts.length === 0) return null;
      
      const local = new THREE.Matrix4();
      const world = new THREE.Matrix4();
      pool.parts[0].mesh.getMatrixAt(index, local);
      world.multiplyMatrices(pool.root.matrixWorld, local);
      
      return new THREE.Box3().copy(pool.assetBBoxLocal).applyMatrix4(world);
    },
    
    buildMatrix: (tr: { position: [number, number, number]; yaw_deg?: number; scale?: [number, number, number] }, pool: InstancingPool) => {
      const pos = new THREE.Vector3(...tr.position).add(pool.originOffset ?? new THREE.Vector3());
      const yaw = THREE.MathUtils.degToRad(tr.yaw_deg ?? 0);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
      
      // Apply base rotation correction if needed
      if (pool.baseRotationQ) {
        q.multiply(pool.baseRotationQ);
      }
      
      const s = new THREE.Vector3(...(tr.scale ?? [1, 1, 1]));
      return new THREE.Matrix4().compose(pos, q, s);
    },
    
    duplicateInstanceOptimistic: async (sceneId: string, assetId: string, fromItemId: string, transform?: { position: [number, number, number]; yaw_deg?: number; scale?: [number, number, number] }) => {
      const { pools, buildMatrix } = get();
      const pool = pools.get(assetId);
      
      if (!pool) {
        throw new Error(`Pool not found for asset ${assetId}`);
      }
      
      const fromIndex = pool.indexOf.get(fromItemId);
      if (fromIndex === undefined) {
        throw new Error(`Source instance ${fromItemId} not found in pool ${assetId}`);
      }
      
      // 1) FE optimistic append
      const tempItemId = `tmp-${crypto.randomUUID()}`;
      const newIndex = pool.ids.length;
      
      let matrix: THREE.Matrix4;
      if (transform) {
        // Use provided transform
        matrix = buildMatrix(transform, pool);
      } else {
        // Copy matrix from source
        matrix = new THREE.Matrix4();
        pool.parts[0].mesh.getMatrixAt(fromIndex, matrix);
      }
      
      // Add to all parts
      pool.parts.forEach(part => {
        part.mesh.setMatrixAt(newIndex, matrix);
        part.mesh.count = newIndex + 1;
        part.mesh.instanceMatrix.needsUpdate = true;
      });
      
      pool.ids.push(tempItemId);
      pool.indexOf.set(tempItemId, newIndex);
      
      console.log(`➕ Optimistic duplicate: ${fromItemId} -> ${tempItemId} at index ${newIndex}`);
      
      try {
        // 2) POST to backend to create Item
        const response = await fetch(`/api/scenes/${sceneId}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            assetId,
            transform: transform || {
              position: [0, 0, 0], // Backend will calculate from matrix or use defaults
              yaw_deg: 0,
              scale: [1, 1, 1]
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create item: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        const realItemId = result.itemId;
        
        // 3) Replace temp ID with real ID
        pool.ids[newIndex] = realItemId;
        pool.indexOf.delete(tempItemId);
        pool.indexOf.set(realItemId, newIndex);
        
        console.log(`✅ Optimistic duplicate confirmed: ${tempItemId} -> ${realItemId}`);
        
        return realItemId;
        
      } catch (error) {
        // Rollback optimistic change
        console.error('❌ Failed to duplicate instance, rolling back:', error);
        
        // Remove from all parts
        pool.parts.forEach(part => {
          part.mesh.count = newIndex; // Shrink back
          part.mesh.instanceMatrix.needsUpdate = true;
        });
        
        pool.ids.pop();
        pool.indexOf.delete(tempItemId);
        
        throw error;
      }
    },
    
    deleteInstanceWithBackend: async (sceneId: string, assetId: string, itemId: string) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      
      if (!pool) {
        console.error(`❌ Pool not found for asset ${assetId}`);
        return false;
      }
      
      const index = pool.indexOf.get(itemId);
      if (index === undefined) {
        console.warn(`⚠️ Instance ${itemId} not found in pool ${assetId}`);
        return false;
      }
      
      try {
        // 1) Call backend first (so we don't desync)
        const response = await fetch(`/api/scenes/${sceneId}/items/${itemId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete item: ${response.status} ${response.statusText}`);
        }
        
        // 2) Update pool with swap-remove
        const last = pool.ids.length - 1;
        
        if (index !== last) {
          const tmp = new THREE.Matrix4();
          pool.parts.forEach(part => {
            part.mesh.getMatrixAt(last, tmp);
            part.mesh.setMatrixAt(index, tmp);
            part.mesh.instanceMatrix.needsUpdate = true;
          });
          
          const movedId = pool.ids[last];
          pool.ids[index] = movedId;
          pool.indexOf.set(movedId, index);
        }
        
        // Shrink all parts
        pool.parts.forEach(part => {
          part.mesh.count = last;
          part.mesh.instanceMatrix.needsUpdate = true;
        });
        
        pool.ids.pop();
        pool.indexOf.delete(itemId);
        
        console.log(`✅ Deleted instance ${itemId} from index ${index} in pool ${assetId}`);
        return true;
        
      } catch (error) {
        console.error(`❌ Failed to delete instance ${itemId}:`, error);
        return false;
      }
    },
    
    reset: () => {
      const { pools } = get();
      
      // Clean up all pools
      for (const [assetId, pool] of pools) {
        // Remove root from scene if it has a parent
        if (pool.root.parent) {
          pool.root.parent.remove(pool.root);
        }
        
        // Keep geometries for reuse, but clean up
        pool.parts.forEach(part => {
          if (part.mesh.geometry) {
            part.mesh.geometry.computeBoundingSphere?.();
          }
        });
        
        console.log(`🧼 Cleaned up instancing pool: ${assetId}`);
      }
      
      set({ pools: new Map() });
      console.log('🧼 InstancingPool: Reset all pools for scene change');
    }
  }))
);

// Helper function to compute asset-local bounding box from GLTF
function computeAssetBBoxLocal(gltf: any): THREE.Box3 {
  const box = new THREE.Box3();
  
  gltf.scene.traverse((child: any) => {
    if (child.isMesh && child.geometry) {
      child.geometry.computeBoundingBox();
      if (child.geometry.boundingBox) {
        box.union(child.geometry.boundingBox);
      }
    }
  });
  
  return box;
}