import { Suspense, useMemo } from 'react';
import type { SceneItem, CategoryInfo } from '../../services/scenesApi';
import { useInstancedRenderer } from './InstancedRenderer';
import { pickCategoryUrl } from './useSceneAssets';
import { SafeInstancedObject } from './SafeInstancedObject';
import { SafeSceneItem } from './SafeSceneItem';
import { gpuMemoryMonitor } from '../../utils/gpuMemoryMonitor';

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
  
  // Filter items that belong to this category
  const categoryItems = items.filter(item => {
    const itemCategory = typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey || '';
    return itemCategory === categoryKey;
  });
  
  // Group items by model for instancing
  const itemGroups = useMemo(() => {
    const groups = new Map<string, typeof categoryItems>();
    
    categoryItems.forEach(item => {
      // Use empty string for items without model (they should use entire GLB scene)
      const model = item.model || '';
      
      if (!groups.has(model)) {
        groups.set(model, []);
      }
      groups.get(model)!.push(item);
    });
    
    return groups;
  }, [categoryItems]);

  // Determine which models should use instancing (more than 1 instance)
  const { instanceGroups } = useInstancedRenderer(categoryItems, categoryUrl);
  // Only use instancing if there are multiple instances of the same model
  const shouldUseInstancing = Array.from(instanceGroups.values()).some(group => group.length > 1);
  
  // CRITICAL FIX: Separate items into instanced vs individual rendering groups
  // This prevents the double-rendering that causes WebGL context loss
  const { instancedItems, individualItems } = useMemo(() => {
    const instanced: typeof categoryItems = [];
    const individual: typeof categoryItems = [];
    
    if (!shouldUseInstancing) {
      // If no instancing needed, render all items individually  
      individual.push(...categoryItems);
    } else {
      // If using instancing, separate items by whether their model appears multiple times
      categoryItems.forEach(item => {
        const model = item.model || '';
        const groupItems = instanceGroups.get(model);
        
        if (groupItems && groupItems.length > 1) {
          // This item belongs to a group that should be instanced
          instanced.push(item);
        } else {
          // This item is unique and should be rendered individually
          individual.push(item);
        }
      });
    }
    
    return { instancedItems: instanced, individualItems: individual };
  }, [categoryItems, instanceGroups, shouldUseInstancing]);
  
  console.log('🔍 DEBUG: Instancing decision:', {
    instanceGroups: Array.from(instanceGroups.entries()).map(([model, group]) => ({ model, count: group.length })),
    shouldUseInstancing,
    instancedItemCount: instancedItems.length,
    individualItemCount: individualItems.length
  });
  
  console.log(`🏢 CategoryRenderer "${categoryKey}" - FIXED DOUBLE RENDERING:`, {
    url: categoryUrl,
    totalItems: categoryItems.length,
    instancedItems: instancedItems.length,
    individualItems: individualItems.length,
    uniqueModels: itemGroups.size,
    instanceGroupsCount: instanceGroups.size,
    useInstancing: shouldUseInstancing,
    renderingStrategy: shouldUseInstancing ? 'MIXED (instanced + individual)' : 'INDIVIDUAL_ONLY'
  });
  
  if (categoryItems.length === 0) {
    console.log(`⚠️ No items found for category "${categoryKey}"`);
    return null;
  }
  
  return (
    <group name={`category-${categoryKey}`}>
      {/* INSTANCED RENDERING: Only for models with multiple instances */}
      {instancedItems.length > 0 && Array.from(instanceGroups.entries())
        .filter(([_, groupItems]) => groupItems.length > 1) // Only render groups with multiple instances
        .map(([model, groupItems], index) => {
          // Fix: Don't concatenate if categoryUrl is already a complete URL
          const glbUrl = categoryUrl.startsWith('http') ? categoryUrl : `${categoryUrl}${model}`;
          console.log(`🎯 CategoryRenderer - INSTANCED: categoryUrl: ${categoryUrl}, model: ${model}`);
          console.log(`🎯 Attempting to load instanced GLB: ${glbUrl}`);
          
          // Get smart loading recommendations from GPU memory monitor
          const modelComplexity = gpuMemoryMonitor.estimateModelComplexity(glbUrl);
          const recommendation = gpuMemoryMonitor.checkMemoryBeforeInstanceLoading(groupItems.length, modelComplexity);
          
          // Log recommendations and warnings
          if (recommendation.warnings.length > 0) {
            console.warn(`⚠️ CategoryRenderer GPU Recommendations for ${categoryKey}:`, {
              requested: groupItems.length,
              recommended: recommendation.maxSafeInstances,
              progressive: recommendation.useProgressive,
              batchSize: recommendation.recommendedBatchSize,
              warnings: recommendation.warnings,
              complexity: modelComplexity
            });
          }
          
          return (
            <Suspense 
              key={`instanced-${sceneId || 'unknown'}-${model}-${index}`} 
              fallback={
                <group>
                  {groupItems.map((item: any) => (
                    <mesh 
                      key={item.id} 
                      name={`instanced-fallback-${item.id}`}
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
              <SafeInstancedObject
                glbUrl={glbUrl}
                items={groupItems.map((item: any) => ({
                  id: item.id,
                  position: item.transform?.position || [0, 0, 0],
                  rotation: item.transform?.rotation_euler || [0, 0, 0],
                  scale: item.transform?.scale || [1, 1, 1]
                })).slice(0, recommendation.maxSafeInstances)} // Limit instances based on GPU capacity
                categoryKey={categoryKey}
                frustumCulling={true}
                maxInstances={recommendation.maxSafeInstances}
                fallbackColor="orange"
                progressive={recommendation.useProgressive}
                batchSize={recommendation.recommendedBatchSize}
              />
            </Suspense>
          );
        })
      }
      
      {/* INDIVIDUAL RENDERING: Only for unique models (no duplicates) */}
      {individualItems.map((item) => {
        console.log(`🎯 CategoryRenderer - INDIVIDUAL: rendering item ${item.id} with model ${item.model}`);
        return (
          <Suspense 
            key={`${sceneId || 'unknown'}-${categoryKey}-${item.id}`} 
            fallback={
              <mesh 
                name={`item-fallback-${item.id}`}
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
        );
      })}
    </group>
  );
}