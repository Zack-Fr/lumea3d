import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
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
  const { scene: gltfScene } = useGLTF(item.glbUrl);
  
  // Clone the scene to avoid shared references
  const clonedScene = useMemo(() => {
    const cloned = gltfScene.clone(true);
    
    // Set userData for selection
    cloned.userData = {
      itemId: item.id,
      category: item.assetId.split(':')[0], // Extract category from assetId
      selectable: true,
      locked: false,
      meta: {
        isInstancedMesh: false, // This is NOT an instanced mesh
        assetId: item.assetId
      }
    };
    
    // Apply userData to all children for robust selection
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.userData = { ...cloned.userData };
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