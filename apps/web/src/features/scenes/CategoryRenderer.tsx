import { Suspense } from 'react';
import type { SceneManifestV2 } from '@lumea/shared';
import { SceneItem } from './SceneItem';
import { pickCategoryUrl } from './useSceneAssets';

interface CategoryRendererProps {
  categoryKey: string;
  category: SceneManifestV2['categories'][string];
  items: SceneManifestV2['items'];
}

export function CategoryRenderer({ categoryKey, category, items }: CategoryRendererProps) {
  const categoryUrl = pickCategoryUrl(category);
  
  // Filter items that belong to this category
  const categoryItems = items.filter(item => item.category === categoryKey);
  
  console.log(`🏗️ CategoryRenderer "${categoryKey}":`, {
    url: categoryUrl,
    itemCount: categoryItems.length,
    items: categoryItems.map(item => ({ id: item.id, model: item.model }))
  });
  
  if (categoryItems.length === 0) {
    console.log(`⚠️ No items found for category "${categoryKey}"`);
    return null;
  }
  
  return (
    <group name={`category-${categoryKey}`}>
      {categoryItems.map((item) => (
        <Suspense key={item.id} fallback={null}>
          <SceneItem
            item={item}
            categoryUrl={categoryUrl}
            categoryKey={categoryKey}
          />
        </Suspense>
      ))}
    </group>
  );
}