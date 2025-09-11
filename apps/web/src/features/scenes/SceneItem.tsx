import { useRef, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group } from 'three';
import type { SceneItem } from '../../services/scenesApi';

interface SceneItemProps {
  item: SceneItem;
  categoryUrl: string;
  categoryKey: string;
}

export function SceneItem({ item, categoryUrl, categoryKey }: SceneItemProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(categoryUrl);
  
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
    
    // Apply transform from manifest with safe defaults
    const transform = item.transform || {};
    const position = transform.position || [0, 0, 0];
    const rotation_euler = transform.rotation_euler || [0, 0, 0];
    const scale = transform.scale || [1, 1, 1];
    
    // Apply position
    cloned.position.set(position[0], position[1], position[2]);
    
    // Apply rotation (convert degrees to radians)
    cloned.rotation.set(
      (rotation_euler[0] * Math.PI) / 180,
      (rotation_euler[1] * Math.PI) / 180,
      (rotation_euler[2] * Math.PI) / 180
    );
    
    // Apply scale
    cloned.scale.set(scale[0], scale[1], scale[2]);
    
    // Set name and userData for identification
    cloned.name = `item-${item.id}`;
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
  
  if (!clonedModel) {
    return null;
  }
  
  return (
    <group 
      ref={groupRef} 
      name={`item-group-${item.id}`}
      userData={{
        itemId: item.id,
        category: categoryKey,
        selectable: item.selectable ?? true,
        locked: item.locked ?? false,
        meta: item.meta
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