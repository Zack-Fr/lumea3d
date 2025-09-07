import { useEffect, useState, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import type { SceneManifestV2 } from '../../services/scenesApi';
import { pickCategoryUrl } from './useSceneAssets';

interface GLBPreloaderProps {
  manifest: SceneManifestV2 | null | undefined;
  /** Enable progressive loading (load priority categories first) */
  progressive?: boolean;
  /** Priority categories to load first */
  priorityCategories?: string[];
  /** Delay between preloading each category (ms) */
  loadDelay?: number;
  /** Callback when preloading stage completes */
  onStageComplete?: (stage: string, categoriesLoaded: string[]) => void;
}

export interface PreloadingState {
  stage: 'priority' | 'secondary' | 'complete' | 'error';
  loadedCategories: string[];
  totalCategories: number;
  progress: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Enhanced preloader that supports progressive loading for better perceived performance.
 * 
 * Progressive Loading Strategy:
 * 1. Priority: Load essential categories (shell, lighting, environment) first
 * 2. Secondary: Load remaining categories with small delays to prevent blocking
 * 
 * This ensures fast initial scene render while background-loading other assets.
 */
export function GLBPreloader({ 
  manifest, 
  progressive = true,
  priorityCategories = ['shell', 'lighting', 'environment'],
  loadDelay = 100,
  onStageComplete
}: GLBPreloaderProps) {
  // Handle undefined/null manifest gracefully
  if (!manifest || !manifest.categories) {
    console.warn('⚠️ GLBPreloader: No manifest provided, skipping preload');
    return null;
  }

  const categories = Object.entries(manifest.categories);
  
  const [preloadState, setPreloadState] = useState<PreloadingState>({
    stage: 'priority',
    loadedCategories: [],
    totalCategories: categories.length,
    progress: 0,
    isLoading: false,
    error: null
  });

  const preloadCategory = useCallback(async (categoryKey: string, category: any) => {
    try {
      const url = pickCategoryUrl(category);
      console.log(`📦 GLBPreloader: Preloading "${categoryKey}": ${url}`);
      
      // Use await to ensure the preload completes before moving to next
      await new Promise<void>((resolve) => {
        useGLTF.preload(url);
        // Small delay to prevent overwhelming the GPU
        setTimeout(resolve, 50);
      });
      
      return true;
    } catch (error) {
      console.error(`❌ GLBPreloader: Failed to preload "${categoryKey}":`, error);
      return false;
    }
  }, []);

  const preloadCategoriesWithDelay = useCallback(async (
    categoriesToLoad: [string, any][],
    stageName: string
  ) => {
    console.log(`🚀 GLBPreloader: Starting ${stageName} stage with ${categoriesToLoad.length} categories`);
    
    const startTime = Date.now();
    const loadedInStage: string[] = [];
    
    for (let i = 0; i < categoriesToLoad.length; i++) {
      const [categoryKey, category] = categoriesToLoad[i];
      
      const success = await preloadCategory(categoryKey, category);
      if (success) {
        loadedInStage.push(categoryKey);
        
        setPreloadState(prev => {
          const newLoadedCategories = [...prev.loadedCategories, categoryKey];
          const progress = newLoadedCategories.length / prev.totalCategories;
          
          return {
            ...prev,
            loadedCategories: newLoadedCategories,
            progress
          };
        });
      }
      
      // Add delay between categories to prevent blocking
      if (i < categoriesToLoad.length - 1 && loadDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, loadDelay));
      }
    }
    
    const stageTime = Date.now() - startTime;
    console.log(`✅ GLBPreloader: ${stageName} stage completed in ${stageTime}ms`);
    
    onStageComplete?.(stageName, loadedInStage);
    return loadedInStage;
  }, [preloadCategory, loadDelay, onStageComplete]);

  useEffect(() => {
    if (!progressive) {
      // Simple non-progressive preloading
      console.log('🚀 GLBPreloader: Starting simple preload of category GLBs');
      
      categories.forEach(([categoryKey, category]) => {
        const url = pickCategoryUrl(category);
        console.log(`📦 Preloading category "${categoryKey}": ${url}`);
        useGLTF.preload(url);
      });
      
      console.log(`✅ GLBPreloader: Initiated preload for ${categories.length} categories`);
      return;
    }

    // Progressive preloading
    async function progressivePreload() {
      try {
        setPreloadState(prev => ({ ...prev, isLoading: true, error: null }));

        // Stage 1: Priority categories (shell, lighting, environment)
        const priorityEntries = categories.filter(([categoryKey]) =>
          priorityCategories.some(priority => 
            categoryKey.toLowerCase().includes(priority.toLowerCase())
          )
        );

        if (priorityEntries.length > 0) {
          await preloadCategoriesWithDelay(priorityEntries, 'priority');
          setPreloadState(prev => ({ ...prev, stage: 'secondary' }));
        }

        // Stage 2: Secondary categories (everything else)
        const secondaryEntries = categories.filter(([categoryKey]) =>
          !priorityCategories.some(priority => 
            categoryKey.toLowerCase().includes(priority.toLowerCase())
          )
        );

        if (secondaryEntries.length > 0) {
          await preloadCategoriesWithDelay(secondaryEntries, 'secondary');
        }

        // Complete
        setPreloadState(prev => ({
          ...prev,
          stage: 'complete',
          isLoading: false,
          progress: 1
        }));

        console.log('🎉 GLBPreloader: Progressive preloading complete!');

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ GLBPreloader: Progressive preloading failed:', error);
        
        setPreloadState(prev => ({
          ...prev,
          stage: 'error',
          isLoading: false,
          error: errorMessage
        }));
      }
    }

    progressivePreload();
  }, [categories, progressive, priorityCategories, preloadCategoriesWithDelay]);
  
  // Expose preloading state for debugging/monitoring
  useEffect(() => {
    if (progressive) {
      console.log('📊 GLBPreloader State:', preloadState);
    }
  }, [preloadState, progressive]);
  
  return null; // This component doesn't render anything
}

/**
 * Enhanced performance metrics for tracking scene complexity and loading performance
 */
export function useSceneMetrics(manifest: SceneManifestV2 | null | undefined, loadingMetrics?: {
  stageTimings?: Record<string, number>;
  totalLoadTime?: number;
  categoryLoadTimes?: Record<string, number>;
}) {
  // Handle undefined/null manifest gracefully
  if (!manifest || !manifest.categories || !manifest.items) {
    return {
      totalCategories: 0,
      totalItems: 0,
      categoryStats: [],
      instancingCategories: 0,
      largestCategory: { itemCount: 0, key: 'none' },
      performance: {
        stageTimings: {},
        totalLoadTime: 0,
        categoryLoadTimes: {},
        averageLoadTimePerCategory: 0,
        slowestCategory: { loadTime: 0, key: 'none' },
        performanceScore: 'poor' as const
      }
    };
  }

  const categories = Object.entries(manifest.categories);
  const totalItems = manifest.items.length;
  
  const categoryStats = categories.map(([key, category]) => ({
    key,
    url: pickCategoryUrl(category),
    itemCount: manifest.items.filter(item => item.category === key).length,
    instancingEnabled: category.instancing,
    loadTime: loadingMetrics?.categoryLoadTimes?.[key] || 0
  }));
  
  const metrics = {
    totalCategories: categories.length,
    totalItems,
    categoryStats,
    instancingCategories: categoryStats.filter(cat => cat.instancingEnabled).length,
    largestCategory: categoryStats.reduce((max, cat) => 
      cat.itemCount > max.itemCount ? cat : max, 
      { itemCount: 0, key: 'none' }
    ),
    performance: {
      stageTimings: loadingMetrics?.stageTimings || {},
      totalLoadTime: loadingMetrics?.totalLoadTime || 0,
      categoryLoadTimes: loadingMetrics?.categoryLoadTimes || {},
      averageLoadTimePerCategory: loadingMetrics?.totalLoadTime 
        ? loadingMetrics.totalLoadTime / categories.length 
        : 0,
      slowestCategory: categoryStats.reduce((slowest, cat) => 
        cat.loadTime > slowest.loadTime ? cat : slowest, 
        { loadTime: 0, key: 'none' }
      ),
      performanceScore: calculatePerformanceScore(categoryStats, loadingMetrics?.totalLoadTime || 0)
    }
  };
  
  useEffect(() => {
    console.log('📊 Enhanced Scene Metrics:', {
      categories: metrics.totalCategories,
      items: metrics.totalItems,
      instancing: metrics.instancingCategories,
      performance: metrics.performance
    });
    
    // Log performance warnings
    if (metrics.performance.totalLoadTime > 5000) {
      console.warn('⚠️ Slow loading detected:', metrics.performance.totalLoadTime + 'ms');
    }
    
    if (metrics.performance.slowestCategory.loadTime > 1000) {
      console.warn('⚠️ Slow category detected:', 
        metrics.performance.slowestCategory.key, 
        metrics.performance.slowestCategory.loadTime + 'ms'
      );
    }
  }, [totalItems, loadingMetrics]);
  
  return metrics;
}

/**
 * Calculate a performance score based on loading times and scene complexity
 */
function calculatePerformanceScore(
  categoryStats: any[], 
  totalLoadTime: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  const avgLoadTime = totalLoadTime / Math.max(categoryStats.length, 1);
  
  if (avgLoadTime < 100) return 'excellent';
  if (avgLoadTime < 300) return 'good';
  if (avgLoadTime < 800) return 'fair';
  return 'poor';
}