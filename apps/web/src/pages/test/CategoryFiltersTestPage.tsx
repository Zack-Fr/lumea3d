import { useState } from 'react';
import StagedSceneLoader from '../../features/scenes/StagedSceneLoader';
import type { SceneManifestV2 } from '../../services/scenesApi';

/**
 * Test page to demonstrate the Category Filters and Performance Optimizations.
 * 
 * This page showcases the staged manifest loading functionality which includes:
 * - Progressive category discovery
 * - Staged manifest loading (shell+lighting first, then furniture, then decorations)
 * - Performance monitoring and metrics
 * - Progressive asset preloading
 */
export default function CategoryFiltersTestPage() {
  const [selectedSceneId, setSelectedSceneId] = useState('demo-scene-1');
  const [loadedManifest, setLoadedManifest] = useState<SceneManifestV2 | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Demo project ID (in a real app, this would come from routing or context)
  const demoProjectId = 'demo-project-1';

  // Demo scene IDs (in a real app, these would come from a scenes API)
  const demoScenes = [
    { id: 'demo-scene-1', name: 'Living Room Demo' },
    { id: 'demo-scene-2', name: 'Office Space Demo' },
    { id: 'demo-scene-3', name: 'Bedroom Demo' }
  ];

  const handleManifestLoaded = (manifest: SceneManifestV2) => {
    setLoadedManifest(manifest);
    // One-time success message for demo
    // eslint-disable-next-line no-console
    console.info('🎉 CategoryFiltersTest: Manifest loaded successfully (info)');
  };

  const handleLoadingStateChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  const handleSceneChange = (sceneId: string) => {
    setSelectedSceneId(sceneId);
    setLoadedManifest(null); // Clear previous manifest
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Category Filters & Performance Optimizations
              </h1>
              <p className="text-gray-600 mt-1">
                Demonstration of staged manifest loading with performance monitoring
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Scene Selector */}
              <div className="flex items-center gap-2">
                <label htmlFor="scene-select" className="text-sm font-medium text-gray-700">
                  Scene:
                </label>
                <select
                  id="scene-select"
                  value={selectedSceneId}
                  onChange={(e) => handleSceneChange(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  {demoScenes.map((scene) => (
                    <option key={scene.id} value={scene.id}>
                      {scene.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Loading...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Feature Overview */}
        <div className="mb-8 bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Performance Optimization Features
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Staged Loading</h3>
              <p className="text-sm text-blue-700">
                Load essential categories (shell, lighting) first for faster initial render
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Category Filtering</h3>
              <p className="text-sm text-green-700">
                Request only needed categories from the API to reduce payload size
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-900 mb-2">Progressive Preloading</h3>
              <p className="text-sm text-purple-700">
                Preload GLB assets progressively to prevent blocking the main thread
              </p>
            </div>
            
            <div className="p-4 bg-amber-50 rounded-lg">
              <h3 className="font-medium text-amber-900 mb-2">Performance Monitoring</h3>
              <p className="text-sm text-amber-700">
                Track loading times and identify performance bottlenecks
              </p>
            </div>
          </div>
        </div>

        {/* API Implementation Note */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">🔧 Implementation Note</h3>
          <p className="text-blue-800 text-sm">
            This demo uses the flat route API endpoints: <code className="bg-blue-100 px-1 rounded">GET /scenes/{'{sceneId}'}/categories</code> and 
            <code className="bg-blue-100 px-1 rounded ml-1">GET /scenes/{'{sceneId}'}/manifest?categories=...</code>
            <br />
            The staged loading reduces initial load time by prioritizing essential scene elements.
          </p>
        </div>

        {/* Staged Scene Loader Demo */}
        <StagedSceneLoader
          projectId={demoProjectId}
          sceneId={selectedSceneId}
          onManifestLoaded={handleManifestLoaded}
          onLoadingStateChange={handleLoadingStateChange}
        />

        {/* Results Summary */}
        {loadedManifest && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-900 mb-3">
              ✅ Loading Complete
            </h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-800">Scene:</span>
                <div className="text-green-700">{loadedManifest.scene.name}</div>
              </div>
              <div>
                <span className="font-medium text-green-800">Items:</span>
                <div className="text-green-700">{loadedManifest.items.length}</div>
              </div>
              <div>
                <span className="font-medium text-green-800">Categories:</span>
                <div className="text-green-700">{Object.keys(loadedManifest.categories).length}</div>
              </div>
            </div>
          </div>
        )}

        {/* Technical Details */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Technical Implementation
          </h2>
          
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">1. Category Discovery</h3>
              <p>Uses <code className="bg-gray-200 px-1 rounded">useSceneCategories</code> hook to fetch available categories before loading the full manifest.</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">2. Staged Manifest Loading</h3>
              <p>The <code className="bg-gray-200 px-1 rounded">useSceneManifestStaged</code> hook loads categories in priority order: shell/lighting → furniture → decorations.</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">3. Progressive Asset Preloading</h3>
              <p>The enhanced <code className="bg-gray-200 px-1 rounded">GLBPreloader</code> component preloads GLB files progressively with configurable delays.</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">4. Performance Monitoring</h3>
              <p>Tracks stage timings, category load times, and provides performance scores to identify optimization opportunities.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}