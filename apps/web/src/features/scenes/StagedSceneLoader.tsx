import React, { useState, useCallback } from 'react';
import { useSceneManifestStaged } from '../../hooks/scenes/useSceneManifestStaged';
import { useSceneCategories } from '../../hooks/scenes/useSceneQuery';
import { GLBPreloader, useSceneMetrics } from './GLBPreloader';
import type { SceneManifestV2 } from '../../services/scenesApi';

interface StagedSceneLoaderProps {
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
export function StagedSceneLoader({ 
  sceneId, 
  onManifestLoaded, 
  onLoadingStateChange 
}: StagedSceneLoaderProps) {
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);

  // Fetch available categories first
  const { 
    data: availableCategories, 
    isLoading: categoriesLoading, 
    error: categoriesError 
  } = useSceneCategories(sceneId);

  // Use staged manifest loading
  const {
    stage,
    loadedCategories,
    availableCategories: discoveredCategories,
    progress,
    manifest,
    isLoading,
    error,
    metrics,
    refresh
  } = useSceneManifestStaged(sceneId, {
    priorityCategories: ['shell', 'lighting', 'environment'],
    secondaryCategories: ['furniture', 'seating', 'tables', 'storage'],
    includeMetadata: true,
    onStageComplete: (stageName, categories) => {
      console.log(`🎯 Stage "${stageName}" completed:`, categories);
    },
    onComplete: (finalManifest) => {
      console.log('🎉 All stages completed!');
      onManifestLoaded?.(finalManifest);
    },
    onError: (error) => {
      console.error('❌ Staged loading failed:', error);
    }
  });

  // Get performance metrics
  const sceneMetrics = useSceneMetrics(manifest, metrics);

  // Handle loading state changes
  React.useEffect(() => {
    onLoadingStateChange?.(isLoading || categoriesLoading);
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
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Loading Error
          </h2>
          <p className="text-red-600 mb-4">
            {(categoriesError instanceof Error ? categoriesError.message : String(categoriesError)) || error || 'Failed to load scene data'}
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry Loading
          </button>
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
      {availableCategories && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Available Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {(Array.isArray(availableCategories) ? availableCategories : []).map((category: any) => {
              const isLoaded = Array.isArray(loadedCategories) ? loadedCategories.includes(category.categoryKey) : false;
              return (
                <div
                  key={category.categoryKey}
                  className={`p-2 rounded border text-sm ${
                    isLoaded 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="font-medium">{category.categoryKey}</div>
                  <div className="text-xs opacity-75">
                    {category.itemCount || 0} items
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {manifest && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Scene Performance</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{sceneMetrics.totalCategories}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{sceneMetrics.totalItems}</div>
              <div className="text-sm text-gray-600">Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.totalLoadTime}ms</div>
              <div className="text-sm text-gray-600">Load Time</div>
            </div>
            <div className="text-center">
              <div 
                className="text-2xl font-bold"
                style={{ color: getPerformanceColor(sceneMetrics.performance.performanceScore) }}
              >
                {sceneMetrics.performance.performanceScore}
              </div>
              <div className="text-sm text-gray-600">Performance</div>
            </div>
          </div>

          {showAdvancedMetrics && (
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Stage Timings</h3>
                <div className="space-y-1">
                  {Object.entries(metrics.stageTimings).map(([stage, time]) => (
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
                  {sceneMetrics.categoryStats
                    .sort((a, b) => b.loadTime - a.loadTime)
                    .map((cat) => (
                      <div key={cat.key} className="flex justify-between text-sm">
                        <span>{cat.key} ({cat.itemCount} items):</span>
                        <span className="font-mono">{cat.loadTime}ms</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GLB Preloader (hidden component for performance) */}
      {manifest && (
        <GLBPreloader 
          manifest={manifest}
          progressive={true}
          priorityCategories={['shell', 'lighting', 'environment']}
          loadDelay={100}
          onStageComplete={(stage, categories) => {
            console.log(`🎯 GLB Preloader: ${stage} stage completed`, categories);
          }}
        />
      )}

      {/* Scene Data Preview */}
      {manifest && showAdvancedMetrics && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Scene Data Preview</h2>
          <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify({
              scene: manifest.scene,
              itemCount: manifest.items.length,
              categoryCount: Object.keys(manifest.categories).length,
              generatedAt: manifest.generatedAt
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default StagedSceneLoader;