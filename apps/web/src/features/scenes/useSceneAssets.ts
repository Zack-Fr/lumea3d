import type { SceneItem, CategoryInfo } from '../../services/scenesApi';
import { log } from '../../utils/logger';

/**
 * Picks the best available URL for a category based on supported encodings
 * Priority: meshopt > draco > base GLB
 */
export function pickCategoryUrl(category: CategoryInfo): string {
  console.log('🎯 pickCategoryUrl called with category:', category);
  
  // Handle the actual data structure from your logs
  // Categories have an 'asset' property with the URLs
  const asset = (category as any).asset;
  if (asset) {
    console.log('🎯 Found asset in category:', asset);
    
    // Priority order: meshopt (preferred), draco (fallback), original
    let selectedUrl = null;
    
    if (category.meshopt && asset.meshoptUrl) {
      console.log('🎯 Selected Meshopt URL:', asset.meshoptUrl);
      selectedUrl = asset.meshoptUrl;
    } else if (category.draco && asset.dracoUrl) {
      console.log('🎯 Selected Draco URL:', asset.dracoUrl);
      selectedUrl = asset.dracoUrl;
    } else if (asset.originalUrl) {
      console.log('🎯 Selected original URL:', asset.originalUrl);
      selectedUrl = asset.originalUrl;
    }
    
    if (selectedUrl) {
      // Convert MinIO URLs to API proxy URLs to avoid 403 Forbidden issues
      if (selectedUrl.includes('localhost:9000') || selectedUrl.includes('minio')) {
        // Try to get asset ID from the category data
        const assetId = (category as any).assetId || asset.id;
        if (assetId) {
          // Determine variant type from URL
          let variant = 'original';
          if (selectedUrl.includes('meshopt') || selectedUrl.includes('optimized')) {
            variant = 'meshopt';
          } else if (selectedUrl.includes('draco')) {
            variant = 'draco';
          }
          
          const proxyUrl = `http://localhost:3001/storage/assets/${assetId}?variant=${variant}`;
          console.log('🔄 Converting MinIO URL to asset endpoint:', selectedUrl, '->', proxyUrl);
          return proxyUrl;
        } else {
          console.warn('⚠️ No asset ID found, cannot convert URL:', selectedUrl);
        }
      }
      return selectedUrl;
    }
  }
  
  // Fallback to old structure if available
  if (category.meshopt && category.encodings?.meshopt_url) {
    console.log('🎯 Using legacy Meshopt encoding');
    return category.encodings.meshopt_url;
  }
  
  if (category.draco && category.encodings?.draco_url) {
    console.log('🎯 Using legacy Draco encoding');
    return category.encodings.draco_url;
  }
  
  const fallbackUrl = category.glb_url || (category as any).url || '';
  console.log('🎯 Using fallback URL:', fallbackUrl);
  return fallbackUrl;
}

/**
 * Preloads assets for better performance with many items
 */
export function preloadCategoryAssets(categories: Record<string, CategoryInfo>) {
  Object.entries(categories).forEach(([key, category]) => {
    const url = pickCategoryUrl(category);
    log('info', `📦 Preloading category "${key}": ${url}`);
    // The actual preloading is handled by useGLTF.preload in GLBPreloader
  });
}

/**
 * Utility to get all unique model names from a category's items
 */
export function getCategoryModels(categoryKey: string, items: SceneItem[]): string[] {
  const categoryItems = items.filter(item => {
    const itemCategory = typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey || '';
    return itemCategory === categoryKey;
  });
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