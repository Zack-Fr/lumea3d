import { useEffect, useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useInstancingPool } from './useInstancingPool';
import { useSelection, handleInstancedMeshPick } from '../selection/useSelection';
import { TransformBridge } from '../controls/TransformBridge';
import { useInstanceBoxHelper } from '../bbox/InstanceBoxHelper';
import { toast } from 'react-toastify';

interface InstancedRendererProps {
  assetId: string;
  glbUrl: string;
  items: Array<{
    id: string; // Real backend itemId
    position: [number, number, number];
    yaw_deg?: number;
    scale?: [number, number, number];
  }>;
  sceneId?: string;
}

export function InstancedRenderer({ assetId, glbUrl, items }: InstancedRendererProps) {
  const { scene } = useThree();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const gltf = useGLTF(glbUrl, undefined, undefined, (error: any) => {
    const msg = (error && error.message) || String(error);
    const isStorageError = /public\/storage\/serve|ECONNREFUSED|minio|s3/i.test(msg);

    if (isStorageError) {
      // Storage intentionally offline in some environments — show concise toast and avoid noisy trace
      console.warn('InstancedRenderer: Storage fetch failed (suppressed):', msg);
      toast.warn('Some model assets are unavailable (storage offline). Using placeholders.', { position: 'top-right', autoClose: 4000, toastId: `storage-missing-${glbUrl}` });
    } else {
      console.error('Failed to load GLB:', error);
      toast.error('Failed to load 3D model. The asset may be missing or corrupted.', { position: 'top-right', autoClose: 5000 });
    }
    setHasError(true);
    setIsLoading(false);
  });
  
  // Set loading to false when gltf is loaded
  useEffect(() => {
    if (gltf && !hasError) {
      setIsLoading(false);
      
      // Check if this is a placeholder GLB from the API
      if (gltf.scene && gltf.scene.userData && gltf.scene.userData.generator === 'Lumea Placeholder') {
        console.warn('InstancedRenderer: Detected placeholder GLB for missing asset:', glbUrl);
        setHasError(true);
        toast.error('3D model asset is missing from storage. Using error placeholder.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    }
  }, [gltf, hasError, glbUrl]);
  
  // If there's an error, don't render anything
  if (hasError) {
    return null;
  }
  
  // If still loading, don't render the pool yet
  if (isLoading) {
    return null;
  }
  
  const { getOrCreatePool, addInstance } = useInstancingPool();
  const { selection, selectInstance, deselect } = useSelection();
  const boxHelper = useInstanceBoxHelper(scene);
  
  // Create/get pool and populate with items
  const pool = useMemo(() => {
    const newPool = getOrCreatePool(assetId, gltf);
    
    // Clear existing instances first
    newPool.ids.length = 0;
    newPool.indexOf.clear();
    
    // Add each item to the pool
    items.forEach(item => {
      addInstance(assetId, item.id, {
        position: item.position,
        yaw_deg: item.yaw_deg,
        scale: item.scale
      });
    });
    
    console.log(`🏊 Populated pool ${assetId} with ${items.length} items`);
    
    return newPool;
  }, [assetId, gltf, items, getOrCreatePool, addInstance]);
  
  // Add pool root to scene
  useEffect(() => {
    if (pool.root && !pool.root.parent) {
      scene.add(pool.root);
      console.log(`🎭 Added pool root to scene: ${assetId}`);
    }
    
    return () => {
      if (pool.root && pool.root.parent) {
        pool.root.parent.remove(pool.root);
        console.log(`🧹 Removed pool root from scene: ${assetId}`);
      }
    };
  }, [pool, scene, assetId]);
  
  // Set up click handling for instanced meshes
  useEffect(() => {
    const handlePointerUp = (event: any) => {
      if (event.instanceId !== undefined && event.object.userData?.assetId === assetId) {
        const pickedSelection = handleInstancedMeshPick(event);
        if (pickedSelection) {
          selectInstance(pickedSelection.assetId, pickedSelection.index, pickedSelection.itemId);
          
          // Show bounding box for selected instance
          boxHelper.showForInstance(pickedSelection.assetId, pickedSelection.index);
        }
      } else if (!event.instanceId) {
        // Clicked on empty space
        deselect();
        boxHelper.hide();
      }
    };
    
    // Add event listeners to all parts
    pool.parts.forEach(part => {
      part.mesh.addEventListener('pointerup', handlePointerUp);
    });
    
    return () => {
      pool.parts.forEach(part => {
        part.mesh.removeEventListener('pointerup', handlePointerUp);
      });
    };
  }, [pool, assetId, selectInstance, deselect, boxHelper]);
  
  // Update bounding box during transforms
  useEffect(() => {
    if (selection && selection.assetId === assetId) {
      boxHelper.updateForInstance(selection.assetId, selection.index);
    }
  }, [selection, assetId, boxHelper]);
  
  // Transform controls
  const transformControls = useMemo(() => {
    if (selection && selection.assetId === assetId) {
      return (
        <TransformBridge
          selection={selection}
          transformMode={"translate"} // You can make this dynamic
          onTransformStart={() => console.log('Transform started')}
          onTransformEnd={(_transformData) => {
            console.log('Transform ended');
            // Update bounding box after transform
            if (selection) {
              boxHelper.updateForInstance(selection.assetId, selection.index);
            }
          }}
          enabled={true}
        />
      );
    }
    return null;
  }, [selection, assetId, boxHelper]);
  
  return (
    <>
      {/* The pool root contains all the instanced meshes */}
      {/* Transform controls for selected instance */}
      {transformControls}
    </>
  );
}

// Helper component for handling multiple asset renderers
export function MultiInstancedRenderer({ 
  items, 
  sceneId 
}: { 
  items: Array<{
    id: string;
    assetId: string;
    glbUrl: string;
    position: [number, number, number];
    yaw_deg?: number;
    scale?: [number, number, number];
  }>;
  sceneId?: string;
}) {
  // Group items by assetId
  const assetGroups = useMemo(() => {
    const groups = new Map<string, typeof items>();
    
    items.forEach(item => {
      if (!groups.has(item.assetId)) {
        groups.set(item.assetId, []);
      }
      groups.get(item.assetId)!.push(item);
    });
    
    return groups;
  }, [items]);
  
  return (
    <>
      {Array.from(assetGroups.entries()).map(([assetId, groupItems]) => {
        // Assume glbUrl is same for all items with same assetId
        const glbUrl = groupItems[0]?.glbUrl;
        if (!glbUrl) return null;
        
        return (
          <InstancedRenderer
            key={assetId}
            assetId={assetId}
            glbUrl={glbUrl}
            items={groupItems}
            sceneId={sceneId}
          />
        );
      })}
    </>
  );
}
