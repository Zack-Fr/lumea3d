import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import * as THREE from 'three';

interface PerObjectRendererProps {
  items: Array<{
    id: string;
    assetId: string;
    glbUrl: string;
    position: [number, number, number];
    yaw_deg?: number;
    scale?: [number, number, number];
  }>;
}

/**
 * Stable fallback renderer - renders each item as its own mesh clone
 * No instancing, but fully working selection/transform/delete
 */
export function PerObjectRenderer({ items }: PerObjectRendererProps) {
  console.log(`🔧 PerObjectRenderer: Rendering ${items.length} items as individual meshes (no instancing)`);
  
  return (
    <group name="per-object-renderer">
      {items.map(item => (
        <SingleObjectRenderer key={item.id} item={item} />
      ))}
    </group>
  );
}

interface SingleObjectRendererProps {
  item: {
    id: string;
    assetId: string;
    glbUrl: string;
    position: [number, number, number];
    yaw_deg?: number;
    scale?: [number, number, number];
  };
}

function SingleObjectRenderer({ item }: SingleObjectRendererProps) {
  const [hasError, setHasError] = useState(false);
  const { scene: gltfScene } = useGLTF(item.glbUrl, undefined, undefined, (error: any) => {
    const msg = (error && error.message) || String(error);
    const isStorageError = /public\/storage\/serve|ECONNREFUSED|minio|s3/i.test(msg);

    if (isStorageError) {
      console.warn('SingleObjectRenderer: Storage fetch failed (suppressed):', msg);
      toast.warn('Some model assets are unavailable (storage offline). Using placeholders.', { position: 'top-right', autoClose: 4000, toastId: `storage-missing-${item.id}` });
    } else {
      console.error('Failed to load GLB for SingleObjectRenderer:', error);
      toast.error('Failed to load 3D model. The asset may be missing or corrupted.', { position: 'top-right', autoClose: 5000 });
    }
    setHasError(true);
  });
  
  // Check for placeholder GLB
  useEffect(() => {
    if (gltfScene && !hasError) {
      if (gltfScene.children.length === 0 && 
          (gltfScene as any).asset?.generator === 'Lumea Placeholder') {
        console.warn('Detected placeholder GLB for missing asset in SingleObjectRenderer:', item.glbUrl);
        setHasError(true);
        toast.error('3D model not found. The asset may have been deleted or moved.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    }
  }, [gltfScene, hasError, item.glbUrl]);
  
  // If there's an error, don't render anything
  if (hasError) {
    return null;
  }
  
  // Clone the scene to avoid shared references
  const clonedScene = useMemo(() => {
    const cloned = gltfScene.clone(true);
    
    // Set userData for selection
    cloned.userData = {
      itemId: item.id,
      category: item.assetId.split(':')[0], // Extract category from assetId
      selectable: true,
      locked: false,
      isSharedAsset: true, // Mark as shared GLB asset - DON'T dispose geometry/materials
      meta: {
        isInstancedMesh: false, // This is NOT an instanced mesh
        assetId: item.assetId
      }
    };
    
    // Apply userData to all children for robust selection and mark geometries/materials as shared
    let submeshCounter = 0;
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.userData = { ...cloned.userData };
        
        // Improve submesh naming
        if (child.parent !== null && child.parent !== cloned) { // If this is a submesh (not the root)
          if (!child.name || child.name === '') {
            submeshCounter++;
            child.name = `Submesh_${submeshCounter}`;
          }
          // Add material info to name if available
          if (child.material && (child.material as any).name) {
            child.name = `${child.name} (${(child.material as any).name})`;
          }
        }
        
        // Mark geometry and materials as shared to prevent disposal during cleanup
        if (child.geometry) {
          child.geometry.userData = { ...child.geometry.userData, isShared: true };
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              mat.userData = { ...mat.userData, isShared: true };
            });
          } else {
            child.material.userData = { ...child.material.userData, isShared: true };
          }
        }
      }
    });
    
    return cloned;
  }, [gltfScene, item.id, item.assetId]);
  
  // Apply transform
  useEffect(() => {
    clonedScene.position.set(...item.position);
    clonedScene.rotation.set(0, THREE.MathUtils.degToRad(item.yaw_deg || 0), 0);
    clonedScene.scale.set(...(item.scale || [1, 1, 1]));
    clonedScene.updateMatrix();
  }, [clonedScene, item.position, item.yaw_deg, item.scale]);
  
  return <primitive object={clonedScene} />;
}