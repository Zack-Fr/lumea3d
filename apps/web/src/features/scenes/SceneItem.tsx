import { useRef, useMemo, useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group } from 'three';
import { applyMaterialOverridesToObject } from '../../utils/textureSystem';
import { applyCompatTransform } from '../../utils/transformCompat';
import { toast } from 'react-toastify';
import type { SceneItem } from '../../services/scenesApi';

interface SceneItemProps {
  item: SceneItem;
  categoryUrl: string;
  categoryKey: string;
}

export function SceneItem({ item, categoryUrl, categoryKey }: SceneItemProps) {
  const groupRef = useRef<Group>(null);
  const [hasError, setHasError] = useState(false);
  
  const { scene } = useGLTF(categoryUrl, undefined, undefined, (error: any) => {
    const msg = (error && error.message) || String(error);
    const isStorageError = /public\/storage\/serve|ECONNREFUSED|minio|s3/i.test(msg);

    if (isStorageError) {
      console.warn('SceneItem: Storage fetch failed (suppressed):', msg);
      toast.warn('Some assets are unavailable (storage offline). Using placeholders.', { position: 'top-right', autoClose: 4000, toastId: `storage-missing-${categoryUrl}` });
    } else {
      console.error('Failed to load GLB for SceneItem:', error);
      toast.error('Failed to load 3D model. The asset may be missing or corrupted.', { position: 'top-right', autoClose: 5000 });
    }
    setHasError(true);
  });
  
  // Check for placeholder GLB
  useEffect(() => {
    if (scene && !hasError) {
      if (scene.children.length === 0 && 
          (scene as any).asset?.generator === 'Lumea Placeholder') {
        console.warn('Detected placeholder GLB for missing asset in SceneItem:', categoryUrl);
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
  }, [scene, hasError, categoryUrl]);
  
  // Find the specific model node in the category scene
  const modelNode = useMemo(() => {
    if (!scene || !item.model) {
      console.warn(`⚠️ No model specified for item ${item.id} in category ${categoryKey}`);
      return scene; // Fallback to entire scene
    }
    
    // Search for named node in the loaded scene
    const foundNode = scene.getObjectByName(item.model);
    
    if (!foundNode) {
      console.warn(`⚠️ Model "${item.model}" not found in category "${categoryKey}". Available objects:`, 
        scene.children.map(child => child.name).filter(name => name)
      );
      // Try to find first mesh or fallback to first child
      const firstMesh = scene.getObjectByProperty('type', 'Mesh');
      return firstMesh || scene.children[0] || scene;
    }
    
    console.log(`✅ Found model "${item.model}" in category "${categoryKey}"`);
    return foundNode;
  }, [scene, item.model, item.id, categoryKey]);
  
  // Clone the model node to avoid modifying the original
  const clonedModel = useMemo(() => {
    if (!modelNode) return null;
    
    // Clone the object to avoid modifying the original loaded scene
    const cloned = modelNode.clone(true);
    
// Ensure the cloned GLB subtree is identity; transforms are applied on the container group
    cloned.position.set(0, 0, 0);
    cloned.quaternion.set(0, 0, 0, 1);
    cloned.scale.set(1, 1, 1);
    cloned.updateMatrix();
    
    // Set name and userData for identification - use item name if available
    const displayName = item.name || `Asset ${item.id.slice(-8)}`;
    cloned.name = displayName;
    const userData = {
      itemId: item.id,
      category: categoryKey,
      selectable: item.selectable ?? true,
      locked: item.locked ?? false,
      meta: item.meta
    };
    
    // Set userData on the root object and all children
    cloned.userData = userData;
    console.log('🔍 DEBUG: SceneItem applying userData to:', cloned.name, userData);
    
    let meshCount = 0;
    cloned.traverse((child) => {
      child.userData = { ...userData };
      if (child.type === 'Mesh') {
        meshCount++;
        // Enable shadows for imported meshes
        child.castShadow = true;
        child.receiveShadow = true;
        console.log('🔍 DEBUG: Applied userData and shadows to mesh:', child.name || 'unnamed', child.userData);
      }
    });
    console.log('🔍 DEBUG: Applied userData and shadows to', meshCount, 'mesh children');
    
    console.log(`🎯 Item "${item.id}" positioned at:`, {
      position: cloned.position.toArray(),
      rotation: cloned.rotation.toArray(),
      scale: cloned.scale.toArray()
    });
    
    return cloned;
  }, [modelNode, item, categoryKey]);
  
// Apply transform (legacy-compatible) to the container group
  useEffect(() => {
    if (!groupRef.current) return;
    applyCompatTransform(groupRef.current, item.transform as any);
    groupRef.current.updateMatrixWorld(true);
  }, [item.transform]);
  
  // Apply material overrides after the model is cloned and ready
  useEffect(() => {
    if (!clonedModel) return;
    
    const materialOverrides = item.materialOverrides || item.material;
    if (!materialOverrides || Object.keys(materialOverrides).length === 0) {
      console.log(`📦 No material overrides for item: ${item.id}`);
      return;
    }
    
    console.log(`🎨 Applying material overrides for item: ${item.id}`, materialOverrides);
    
    // Get KTX2 loader from global reference
    const ktx2Loader = (window as any).__lumea_ktx2_loader;
    
    // Apply material overrides asynchronously
    applyMaterialOverridesToObject(clonedModel, materialOverrides, ktx2Loader)
      .then(() => {
        console.log(`✅ Material overrides applied successfully to item: ${item.id}`);
      })
      .catch((error) => {
        console.error(`❌ Failed to apply material overrides to item: ${item.id}`, error);
      });
      
  }, [clonedModel, item.materialOverrides, item.material, item.id]);
  
  if (!clonedModel || hasError) {
    return null;
  }
  
  const containerDisplayName = item.name || `Asset ${item.id.slice(-8)}`;
  
  return (
    <group 
      ref={groupRef} 
      name={containerDisplayName}
      userData={{
        itemId: item.id,
        category: categoryKey,
        selectable: item.selectable ?? true,
        locked: item.locked ?? false,
        name: item.name,
        meta: {
          ...item.meta,
          itemName: item.name,
          displayName: containerDisplayName
        }
      }}
    >
      <primitive object={clonedModel} />
    </group>
  );
}

// Preload category GLBs for better performance
export function preloadCategoryGLB(url: string) {
  useGLTF.preload(url);
}