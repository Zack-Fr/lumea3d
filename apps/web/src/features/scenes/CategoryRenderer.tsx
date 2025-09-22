import { Suspense } from 'react';
import type { SceneItem, CategoryInfo } from '../../services/scenesApi';
import { pickCategoryUrl } from './useSceneAssets';
import { MultiInstancedRenderer } from '../../viewer/instancing/InstancedRenderer';
import { PerObjectRenderer } from './PerObjectRenderer';
import { FEATURE_INSTANCING } from '../../config/features';

interface CategoryRendererProps {
  categoryKey: string;
  category: CategoryInfo;
  items: SceneItem[];
  sceneId?: string;
}

export function CategoryRenderer({ categoryKey, category, items, sceneId }: CategoryRendererProps) {
  const categoryUrl = pickCategoryUrl(category);
  
  // CRITICAL: Prevent crash if URL is empty
  if (!categoryUrl || categoryUrl.trim() === '') {
    console.error(`❌ CategoryRenderer: Empty URL for category "${categoryKey}". Category:`, category);
    return (
      <group name={`category-${categoryKey}-error`}>
        {/* Render placeholder boxes for items with missing assets */}
        {items.filter(item => {
          const itemCategory = typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey || '';
          return itemCategory === categoryKey;
        }).map((item) => (
          <mesh 
            key={item.id} 
            name={`fallback-${item.id}`}
            position={item.transform?.position || [0, 0, 0]}
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
        ))}
      </group>
    );
  }
  
  // Filter items that belong to this category and are NOT lights
  const categoryItems = items.filter(item => {
    const itemCategory = typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey || '';
    const isLight = (item as any)?.meta?.isLight === true;
    if (isLight) {
      // Skip rendering lights as GLB meshes; they are handled by LightsFromManifest
      return false;
    }
    return itemCategory === categoryKey;
  });
  
  if (categoryItems.length === 0) {
    console.log(`⚠️ No items found for category "${categoryKey}"`);
    return null;
  }
  
  // Convert items to the new format expected by MultiInstancedRenderer
  const instancedItems = categoryItems.map(item => {
    // DEBUG: Log each itemId to identify temp vs real IDs
    const isTemporaryId = item.id?.startsWith('temp_') || false;
    if (isTemporaryId) {
      console.warn(`⚠️ CategoryRenderer: Found temporary ID in scene data:`, {
        itemId: item.id,
        categoryKey,
        position: item.transform?.position
      });
    }
    
    return {
      id: item.id, // Real backend itemId (hopefully)
      assetId: `${categoryKey}:${categoryUrl}`, // Generate consistent assetId
      glbUrl: categoryUrl,
      position: item.transform?.position || [0, 0, 0] as [number, number, number],
      yaw_deg: item.transform?.rotation_euler ? item.transform.rotation_euler[1] * (180 / Math.PI) : 0, // Convert Y rotation to degrees
      scale: item.transform?.scale || [1, 1, 1] as [number, number, number]
    };
  });
  
  console.log(`🏢 CategoryRenderer "${categoryKey}" - Rendering Strategy:`, {
    url: categoryUrl,
    totalItems: categoryItems.length,
    assetId: `${categoryKey}:${categoryUrl}`,
    renderingStrategy: FEATURE_INSTANCING ? 'INSTANCED_EXPERIMENTAL' : 'PER_OBJECT_STABLE',
    featureFlag: FEATURE_INSTANCING
  });
  
  return (
    <group name={`category-${categoryKey}`}>
      <Suspense 
        fallback={
          <group>
            {categoryItems.map((item) => (
              <mesh 
                key={item.id} 
                name={`category-fallback-${item.id}`}
                position={item.transform?.position || [0, 0, 0]}
                userData={{
                  itemId: item.id,
                  category: categoryKey,
                  selectable: item.selectable ?? true,
                  locked: item.locked ?? false,
                  meta: item.meta
                }}
              >
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="yellow" wireframe />
              </mesh>
            ))}
          </group>
        }
      >
        {FEATURE_INSTANCING ? (
          <MultiInstancedRenderer 
            items={instancedItems}
            sceneId={sceneId}
          />
        ) : (
          <PerObjectRenderer items={instancedItems} />
        )}
      </Suspense>
    </group>
  );
}
