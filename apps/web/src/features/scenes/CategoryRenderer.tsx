import { Suspense, useMemo } from 'react';
import type { SceneItem, CategoryInfo } from '../../services/scenesApi';
import { useInstancedRenderer } from './InstancedRenderer';
import { pickCategoryUrl } from './useSceneAssets';
import { SafeInstancedObject } from './SafeInstancedObject';
import { SafeSceneItem } from './SafeSceneItem';

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
          <mesh key={item.id} position={item.transform?.position || [0, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="red" wireframe />
          </mesh>
        ))}
      </group>
    );
  }
  
  // Filter items that belong to this category
  const categoryItems = items.filter(item => {
    const itemCategory = typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey || '';
    return itemCategory === categoryKey;
  });
  
  // Group items by model for instancing
  const itemGroups = useMemo(() => {
    const groups = new Map<string, typeof categoryItems>();
    
    categoryItems.forEach(item => {
      const model = item.model;
      if (!model) return; // Skip items without model
      
      if (!groups.has(model)) {
        groups.set(model, []);
      }
      groups.get(model)!.push(item);
    });
    
    return groups;
  }, [categoryItems]);

  // Determine which models should use instancing (more than 1 instance)
  const { instanceGroups } = useInstancedRenderer(categoryItems, categoryUrl);
  const shouldUseInstancing = instanceGroups.size > 0;
  
  console.log(`🏗️ CategoryRenderer "${categoryKey}":`, {
    url: categoryUrl,
    itemCount: categoryItems.length,
    uniqueModels: itemGroups.size,
    instanceGroupsCount: instanceGroups.size,
    useInstancing: shouldUseInstancing
  });
  
  if (categoryItems.length === 0) {
    console.log(`⚠️ No items found for category "${categoryKey}"`);
    return null;
  }
  
  return (
    <group name={`category-${categoryKey}`}>
      {shouldUseInstancing ? (
        // Use instanced rendering for repeated objects
        Array.from(instanceGroups.entries()).map(([model, groupItems], index) => {
          // Fix: Don't concatenate if categoryUrl is already a complete URL
          const glbUrl = categoryUrl.startsWith('http') ? categoryUrl : `${categoryUrl}${model}`;
          console.log(`🎯 CategoryRenderer - categoryUrl: ${categoryUrl}`);
          console.log(`🎯 CategoryRenderer - model: ${model}`);
          console.log(`🎯 Attempting to load instanced GLB: ${glbUrl}`);
          
          return (
            <Suspense 
              key={`instanced-${sceneId || 'unknown'}-${model}-${index}`} 
              fallback={
                <group>
                  {groupItems.map((item: any) => (
                    <mesh key={item.id} position={item.transform?.position || [0, 0, 0]}>
                      <boxGeometry args={[1, 1, 1]} />
                      <meshBasicMaterial color="yellow" wireframe />
                    </mesh>
                  ))}
                </group>
              }
            >
              <SafeInstancedObject
                glbUrl={glbUrl}
                items={groupItems.map((item: any) => ({
                  id: item.id,
                  position: item.transform?.position || [0, 0, 0],
                  rotation: item.transform?.rotation_euler || [0, 0, 0],
                  scale: item.transform?.scale || [1, 1, 1]
                }))}
                frustumCulling={true}
                maxInstances={1000}
                fallbackColor="orange"
              />
            </Suspense>
          );
        })
      ) : (
        // Use individual rendering for unique objects
        categoryItems.map((item) => (
          <Suspense 
            key={`${sceneId || 'unknown'}-${categoryKey}-${item.id}`} 
            fallback={
              <mesh position={item.transform?.position || [0, 0, 0]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="blue" wireframe />
              </mesh>
            }
          >
            <SafeSceneItem
              item={item}
              categoryUrl={categoryUrl}
              categoryKey={categoryKey}
            />
          </Suspense>
        ))
      )}
    </group>
  );
}