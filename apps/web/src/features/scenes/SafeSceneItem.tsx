import { useState, useEffect } from 'react';
import { SceneItem as SceneItemComponent } from './SceneItem';
import type { SceneItem } from '../../services/scenesApi';

interface SafeSceneItemProps {
  item: SceneItem;
  categoryUrl: string;
  categoryKey: string;
}

export function SafeSceneItem({ item, categoryUrl, categoryKey }: SafeSceneItemProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Debug logging for item being processed
  console.log(`📦 SafeSceneItem: Processing item`, {
    itemId: item.id,
    itemName: item.name,
    categoryKey,
    categoryUrl,
    selectable: item.selectable,
    position: item.transform?.position,
    isLocal: (item as any).meta?.isLocal,
    isBlobUrl: categoryUrl ? categoryUrl.startsWith('blob:') : false
  });

  useEffect(() => {
    // Test if the category URL is accessible
    if (!categoryUrl || typeof categoryUrl !== 'string' || categoryUrl.trim() === '') {
      console.warn(`⚠️ SafeSceneItem: Invalid or empty category URL for item ${item.id}:`, {
        categoryUrl,
        type: typeof categoryUrl,
        isEmpty: !categoryUrl,
        isEmptyString: categoryUrl === ''
      });
      setHasError(true);
      setIsLoading(false);
      return;
    }

    console.log(`🔍 SafeSceneItem: Testing category URL: ${categoryUrl}`);
    
    // Handle blob URLs differently - they can't be tested with fetch HEAD
    if (categoryUrl.startsWith('blob:')) {
      console.log(`💾 SafeSceneItem: Blob URL detected, skipping fetch test for ${categoryUrl}`);
      setHasError(false);
      setIsLoading(false);
      return;
    }
    
    // Handle data URLs - they also can't be tested with fetch
    if (categoryUrl.startsWith('data:')) {
      console.log(`💾 SafeSceneItem: Data URL detected, skipping fetch test for ${categoryUrl}`);
      setHasError(false);
      setIsLoading(false);
      return;
    }
    
    fetch(categoryUrl, { method: 'HEAD' })
      .then(response => {
        console.log(`✅ SafeSceneItem: Category URL test result for ${categoryUrl}:`, response.status);
        if (response.ok) {
          setHasError(false);
        } else {
          console.warn(`⚠️ SafeSceneItem: Category URL not accessible (${response.status}): ${categoryUrl}`);
          setHasError(true);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error(`❌ SafeSceneItem: Category URL test failed for ${categoryUrl}:`, error);
        setHasError(true);
        setIsLoading(false);
      });
  }, [categoryUrl, item.id]);

  if (isLoading) {
    // Show loading wireframe
    return (
      <mesh 
        name={`loading-${item.id}`}
        position={item.transform?.position || [0, 0, 0]} 
        rotation={item.transform?.rotation_euler || [0, 0, 0]} 
        scale={item.transform?.scale || [1, 1, 1]}
        castShadow
        receiveShadow
        userData={{
          itemId: item.id,
          category: categoryKey,
          selectable: item.selectable ?? true,
          locked: item.locked ?? false,
          meta: item.meta
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="cyan" wireframe />
      </mesh>
    );
  }

  if (hasError) {
    // Show error wireframe
    console.log(`🔴 SafeSceneItem: Rendering fallback for item ${item.id} (${categoryUrl || 'undefined categoryUrl'} failed)`);
    return (
      <mesh 
        name={`error-${item.id}`}
        position={item.transform?.position || [0, 0, 0]} 
        rotation={item.transform?.rotation_euler || [0, 0, 0]} 
        scale={item.transform?.scale || [1, 1, 1]}
        castShadow
        receiveShadow
        userData={{
          itemId: item.id,
          category: categoryKey,
          selectable: item.selectable ?? true,
          locked: item.locked ?? false,
          meta: item.meta
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" wireframe />
      </mesh>
    );
  }

  // Try to render the actual scene item
  try {
    return (
      <SceneItemComponent
        item={item}
        categoryUrl={categoryUrl}
        categoryKey={categoryKey}
      />
    );
  } catch (error) {
    console.error(`❤️ SafeSceneItem: Runtime error rendering item ${item.id}:`, error);
    // Fallback to wireframe on runtime error
    return (
      <mesh 
        name={`runtime-error-${item.id}`}
        position={item.transform?.position || [0, 0, 0]} 
        rotation={item.transform?.rotation_euler || [0, 0, 0]} 
        scale={item.transform?.scale || [1, 1, 1]}
        castShadow
        receiveShadow
        userData={{
          itemId: item.id,
          category: categoryKey,
          selectable: item.selectable ?? true,
          locked: item.locked ?? false,
          meta: item.meta
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="magenta" wireframe />
      </mesh>
    );
  }
}
