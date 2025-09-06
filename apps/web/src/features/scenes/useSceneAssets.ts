import type { SceneItem, CategoryInfo } from '../../services/scenesApi';

/**
 * Picks the best available URL for a category based on supported encodings
 * Priority: meshopt > draco > base GLB
 */
export function pickCategoryUrl(category: CategoryInfo): string {
  // Priority order: meshopt (preferred), draco (fallback), base GLB
  if (category.meshopt && category.encodings?.meshopt_url) {
    console.log('🎯 Using Meshopt encoding for category');
    return category.encodings.meshopt_url;
  }
  
  if (category.draco && category.encodings?.draco_url) {
    console.log('🎯 Using Draco encoding for category');
    return category.encodings.draco_url;
  }
  
  console.log('🎯 Using base GLB for category');
  return category.glb_url || '';
}

/**
 * Preloads assets for better performance with many items
 */
export function preloadCategoryAssets(categories: Record<string, CategoryInfo>) {
  Object.entries(categories).forEach(([key, category]) => {
    const url = pickCategoryUrl(category);
    console.log(`📦 Preloading category "${key}": ${url}`);
    // The actual preloading is handled by useGLTF.preload in GLBPreloader
  });
}

/**
 * Utility to get all unique model names from a category's items
 */
export function getCategoryModels(categoryKey: string, items: SceneItem[]): string[] {
  const categoryItems = items.filter(item => item.category === categoryKey);
  const modelNames = [...new Set(categoryItems.map(item => item.model).filter(Boolean))];
  return modelNames as string[];
}

/**
 * Performance utility: Group items by model for potential instancing
 */
export function groupItemsByModel(items: SceneItem[]): Record<string, SceneItem[]> {
  return items.reduce((groups, item) => {
    const modelKey = item.model || 'fallback';
    if (!groups[modelKey]) {
      groups[modelKey] = [];
    }
    groups[modelKey].push(item);
    return groups;
  }, {} as Record<string, SceneItem[]>);
}