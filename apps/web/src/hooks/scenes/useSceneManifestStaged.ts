import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { scenesApi, SceneApiError } from '../../services/scenesApi';
import { useAuth } from '../../providers/AuthProvider';
import { log } from '../../utils/logger';
import type { SceneManifestV2 } from '../../services/scenesApi';

export interface StagedManifestLoadingState {
  /** Current stage of loading */
  stage: 'discovering' | 'shell' | 'lighting' | 'furniture' | 'decorations' | 'complete' | 'error';
  /** Categories loaded so far */
  loadedCategories: string[];
  /** Total categories available */
  availableCategories: string[];
  /** Loading progress (0-1) */
  progress: number;
  /** Current manifest data (incremental) */
  manifest: SceneManifestV2 | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Performance metrics */
  metrics: {
    stageTimings: Record<string, number>;
    totalLoadTime: number;
    categoryCount: number;
    itemCount: number;
  };
}

export interface UseSceneManifestStagedOptions {
  /** Enable the hook */
  enabled?: boolean;
  /** Categories to prioritize in first stage (shell+lighting by default) */
  priorityCategories?: string[];
  /** Categories to load in second stage */
  secondaryCategories?: string[];
  /** Whether to include metadata in requests */
  includeMetadata?: boolean;
  /** Callback when each stage completes */
  onStageComplete?: (stage: string, manifest: SceneManifestV2) => void;
  /** Callback when loading completes */
  onComplete?: (manifest: SceneManifestV2) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom query key suffix for cache separation */
  querySuffix?: string;
}

/**
 * Hook for staged scene manifest loading with performance optimizations.
 * 
 * Loading Strategy:
 * 1. Discovery: Get available categories
 * 2. Shell: Load shell/environment (essential for initial render)
 * 3. Lighting: Load lighting elements (important for scene appearance)
 * 4. Furniture: Load furniture and major objects
 * 5. Decorations: Load decorative elements and minor objects
 * 
 * This approach ensures fast initial scene render with progressive enhancement.
 */
export function useSceneManifestStaged(
  sceneId: string, 
  options: UseSceneManifestStagedOptions = {}
) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const {
    enabled = true,
    priorityCategories = ['shell', 'lighting', 'environment'],
    secondaryCategories = ['furniture', 'seating', 'tables'],
    includeMetadata = false,
    onStageComplete,
    onComplete,
    onError,
    querySuffix = ''
  } = options;

  const [state, setState] = useState<StagedManifestLoadingState>({
    stage: 'discovering',
    loadedCategories: [],
    availableCategories: [],
    progress: 0,
    manifest: null,
    isLoading: false,
    error: null,
    metrics: {
      stageTimings: {},
      totalLoadTime: 0,
      categoryCount: 0,
      itemCount: 0
    }
  });

  const [startTime, setStartTime] = useState<number>(0);

  // Discover available categories
  const { data: categoriesData, error: categoriesError } = useQuery({
    queryKey: ['scene-categories', sceneId, querySuffix].filter(Boolean),
    queryFn: async () => {
      if (!token) throw new SceneApiError(401, 'Authentication required');
      
      try {
        const response = await scenesApi.getCategories(sceneId);
        // Backend returns array directly, but API client expects { categories: [...] }
        // Handle both formats for compatibility
        const result = Array.isArray(response) ? response : (response?.categories || []);
        log('debug', 'Categories loaded successfully', Array.isArray(result) ? result.length : 0);
        return result;
      } catch (error) {
        log('error', 'Failed to load categories', error);
        throw error;
      }
    },
    enabled: !!sceneId && !!token && enabled,
    staleTime: 300000, // 5 minutes - categories don't change often
    retry: (failureCount, error: unknown) => {
      if (error instanceof SceneApiError && [401, 403].includes(error.statusCode)) {
        log('warn', 'Auth error in categories query, not retrying', error);
        return false;
      }
      return failureCount < 3;
    },
  });

  // Load manifest for specific categories
  const loadManifestStage = useCallback(async (categories: string[], stageName: string) => {
    if (!token || !sceneId) return null;

    try {
      const stageStartTime = Date.now();

      log('info', `🚀 StagedManifest: Loading ${stageName} stage with categories: ${Array.isArray(categories) ? categories.join(',') : ''}`);

      const manifest = await scenesApi.getManifest(sceneId, {
        categories: Array.isArray(categories) && categories.length > 0 ? categories : undefined,
        includeMetadata
      });

      const stageTime = Date.now() - stageStartTime;

      setState(prev => ({
        ...prev,
        manifest,
        loadedCategories: [...new Set([...(Array.isArray(prev.loadedCategories) ? prev.loadedCategories : []), ...(Array.isArray(categories) ? categories : [])])],
        metrics: {
          ...prev.metrics,
          stageTimings: {
            ...prev.metrics.stageTimings,
            [stageName]: stageTime
          },
          itemCount: Array.isArray(manifest?.items) ? manifest.items.length : prev.metrics.itemCount,
          categoryCount: manifest && manifest.categories ? Object.keys(manifest.categories).length : prev.metrics.categoryCount
        }
      }));

      log('info', `✅ StagedManifest: ${stageName} stage completed in ${stageTime}ms`);
      onStageComplete?.(stageName, manifest);

      return manifest;
    } catch (error) {
      log('error', `❌ StagedManifest: Failed to load ${stageName} stage: ${String(error)}`);
      throw error;
    }
  }, [token, sceneId, includeMetadata, onStageComplete]);

  // Stage progression effect
  useEffect(() => {
    if (!enabled || !sceneId || !token) return;

    async function progressStages() {
      try {
        setStartTime(Date.now());
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Stage 1: Discovery completed via useQuery
        if (categoriesError) {
          const errorMessage = categoriesError instanceof Error 
            ? categoriesError.message 
            : 'Failed to discover categories';
          throw new Error(errorMessage);
        }

        if (!categoriesData || state.stage !== 'discovering') return;

        const availableCategories = Array.isArray(categoriesData) 
          ? categoriesData.map((cat: any) => cat?.categoryKey || cat?.key || cat?.name || String(cat)).filter(Boolean)
          : [];

        setState(prev => ({
          ...prev,
          stage: 'shell',
          availableCategories,
          progress: 0.1
        }));

        // Stage 2: Shell + Environment (highest priority)
        const shellCategories = availableCategories.filter(cat => 
          priorityCategories.some(priority => 
            cat.toLowerCase().includes(priority.toLowerCase())
          )
        );

        await loadManifestStage(shellCategories, 'shell');
        setState(prev => ({ ...prev, stage: 'lighting', progress: 0.3 }));

        // Stage 3: Lighting (important for appearance)
        const lightingCategories = availableCategories.filter(cat =>
          cat.toLowerCase().includes('light') || 
          cat.toLowerCase().includes('lamp') ||
          cat.toLowerCase().includes('illumination')
        );

        if (lightingCategories.length > 0) {
          await loadManifestStage(lightingCategories, 'lighting');
        }
        setState(prev => ({ ...prev, stage: 'furniture', progress: 0.6 }));

        // Stage 4: Furniture (secondary priority)
        const furnitureCategories = availableCategories.filter(cat =>
          secondaryCategories.some(secondary => 
            cat.toLowerCase().includes(secondary.toLowerCase())
          )
        );

        if (furnitureCategories.length > 0) {
          await loadManifestStage(furnitureCategories, 'furniture');
        }
        setState(prev => ({ ...prev, stage: 'decorations', progress: 0.8 }));

        // Stage 5: Everything else (decorations, miscellaneous)
        const remainingCategories = availableCategories.filter(cat =>
          !shellCategories.includes(cat) &&
          !lightingCategories.includes(cat) &&
          !furnitureCategories.includes(cat)
        );

        if (remainingCategories.length > 0) {
          await loadManifestStage(remainingCategories, 'decorations');
        }

        // Stage 6: Final - load complete manifest
        const finalManifest = await loadManifestStage([], 'complete');
        
        const totalTime = Date.now() - startTime;
        setState(prev => ({
          ...prev,
          stage: 'complete',
          progress: 1,
          isLoading: false,
          metrics: {
            ...prev.metrics,
            totalLoadTime: totalTime
          }
        }));
        log('info', `🎉 StagedManifest: Complete! Total time: ${totalTime}ms`);
        
        if (finalManifest) {
          onComplete?.(finalManifest);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log('error', '❌ StagedManifest: Loading failed:', error as any);
        
        setState(prev => ({
          ...prev,
          stage: 'error',
          isLoading: false,
          error: errorMessage
        }));

        onError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    }

    if (categoriesData && state.stage === 'discovering') {
      progressStages();
    }
  }, [
    enabled, 
    sceneId, 
    token, 
    categoriesData, 
    categoriesError, 
    state.stage,
    loadManifestStage, 
    startTime
  ]);

  // Refresh function to restart the staged loading
  const refresh = useCallback(() => {
    // Invalidate the categories query to force a fresh fetch
    queryClient.invalidateQueries({
      queryKey: ['scene-categories', sceneId, querySuffix].filter(Boolean)
    });
    
    setState({
      stage: 'discovering',
      loadedCategories: [],
      availableCategories: [],
      progress: 0,
      manifest: null,
      isLoading: false,
      error: null,
      metrics: {
        stageTimings: {},
        totalLoadTime: 0,
        categoryCount: 0,
        itemCount: 0
      }
    });
  }, [queryClient, sceneId, querySuffix]);

  return {
    ...state,
    refresh
  };
}