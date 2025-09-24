import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import * as THREE from 'three';

interface PerObjectRendererProps {
  items: Array<{
    id: string;
    name?: string;
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
    name?: string;
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
  
  if (hasError) return null;

  // Clone the scene to avoid shared references
  const meshRoot = useMemo(() => {
    const cloned = gltfScene.clone(true);
    // Identity transform for the GLB subtree; container will carry TRS
    cloned.position.set(0, 0, 0);
    cloned.quaternion.set(0, 0, 0, 1);
    cloned.scale.set(1, 1, 1);
    cloned.updateMatrix();

    // Improve names and mark shared resources
    let submeshCounter = 0;
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.name || child.name === '') {
          submeshCounter++;
          child.name = `Submesh_${submeshCounter}`;
        }
        if (child.material && (child.material as any).name) {
          child.name = `${child.name} (${(child.material as any).name})`;
        }
        if (child.geometry) child.geometry.userData = { ...child.geometry.userData, isShared: true };
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => (mat.userData = { ...mat.userData, isShared: true }));
          } else {
            (child.material as any).userData = { ...(child.material as any).userData, isShared: true };
          }
        }
      }
    });

    return cloned;
  }, [gltfScene]);

  // Build a container group per item and apply transforms there
  const container = useMemo(() => {
    const group = new THREE.Group();
    // Use item name first, then GLB name, then fallback
    let displayName = item.name || gltfScene.name || `Asset ${item.id.slice(-8)}`;
    // Remove file extensions
    displayName = displayName.replace(/\.(glb|gltf|obj|fbx|blend)$/i, '');
    group.name = displayName;

    // Selection metadata belongs on the container
    const cleanName = (item.name || `Asset ${item.id.slice(-8)}`).replace(/\.(glb|gltf|obj|fbx|blend)$/i, '');
    const userData = {
      itemId: item.id,
      name: cleanName,
      category: item.assetId.split(':')[0],
      selectable: true,
      locked: false,
      meta: { 
        isSharedAsset: true, 
        assetId: item.assetId,
        itemName: cleanName,
        displayName: cleanName
      },
    };
    (group as any).userData = userData;

    // Also mirror minimal userData on the GLB subtree so clicks promote correctly
    meshRoot.traverse((n) => {
      const existingUserData = (n as any).userData || {};
      (n as any).userData = {
        ...existingUserData,
        ...userData,
      };
    });

    // Apply container transforms
    group.position.set(item.position[0], item.position[1], item.position[2]);
    group.rotation.set(0, THREE.MathUtils.degToRad(item.yaw_deg || 0), 0);
    const s = item.scale || [1, 1, 1];
    group.scale.set(s[0], s[1], s[2]);

    // Attach GLB subtree at identity
    group.add(meshRoot);

    return group;
  }, [item.id, item.assetId, item.position, item.yaw_deg, item.scale, meshRoot, gltfScene.name]);

  // Render the container as a primitive so outliner shows a single top-level node per item
  return <primitive object={container} />;
}
