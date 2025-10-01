import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as THREE from 'three';

export interface InstanceData {
  itemId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible?: boolean;
  matrix?: THREE.Matrix4;
}

export interface InstancePart {
  name: string; // sub-mesh name (e.g., "Body", "Wheels", "Glass")
  mesh: THREE.InstancedMesh;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

export interface InstancePool {
  assetId: string;
  categoryKey: string;
  glbUrl: string;
  parts: InstancePart[]; // [Body, Wheels, Glass, ...] - one per sub-mesh/material type
  ids: string[]; // instanceIndex -> itemId (global for this asset)
  indexOf: Map<string, number>; // itemId -> instanceIndex
  instances: Map<string, InstanceData>; // itemId -> InstanceData (for convenience)
}

interface InstancingPoolState {
  pools: Map<string, InstancePool>; // assetId -> InstancePool
  
  // Core pool management
  getOrCreatePool: (assetId: string, categoryKey: string, glbUrl: string) => InstancePool;
  addInstance: (assetId: string, instance: InstanceData) => void;
  removeInstance: (assetId: string, itemId: string) => boolean;
  updateInstance: (assetId: string, itemId: string, updates: Partial<InstanceData>) => boolean;
  getInstanceIndex: (assetId: string, itemId: string) => number | undefined;
  
  // Part management
  registerPart: (assetId: string, partName: string, mesh: THREE.InstancedMesh, geometry: THREE.BufferGeometry, material: THREE.Material) => void;
  unregisterPart: (assetId: string, partName: string) => void;
  
  // Matrix operations
  setItemMatrix: (assetId: string, instanceIndex: number, matrix: THREE.Matrix4) => void;
  getItemMatrix: (assetId: string, instanceIndex: number) => THREE.Matrix4 | null;
  
  // Item operations
  duplicateItem: (assetId: string, fromItemId: string, newItemId: string, newTransform?: Partial<InstanceData>) => boolean;
  deleteItem: (assetId: string, itemId: string) => boolean;
  
  // Cleanup
  clearPool: (assetId: string) => void;
  clearAll: () => void;
}

export const useInstancingPoolStore = create<InstancingPoolState>()(
  subscribeWithSelector((set, get) => ({
    pools: new Map(),
    
    getOrCreatePool: (assetId: string, categoryKey: string, glbUrl: string) => {
      const { pools } = get();
      
      if (pools.has(assetId)) {
        return pools.get(assetId)!;
      }
      
      const newPool: InstancePool = {
        assetId,
        categoryKey,
        glbUrl,
        parts: [],
        ids: [],
        indexOf: new Map(),
        instances: new Map()
      };
      
      set(state => ({
        pools: new Map(state.pools).set(assetId, newPool)
      }));
      
      console.log(`🏊 InstancingPool: Created pool for asset ${assetId}`);
      return newPool;
    },
    
    addInstance: (assetId: string, instance: InstanceData) => {
      const { pools, setItemMatrix } = get();
      const pool = pools.get(assetId);
      
      if (!pool) {
        console.error(`❌ InstancingPool: Pool not found for asset ${assetId}`);
        return;
      }
      
      // Add to the end of the ids array
      const newIndex = pool.ids.length;
      pool.ids.push(instance.itemId);
      pool.indexOf.set(instance.itemId, newIndex);
      pool.instances.set(instance.itemId, instance);
      
      // Create matrix from transform
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3(...instance.position);
      const rotation = new THREE.Euler(...instance.rotation);
      const scale = new THREE.Vector3(...instance.scale);
      
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      instance.matrix = matrix;
      
      // Set matrix for ALL parts at this index
      setItemMatrix(assetId, newIndex, matrix);
      
      // Update count for all parts
      pool.parts.forEach(part => {
        part.mesh.count = pool.ids.length;
        part.mesh.instanceMatrix.needsUpdate = true;
      });
      
      set(state => ({
        pools: new Map(state.pools)
      }));
      
      console.log(`🏊 InstancingPool: Added instance ${instance.itemId} to ${assetId} at index ${newIndex}`);
    },
    
    removeInstance: (assetId: string, itemId: string) => {
      const { deleteItem } = get();
      return deleteItem(assetId, itemId);
    },
    
    updateInstance: (assetId: string, itemId: string, updates: Partial<InstanceData>) => {
      const { pools, setItemMatrix } = get();
      const pool = pools.get(assetId);
      
      if (!pool || !pool.instances.has(itemId)) {
        console.warn(`⚠️ InstancingPool: Instance ${itemId} not found in pool ${assetId}`);
        return false;
      }
      
      const instance = pool.instances.get(itemId)!;
      const instanceIndex = pool.indexOf.get(itemId)!;
      
      Object.assign(instance, updates);
      
      // Recalculate matrix if transform changed
      if (updates.position || updates.rotation || updates.scale) {
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3(...instance.position);
        const rotation = new THREE.Euler(...instance.rotation);
        const scale = new THREE.Vector3(...instance.scale);
        
        matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
        instance.matrix = matrix;
        
        // CRITICAL: Set matrix for ALL parts at this index
        setItemMatrix(assetId, instanceIndex, matrix);
      }
      
      set(state => ({
        pools: new Map(state.pools)
      }));
      
      console.log(`🏊 InstancingPool: Updated instance ${itemId} at index ${instanceIndex} in ${assetId}`);
      return true;
    },
    
    getInstanceIndex: (assetId: string, itemId: string) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      return pool?.indexOf.get(itemId);
    },
    
    registerPart: (assetId: string, partName: string, mesh: THREE.InstancedMesh, geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      
      if (!pool) {
        console.error(`❌ InstancingPool: Pool not found for asset ${assetId}`);
        return;
      }
      
      // Add part to pool
      const part: InstancePart = {
        name: partName,
        mesh,
        geometry,
        material
      };
      
      pool.parts.push(part);
      
      // Set userData on mesh for selection
      mesh.userData = {
        assetId,
        partName,
        isInstancedMesh: true
      };
      
      // Initialize count
      mesh.count = pool.ids.length;
      
      console.log(`🏊 InstancingPool: Registered part "${partName}" for asset ${assetId}, total parts: ${pool.parts.length}`);
    },
    
    unregisterPart: (assetId: string, partName: string) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      
      if (!pool) return;
      
      const index = pool.parts.findIndex(part => part.name === partName);
      if (index > -1) {
        pool.parts.splice(index, 1);
        console.log(`🏊 InstancingPool: Unregistered part "${partName}" for asset ${assetId}, remaining: ${pool.parts.length}`);
      }
    },
    
    setItemMatrix: (assetId: string, instanceIndex: number, matrix: THREE.Matrix4) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      
      if (!pool) return;
      
      // Set matrix for ALL parts at this index
      pool.parts.forEach(part => {
        part.mesh.setMatrixAt(instanceIndex, matrix);
        part.mesh.instanceMatrix.needsUpdate = true;
      });
      
      console.log(`🎯 InstancingPool: Set matrix for all parts at index ${instanceIndex} in ${assetId}`);
    },
    
    getItemMatrix: (assetId: string, instanceIndex: number) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      
      if (!pool || pool.parts.length === 0) return null;
      
      // Get matrix from the first part (all parts should have the same matrix at this index)
      const matrix = new THREE.Matrix4();
      pool.parts[0].mesh.getMatrixAt(instanceIndex, matrix);
      return matrix;
    },
    
    duplicateItem: (assetId: string, fromItemId: string, newItemId: string, newTransform?: Partial<InstanceData>) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      
      if (!pool) {
        console.error(`❌ InstancingPool: Pool not found for asset ${assetId}`);
        return false;
      }
      
      const fromIdx = pool.indexOf.get(fromItemId);
      if (fromIdx === undefined) {
        console.error(`❌ InstancingPool: Source item ${fromItemId} not found in pool ${assetId}`);
        return false;
      }
      
      const toIdx = pool.ids.length;
      
      // Copy matrix from source index to new index for ALL parts
      const tmp = new THREE.Matrix4();
      pool.parts.forEach(part => {
        part.mesh.getMatrixAt(fromIdx, tmp);
        
        // Apply new transform if provided
        if (newTransform && (newTransform.position || newTransform.rotation || newTransform.scale)) {
          const position = new THREE.Vector3(...(newTransform.position || [0, 0, 0]));
          const rotation = new THREE.Euler(...(newTransform.rotation || [0, 0, 0]));
          const scale = new THREE.Vector3(...(newTransform.scale || [1, 1, 1]));
          
          const newMatrix = new THREE.Matrix4();
          newMatrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
          part.mesh.setMatrixAt(toIdx, newMatrix);
        } else {
          part.mesh.setMatrixAt(toIdx, tmp);
        }
        
        part.mesh.count = toIdx + 1; // Grow the pool
        part.mesh.instanceMatrix.needsUpdate = true;
      });
      
      // Update pool data
      pool.ids.push(newItemId);
      pool.indexOf.set(newItemId, toIdx);
      
      // Create instance data for convenience
      const sourceInstance = pool.instances.get(fromItemId);
      if (sourceInstance) {
        const newInstance: InstanceData = {
          itemId: newItemId,
          position: newTransform?.position || sourceInstance.position,
          rotation: newTransform?.rotation || sourceInstance.rotation,
          scale: newTransform?.scale || sourceInstance.scale,
          visible: newTransform?.visible !== undefined ? newTransform.visible : sourceInstance.visible
        };
        pool.instances.set(newItemId, newInstance);
      }
      
      set(state => ({
        pools: new Map(state.pools)
      }));
      
      console.log(`🏊 InstancingPool: Duplicated ${fromItemId} -> ${newItemId} at index ${toIdx} in ${assetId}`);
      return true;
    },
    
    deleteItem: (assetId: string, itemId: string) => {
      const { pools } = get();
      const pool = pools.get(assetId);
      
      if (!pool) {
        console.error(`❌ InstancingPool: Pool not found for asset ${assetId}`);
        return false;
      }
      
      const idx = pool.indexOf.get(itemId);
      if (idx === undefined) {
        console.warn(`⚠️ InstancingPool: Item ${itemId} not found in pool ${assetId}`);
        return false;
      }
      
      const last = pool.ids.length - 1;
      
      // Swap-remove: move last item to the removed slot (if not already the last)
      if (idx !== last) {
        const tmp = new THREE.Matrix4();
        pool.parts.forEach(part => {
          part.mesh.getMatrixAt(last, tmp);
          part.mesh.setMatrixAt(idx, tmp);
          part.mesh.instanceMatrix.needsUpdate = true;
        });
        
        const movedId = pool.ids[last];
        pool.ids[idx] = movedId;
        pool.indexOf.set(movedId, idx);
      }
      
      // Shrink all parts
      pool.parts.forEach(part => {
        part.mesh.count = last;
        part.mesh.instanceMatrix.needsUpdate = true;
      });
      
      // Remove from pool data
      pool.ids.pop();
      pool.indexOf.delete(itemId);
      pool.instances.delete(itemId);
      
      set(state => ({
        pools: new Map(state.pools)
      }));
      
      console.log(`🏊 InstancingPool: Deleted item ${itemId} from index ${idx} in ${assetId} (swap-remove)`);
      return true;
    },
    
    
    clearPool: (assetId: string) => {
      set(state => {
        const newPools = new Map(state.pools);
        newPools.delete(assetId);
        return { pools: newPools };
      });
      
      console.log(`🏊 InstancingPool: Cleared pool for asset ${assetId}`);
    },
    
    clearAll: () => {
      set({ pools: new Map() });
      console.log(`🏊 InstancingPool: Cleared all pools`);
    }
  }))
);

// Helper to generate asset ID from category + model
export function generateAssetId(categoryKey: string, glbUrl: string, model?: string): string {
  const baseId = `${categoryKey}:${glbUrl}`;
  return model ? `${baseId}:${model}` : baseId;
}

// Helper to extract bbox from geometry
export function computeAssetBbox(geometries: THREE.BufferGeometry[]): THREE.Box3 {
  const bbox = new THREE.Box3();
  
  geometries.forEach(geometry => {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      bbox.union(geometry.boundingBox);
    }
  });
  
  return bbox;
}