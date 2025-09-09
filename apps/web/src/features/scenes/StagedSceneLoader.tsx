import React, { useState, useCallback } from 'react';
import { useSceneManifestStaged } from '../../hooks/scenes/useSceneManifestStaged';
import { useSceneCategories } from '../../hooks/scenes/useSceneQuery';
import { GLBPreloader, useSceneMetrics } from './GLBPreloader';
import type { SceneManifestV2 } from '../../services/scenesApi';
import { log } from '../../utils/logger';

interface StagedSceneLoaderProps {
  projectId: string;
  sceneId: string;
  onManifestLoaded?: (manifest: SceneManifestV2) => void;
  onLoadingStateChange?: (isLoading: boolean) => void;
}

/**
 * Demo component showcasing staged manifest loading with performance optimizations.
 * 
 * This component demonstrates:
 * 1. Progressive category discovery
 * 2. Staged manifest loading (shell+lighting first, then furniture, then decorations)
 * 3. Progressive asset preloading with performance monitoring
 * 4. Real-time loading metrics and progress tracking
 */
export const StagedSceneLoader = React.memo(function StagedSceneLoader({ 
  projectId,
  sceneId, 
  onManifestLoaded, 
  onLoadingStateChange 
}: StagedSceneLoaderProps) {
  // ALL HOOKS MUST BE CALLED FIRST - NO CONDITIONAL LOGIC BEFORE HOOKS
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);

  // Always call hooks - we'll handle validation in the enabled options
  const isValidInput = !!(projectId && typeof projectId === 'string' && sceneId && typeof sceneId === 'string' && sceneId.trim().length > 0);

  const categoriesResult = useSceneCategories(sceneId || '', { 
    enabled: isValidInput && !!sceneId,
    querySuffix: 'staged-loader'
  });
  const categoriesData = Array.isArray(categoriesResult.data) ? categoriesResult.data : [];
  const categoriesLoading = categoriesResult.isLoading;
  const categoriesError = categoriesResult.error;

  // Use staged manifest loading - always call hook
  const stagedManifestResult = useSceneManifestStaged(sceneId || '', {
    enabled: isValidInput && !!sceneId,
    priorityCategories: ['shell', 'lighting', 'environment'],
    secondaryCategories: ['furniture', 'seating', 'tables', 'storage'],
    includeMetadata: true,
    querySuffix: 'staged-loader',
    onStageComplete: (stageName, categories) => {
      log('info', `🎯 Stage "${stageName}" completed: ${Array.isArray(categories) ? categories.map((c:any)=>c.categoryKey||c.key||c).join(',') : ''}`);
    },
    onComplete: (finalManifest) => {
      log('info', '🎉 All stages completed!');
      onManifestLoaded?.(finalManifest);
    },
    onError: (error) => {
      log('error', '❌ Staged loading failed:', String(error));
    }
  });

  // Extract data from staged manifest result with safe defaults
  const stagedResult = stagedManifestResult || {};
  const {
    stage = 'error',
    loadedCategories = [],
    availableCategories: discoveredCategories = [],
    progress = 0,
    manifest = null,
    isLoading = false,
    error = null,
    metrics = { stageTimings: {}, totalLoadTime: 0, categoryCount: 0, itemCount: 0 },
    refresh = () => {}
  } = stagedResult;

  // Get performance metrics - ALWAYS call hook at top level with safe inputs
  const safeMetrics = {
    stageTimings: metrics?.stageTimings || {},
    totalLoadTime: metrics?.totalLoadTime || 0,
    categoryCount: metrics?.categoryCount || 0,
    itemCount: metrics?.itemCount || 0
  };

  // Ensure manifest is properly structured for the hook
  const safeManifest = manifest && typeof manifest === 'object' && manifest.generatedAt ? manifest : {
    scene: { id: '', name: '', description: '', version: 1 },
    items: [],
    categories: {},
    generatedAt: new Date().toISOString()
  };

  const sceneMetrics = useSceneMetrics(safeManifest, safeMetrics) || {
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

  // NOW we can do validation and early returns AFTER all hooks
  if (!isValidInput || !sceneId) {
    log('error', 'StagedSceneLoader: Invalid projectId or sceneId provided', { projectId, sceneId });
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Configuration Error
          </h2>
          <p className="text-red-600">
            Invalid project ID or scene ID provided. Please ensure valid project and scene IDs are passed to the component.
          </p>
          <p className="text-sm text-red-500 mt-2">
            Project ID: {projectId || 'missing'}<br/>
            Scene ID: {sceneId || 'missing/null'}
          </p>
        </div>
      </div>
    );
  }

  // Handle loading state changes
  React.useEffect(() => {
    const currentLoading = Boolean(isLoading) || Boolean(categoriesLoading);
    if (onLoadingStateChange) {
      onLoadingStateChange(currentLoading);
    }
  }, [isLoading, categoriesLoading, onLoadingStateChange]);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const getStageDescription = (currentStage: string) => {
    switch (currentStage) {
      case 'discovering': return 'Discovering available categories...';
      case 'shell': return 'Loading shell and environment...';
      case 'lighting': return 'Loading lighting elements...';
      case 'furniture': return 'Loading furniture and major objects...';
      case 'decorations': return 'Loading decorative elements...';
      case 'complete': return 'Loading complete!';
      case 'error': return 'Loading failed';
      default: return 'Initializing...';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress < 0.3) return '#ef4444'; // red
    if (progress < 0.7) return '#f59e0b'; // amber
    return '#10b981'; // green
  };

  const getPerformanceColor = (score: string) => {
    switch (score) {
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'fair': return '#f59e0b';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (categoriesError || error) {
    const errorMessage = categoriesError instanceof Error ? categoriesError.message : String(categoriesError || error || '');
    const isAuthError = errorMessage.includes('401') || 
                       errorMessage.includes('Authentication') ||
                       errorMessage.includes('Unauthorized') ||
                       errorMessage.includes('required');
    
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            {isAuthError ? 'Authentication Required' : 'Loading Error'}
          </h2>
          <p className="text-red-600 mb-4">
            {isAuthError 
              ? 'Please log in to view scene data. Your session may have expired.' 
              : errorMessage || 'Failed to load scene data'
            }
          </p>
          <div className="flex gap-2">
            {isAuthError ? (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
            ) : (
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry Loading
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Staged Scene Loader Demo
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            {showAdvancedMetrics ? 'Hide' : 'Show'} Advanced Metrics
          </button>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Loading Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900">Loading Progress</h2>
          <span className="text-sm text-gray-500">
            {Math.round(progress * 100)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${progress * 100}%`,
              backgroundColor: getProgressColor(progress)
            }}
          />
        </div>
        
        <p className="text-sm text-gray-600">{getStageDescription(stage)}</p>
        
        {stage !== 'complete' && stage !== 'error' && (
          <div className="mt-2 text-xs text-gray-500">
            Stage: {stage} | Categories loaded: {Array.isArray(loadedCategories) ? loadedCategories.length : 0}/{Array.isArray(discoveredCategories) ? discoveredCategories.length : 0}
          </div>
        )}
      </div>

      {/* Categories Overview */}
      {categoriesData && Array.isArray(categoriesData) && categoriesData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Available Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {categoriesData.map((category: any) => {
              const key = category?.categoryKey || category?.key || String(category);
              const isLoaded = Array.isArray(loadedCategories) ? loadedCategories.includes(key) : false;
              return (
                <div
                  key={`${sceneId}-${key}`}
                  className={`p-2 rounded border text-sm ${
                    isLoaded 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="font-medium">{key}</div>
                  <div className="text-xs opacity-75">
                    {category?.itemCount || 0} items
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {safeManifest && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Scene Performance</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{sceneMetrics?.totalCategories ?? 0}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{sceneMetrics?.totalItems ?? 0}</div>
              <div className="text-sm text-gray-600">Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics?.totalLoadTime ?? 0}ms</div>
              <div className="text-sm text-gray-600">Load Time</div>
            </div>
            <div className="text-center">
              <div 
                className="text-2xl font-bold"
                style={{ color: getPerformanceColor(sceneMetrics?.performance?.performanceScore ?? 'unknown') }}
              >
                {sceneMetrics?.performance?.performanceScore ?? 'unknown'}
              </div>
              <div className="text-sm text-gray-600">Performance</div>
            </div>
          </div>

          {showAdvancedMetrics && (
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Stage Timings</h3>
                <div className="space-y-1">
                  {Object.entries(metrics?.stageTimings ?? {}).map(([stage, time]) => (
                    <div key={stage} className="flex justify-between text-sm">
                      <span className="capitalize">{stage}:</span>
                      <span className="font-mono">{time}ms</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Category Performance</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {Array.isArray(sceneMetrics?.categoryStats) && sceneMetrics.categoryStats.length > 0 ? (
                    sceneMetrics.categoryStats
                      .slice()
                      .sort((a, b) => (b?.loadTime || 0) - (a?.loadTime || 0))
                      .map((cat) => (
                        <div key={`${sceneId}-${cat?.key || 'unknown'}`} className="flex justify-between text-sm">
                          <span>{cat?.key || 'unknown'} ({cat?.itemCount || 0} items):</span>
                          <span className="font-mono">{cat?.loadTime || 0}ms</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-sm text-gray-500 italic">No category data available</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GLB Preloader (hidden component for performance) */}
      {safeManifest && safeManifest.categories && typeof safeManifest.categories === 'object' && Object.keys(safeManifest.categories).length > 0 && (
        <GLBPreloader 
          manifest={safeManifest}
          progressive={true}
          priorityCategories={['shell', 'lighting', 'environment']}
          loadDelay={100}
          onStageComplete={(stage, categories) => {
            log('info', `🎯 GLB Preloader: ${stage} stage completed ${Array.isArray(categories) ? categories.join(',') : ''}`);
          }}
        />
      )}

      {/* Scene Data Preview */}
      {safeManifest && showAdvancedMetrics && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Scene Data Preview</h2>
          <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify({
              scene: safeManifest?.scene,
              itemCount: safeManifest?.items && Array.isArray(safeManifest.items) ? safeManifest.items.length : 0,
              categoryCount: safeManifest?.categories ? Object.keys(safeManifest.categories).length : 0,
              generatedAt: safeManifest?.generatedAt
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
});

export default StagedSceneLoader;