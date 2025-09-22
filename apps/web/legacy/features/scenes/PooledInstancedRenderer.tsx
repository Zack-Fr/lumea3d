import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useInstancingPoolStore, generateAssetId, computeAssetBbox, type InstanceData } from '../../stores/instancingPoolStore';

interface PooledInstancedRendererProps {
  assetId: string;
  categoryKey: string;
  glbUrl: string;
  items: Array<{
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    visible?: boolean;
  }>;
  onSelectionBboxCompute?: (itemId: string, bbox: THREE.Box3) => void;
}

export function PooledInstancedRenderer({ 
  assetId, 
  categoryKey, 
  glbUrl, 
  items,
  onSelectionBboxCompute
}: PooledInstancedRendererProps) {
  const { scene } = useGLTF(glbUrl);
  const meshRefs = useRef<THREE.InstancedMesh[]>([]);
  const assetBboxRef = useRef<THREE.Box3>();
  
  const { 
    getOrCreatePool, 
    addInstance, 
    removeInstance, 
    registerPart,
    unregisterPart
  } = useInstancingPoolStore();

  // Extract and clone geometries/materials from GLB - CRITICAL: Clone to prevent shared resource disposal
  const { geometries, materials } = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry && child.material) {
        // CRITICAL: Clone geometry and material to prevent shared resource disposal
        const clonedGeometry = child.geometry.clone();
        const clonedMaterial = child.material instanceof THREE.Material 
          ? child.material.clone() 
          : new THREE.MeshStandardMaterial({ color: 0xff0000 });
        
        geos.push(clonedGeometry);
        mats.push(clonedMaterial);
      }
    });

    if (geos.length === 0) {
      console.warn('🔺 PooledInstancedRenderer: No geometry found in GLB:', glbUrl);
      geos.push(new THREE.BoxGeometry(1, 1, 1)); // Fallback
      mats.push(new THREE.MeshStandardMaterial({ color: 0xff0000 })); // Fallback
    }

    console.log(`🔧 PooledInstancedRenderer: Extracted and cloned ${geos.length} geometries from GLB:`, glbUrl);
    return { geometries: geos, materials: mats };
  }, [scene, glbUrl]);

  // Initialize pool and register parts
  useEffect(() => {
    const pool = getOrCreatePool(assetId, categoryKey, glbUrl);
    
    // Compute asset-local bbox for selection calculations
    assetBboxRef.current = computeAssetBbox(geometries);
    
    console.log(`🏊 PooledInstancedRenderer: Initialized pool for ${assetId} with ${geometries.length} parts`, {
      poolSize: pool.ids.length,
      itemsLength: items.length,
      assetId
    });
  }, [assetId, categoryKey, glbUrl, geometries, materials]);

  // Sync items with pool
  useEffect(() => {
    console.log(`🔄 Syncing ${items.length} items with pool ${assetId}`);
    const pool = getOrCreatePool(assetId, categoryKey, glbUrl);
    
    console.log(`🏊 Pool before sync:`, {
      poolSize: pool.ids.length,
      poolIds: pool.ids,
      itemsToSync: items.map(item => item.id)
    });
    
    // Convert items to InstanceData and add to pool
    items.forEach(item => {
      if (!pool.instances.has(item.id)) {
        console.log(`➕ Adding item ${item.id} to pool ${assetId}`);
        const instanceData: InstanceData = {
          itemId: item.id,
          position: item.position,
          rotation: item.rotation,
          scale: item.scale,
          visible: item.visible
        };
        
        addInstance(assetId, instanceData);
      } else {
        console.log(`✅ Item ${item.id} already exists in pool ${assetId}`);
      }
    });
    
    // Remove instances that are no longer in items
    const currentItemIds = new Set(items.map(item => item.id));
    const itemsToRemove: string[] = [];
    pool.ids.forEach(itemId => {
      if (!currentItemIds.has(itemId)) {
        itemsToRemove.push(itemId);
      }
    });
    
    itemsToRemove.forEach(itemId => {
      console.log(`➖ Removing item ${itemId} from pool ${assetId}`);
      removeInstance(assetId, itemId);
    });
    
    console.log(`🏊 Pool after sync:`, {
      poolSize: pool.ids.length,
      poolIds: pool.ids
    });
    
  }, [assetId, items]);

  // Register parts with pool and set up selection
  const handleMeshRef = (mesh: THREE.InstancedMesh | null, geometryIndex: number) => {
    if (mesh) {
      // Store mesh reference
      meshRefs.current[geometryIndex] = mesh;
      
      const geometry = geometries[geometryIndex];
      const material = materials[geometryIndex] || materials[0];
      const partName = `Part${geometryIndex}`; // Simple part naming
      
      // Register part with pool
      registerPart(assetId, partName, mesh, geometry, material);
      
      // Set up custom raycasting for selection
      setupInstancedMeshSelection(mesh, assetId);
      
      console.log(`🔧 PooledInstancedRenderer: Registered part "${partName}" for ${assetId}`);
    } else {
      // Cleanup
      const oldMesh = meshRefs.current[geometryIndex];
      if (oldMesh) {
        const partName = `Part${geometryIndex}`;
        unregisterPart(assetId, partName);
        meshRefs.current[geometryIndex] = null as any;
      }
    }
  };

  // Custom raycasting for instanced mesh selection with proper bbox computation
  const setupInstancedMeshSelection = (mesh: THREE.InstancedMesh, assetId: string) => {
    mesh.raycast = (raycaster, intersects) => {
      const tempIntersects: THREE.Intersection[] = [];
      
      // CRITICAL: Prevent infinite recursion by using the original THREE.InstancedMesh raycast
      THREE.InstancedMesh.prototype.raycast.call(mesh, raycaster, tempIntersects);
      
      tempIntersects.forEach(intersection => {
        if (intersection.instanceId !== undefined) {
          const pool = getOrCreatePool(assetId, categoryKey, glbUrl);
          const instanceId = intersection.instanceId;
          
          // Check if pool is empty
          if (pool.ids.length === 0) {
            console.warn(`⚠️ Pool is empty for assetId ${assetId}, skipping raycast`);
            return;
          }
          
          // Debug logging (reduced for performance)
          // console.log(`🎯 InstancedMesh raycast hit instanceId=${instanceId}, itemId will be ${pool.ids[instanceId]}`);
          
          // Check if instanceId is valid
          if (instanceId >= pool.ids.length || instanceId < 0) {
            console.warn(`⚠️ Invalid instanceId ${instanceId} for pool with ${pool.ids.length} items in ${assetId}`);
            return;
          }
          
          const itemId = pool.ids[instanceId];
          const instance = pool.instances.get(itemId);
          
          // Check if itemId is valid
          if (!itemId) {
            console.warn(`⚠️ No itemId found at index ${instanceId} in pool ${assetId}`);
            return;
          }
          
          if (instance && assetBboxRef.current) {
            // Compute proper selection bbox: asset-local bbox × instance world matrix
            const worldMatrix = instance.matrix || new THREE.Matrix4();
            const worldBbox = assetBboxRef.current.clone().applyMatrix4(worldMatrix);
            
            // Notify parent about bbox for selection highlighting
            if (onSelectionBboxCompute) {
              onSelectionBboxCompute(itemId, worldBbox);
            }
            
            // Set userData for selection system
            intersection.object.userData = {
              itemId: itemId,
              category: categoryKey,
              selectable: true,
              locked: false,
              meta: { 
                instanceId, 
                isInstancedMesh: true, 
                assetId,
                worldBbox 
              }
            };
            
            intersects.push(intersection);
            
            // console.log(`✅ Successfully set userData for instance ${instanceId} with itemId ${itemId}`);
          } else {
            console.warn(`⚠️ No instance data found for itemId ${itemId} in pool ${assetId}`);
          }
        }
      });
    };
  };

  if (!geometries || geometries.length === 0) {
    return null;
  }

  const pool = getOrCreatePool(assetId, categoryKey, glbUrl);
  const instanceCount = Math.max(1, Math.max(pool.ids.length, items.length)); // Ensure at least 1 instance

  console.log(`🎯 PooledInstancedRenderer: Rendering with instanceCount=${instanceCount} for assetId=${assetId}`, {
    geometryCount: geometries.length,
    poolSize: pool.ids.length,
    itemsLength: items.length,
    instanceCount
  });

  // Render one instancedMesh per geometry/material pair from the GLB
  return (
    <group name={`pooled-instanced-group-${assetId}`}>
      {geometries.map((geometry, index) => {
        const material = materials[index] || materials[0] || new THREE.MeshStandardMaterial({ color: 0xff0000 });
        
        return (
          <instancedMesh
            key={`pooled-instanced-mesh-${index}`}
            ref={(mesh) => handleMeshRef(mesh, index)}
            args={[geometry, material, instanceCount]}
            frustumCulled={false} // We could implement frustum culling later
            castShadow
            receiveShadow
            dispose={null} // CRITICAL: Prevent auto-disposal of shared resources
          />
        );
      })}
    </group>
  );
}

// Hook for determining when to use pooled instancing vs individual rendering
export function usePooledInstancingDecision(items: any[], categoryKey: string, glbUrl: string, model?: string) {
  return useMemo(() => {
    // Group items by asset
    const assetGroups = new Map<string, typeof items>();
    
    items.forEach(item => {
      const itemAssetId = generateAssetId(categoryKey, glbUrl, item.model || model);
      if (!assetGroups.has(itemAssetId)) {
        assetGroups.set(itemAssetId, []);
      }
      assetGroups.get(itemAssetId)!.push(item);
    });
    
    // Determine instancing strategy
    const instancedAssets = new Map<string, typeof items>();
    const individualItems: typeof items = [];
    
    assetGroups.forEach((groupItems, groupAssetId) => {
      if (groupItems.length > 1) {
        // Use pooled instancing for multiple instances
        instancedAssets.set(groupAssetId, groupItems);
      } else {
        // Use individual rendering for single instances
        individualItems.push(...groupItems);
      }
    });
    
    return {
      usePooledInstancing: instancedAssets.size > 0,
      instancedAssets,
      individualItems
    };
  }, [items, categoryKey, glbUrl, model]);
}