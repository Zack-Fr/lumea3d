import { Suspense, useMemo } from 'react';
import type { SceneItem, CategoryInfo } from '../../services/scenesApi';
import { SceneItem as SceneItemComponent } from './SceneItem';
import { InstancedObject, useInstancedRenderer } from './InstancedRenderer';
import { pickCategoryUrl } from './useSceneAssets';

interface CategoryRendererProps {
  categoryKey: string;
  category: CategoryInfo;
  items: SceneItem[];
  sceneId?: string;
}

export function CategoryRenderer({ categoryKey, category, items, sceneId }: CategoryRendererProps) {
  const categoryUrl = pickCategoryUrl(category);
  
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
        Array.from(instanceGroups.entries()).map(([model, groupItems], index) => (
          <Suspense key={`instanced-${sceneId || 'unknown'}-${model}-${index}`} fallback={null}>
            <InstancedObject
              glbUrl={`${categoryUrl}${model}`}
              items={groupItems.map((item: any) => ({
                id: item.id,
                position: item.transform.position,
                rotation: item.transform.rotation_euler,
                scale: item.transform.scale
              }))}
              frustumCulling={true}
              maxInstances={1000}
            />
          </Suspense>
        ))
      ) : (
        // Use individual rendering for unique objects
        categoryItems.map((item) => (
          <Suspense key={`${sceneId || 'unknown'}-${categoryKey}-${item.id}`} fallback={null}>
            <SceneItemComponent
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