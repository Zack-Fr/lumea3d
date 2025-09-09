import { Suspense } from 'react';
import { useSceneManifestStaged } from '../../hooks/scenes/useSceneManifestStaged';
import { CategoryRenderer } from './CategoryRenderer';
import { log } from '../../utils/logger';

interface SceneRendererProps {
  sceneId: string;
}

/**
 * Component that renders the actual 3D scene content inside the Three.js Canvas
 */
export function SceneRenderer({ sceneId }: SceneRendererProps) {
  // Load the scene manifest
  const stagedResult = useSceneManifestStaged(sceneId, {
    enabled: true, // Already validated in parent
    priorityCategories: ['shell', 'lighting', 'environment'],
    secondaryCategories: ['furniture', 'seating', 'tables', 'storage'],
    includeMetadata: true,
  });

  const { manifest, isLoading, error } = stagedResult;

  // Show loading state
  if (isLoading || !manifest) {
    return (
      <group name="loading-placeholder">
        {/* You can add a simple loading indicator here if needed */}
      </group>
    );
  }

  // Show error state
  if (error) {
    log('error', 'SceneRenderer: Failed to load manifest', error);
    return (
      <group name="error-placeholder">
        {/* You can add an error indicator here if needed */}
      </group>
    );
  }

  // Render the scene
  const categories = manifest.categories || {};
  const items = manifest.items || [];

  log('info', `🎨 SceneRenderer: Rendering scene with ${Object.keys(categories).length} categories and ${items.length} items`);

  return (
    <group name="scene-root">
      {Object.entries(categories).map(([categoryKey, category]) => (
        <Suspense key={categoryKey} fallback={null}>
          <CategoryRenderer
            categoryKey={categoryKey}
            category={category}
            items={items}
          />
        </Suspense>
      ))}
    </group>
  );
}