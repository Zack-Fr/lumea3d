import { useEffect, useState, useCallback, useMemo } from 'react';
import { once as logOnce, log } from '../../utils/logger';
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
  // Compute categories safely and memoize to keep stable reference across renders
  const categories = useMemo(() => {
    if (!manifest || !manifest.categories) return [] as [string, any][];
    return Object.entries(manifest.categories) as [string, any][];
  }, [manifest]);
  
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
  log('debug', `GLBPreloader: Preloading "${categoryKey}": ${url}`);
      
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
  logOnce(`glb:stage-start:${stageName}`, 'info', `🚀 GLBPreloader: Starting ${stageName} stage with ${categoriesToLoad.length} categories`);
    
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
  logOnce(`glb:stage-complete:${stageName}`, 'info', `✅ GLBPreloader: ${stageName} stage completed in ${stageTime}ms`);
    
    onStageComplete?.(stageName, loadedInStage);
    return loadedInStage;
  }, [preloadCategory, loadDelay, onStageComplete]);

  useEffect(() => {
    if (!progressive) {
      // Simple non-progressive preloading
  logOnce('glb:simple-preload', 'info', '🚀 GLBPreloader: Starting simple preload of category GLBs');
      
      categories.forEach(([categoryKey, category]) => {
        const url = pickCategoryUrl(category);
  log('debug', `📦 Preloading category "${categoryKey}": ${url}`);
        useGLTF.preload(url);
      });
      
  logOnce('glb:initiated-preload', 'info', `✅ GLBPreloader: Initiated preload for ${categories.length} categories`);
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

  logOnce('glb:progressive-complete', 'info', '🎉 GLBPreloader: Progressive preloading complete!');

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  log('error', '❌ GLBPreloader: Progressive preloading failed:', error);
        
        setPreloadState(prev => ({
          ...prev,
          stage: 'error',
          isLoading: false,
          error: errorMessage
        }));
      }
    }

    progressivePreload();
  // Keep dependency array stable: categories is memoized, priorityCategories is expected to be stable (caller literal), preloadCategoriesWithDelay is memoized
  }, [categories, progressive, priorityCategories, preloadCategoriesWithDelay]);
  
  // Expose preloading state for debugging/monitoring
  useEffect(() => {
    if (progressive) {
      log('debug', 'GLBPreloader State', preloadState);
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
  if (!manifest) {
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

  try {
    // Safely access manifest properties with fallbacks
    const categories = manifest.categories ? Object.entries(manifest.categories) : [];
    const items = Array.isArray(manifest.items) ? manifest.items : [];
    const totalItems = items.length;
    
    const categoryStats = categories.map(([key, category]) => ({
      key,
      url: pickCategoryUrl(category),
      itemCount: Array.isArray(items) ? items.filter(item => {
        if (!item) return false;
        const itemCategory = typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey || '';
        return itemCategory === key;
      }).length : 0,
      instancingEnabled: category?.instancing || false,
      loadTime: loadingMetrics?.categoryLoadTimes?.[key] || 0
    }));
    
    const metrics = {
      totalCategories: categories.length,
      totalItems,
      categoryStats,
      instancingCategories: Array.isArray(categoryStats) ? categoryStats.filter(cat => cat?.instancingEnabled).length : 0,
      largestCategory: Array.isArray(categoryStats) && categoryStats.length > 0 ? 
        categoryStats.reduce((max, cat) => 
          (cat?.itemCount || 0) > (max?.itemCount || 0) ? cat : max, 
          { itemCount: 0, key: 'none' }
        ) : { itemCount: 0, key: 'none' },
      performance: {
        stageTimings: loadingMetrics?.stageTimings || {},
        totalLoadTime: loadingMetrics?.totalLoadTime || 0,
        categoryLoadTimes: loadingMetrics?.categoryLoadTimes || {},
        averageLoadTimePerCategory: loadingMetrics?.totalLoadTime && categories.length > 0
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
      if (manifest) {
        log('debug', 'Enhanced Scene Metrics', {
          categories: metrics.totalCategories,
          items: metrics.totalItems,
          instancing: metrics.instancingCategories,
          performance: metrics.performance
        });
        
        // Log performance warnings
        if (metrics.performance.totalLoadTime > 5000) {
          log('warn', '⚠️ Slow loading detected:', metrics.performance.totalLoadTime + 'ms');
        }
        
        if (metrics.performance.slowestCategory.loadTime > 1000) {
          log('warn', '⚠️ Slow category detected:', 
            metrics.performance.slowestCategory.key, 
            metrics.performance.slowestCategory.loadTime + 'ms'
          );
        }
      }
    }, [manifest, totalItems, loadingMetrics]);
    
    return metrics;
  } catch (error) {
    log('error', 'useSceneMetrics: Error calculating metrics', error);
    // Return safe fallback on any error
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