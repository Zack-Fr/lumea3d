import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import type { SceneManifestV2 } from '../../services/scenesApi';
import { pickCategoryUrl } from './useSceneAssets';

interface GLBPreloaderProps {
  manifest: SceneManifestV2;
}

/**
 * Preloads all category GLBs for better performance when loading many items
 * This component doesn't render anything but triggers GLB preloading
 */
export function GLBPreloader({ manifest }: GLBPreloaderProps) {
  const categories = Object.entries(manifest.categories);
  
  useEffect(() => {
    console.log('🚀 GLBPreloader: Starting preload of category GLBs');
    
    // Preload all category GLBs
    categories.forEach(([categoryKey, category]) => {
      const url = pickCategoryUrl(category);
      console.log(`📦 Preloading category "${categoryKey}": ${url}`);
      useGLTF.preload(url);
    });
    
    console.log(`✅ GLBPreloader: Initiated preload for ${categories.length} categories`);
  }, [categories]);
  
  return null; // This component doesn't render anything
}

/**
 * Performance metrics for tracking scene complexity
 */
export function useSceneMetrics(manifest: SceneManifestV2) {
  const categories = Object.entries(manifest.categories);
  const totalItems = manifest.items.length;
  
  const categoryStats = categories.map(([key, category]) => ({
    key,
    url: pickCategoryUrl(category),
    itemCount: manifest.items.filter(item => item.category === key).length,
    instancingEnabled: category.instancing
  }));
  
  const metrics = {
    totalCategories: categories.length,
    totalItems,
    categoryStats,
    instancingCategories: categoryStats.filter(cat => cat.instancingEnabled).length,
    largestCategory: categoryStats.reduce((max, cat) => 
      cat.itemCount > max.itemCount ? cat : max, 
      { itemCount: 0, key: 'none' }
    )
  };
  
  useEffect(() => {
    console.log('📊 Scene Metrics:', metrics);
  }, [totalItems]);
  
  return metrics;
}