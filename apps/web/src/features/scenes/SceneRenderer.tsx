import { Suspense } from 'react';
import { useSceneManifestStaged } from '../../hooks/scenes/useSceneManifestStaged';
import { CategoryRenderer } from './CategoryRenderer';
import { SafeSceneItem } from './SafeSceneItem';
import { log } from '../../utils/logger';
import { LightsFromManifest } from './LightsFromManifest';

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
  
  console.log('🔍 DEBUG: features/scenes/SceneRenderer - MANIFEST ITEMS:');
  items.forEach((item, index) => {
    console.log(`🔍 Item ${index}:`, {
      id: item.id,
      name: item.name,
      category: item.category,
      selectable: item.selectable,
      hasTransform: !!item.transform,
      meta: item.meta
    });
  });
  

  console.log('🔍 SceneRenderer Debug Data:');
  console.log('Categories:', Object.keys(categories));
  console.log('Items:', items.map(item => ({
    id: item.id,
    name: item.name,
    category: typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey,
    model: item.model,
    selectable: item.selectable,
    hasTransform: !!item.transform,
    position: item.transform?.position
  })));
  
  // Log each category's details
  Object.entries(categories).forEach(([categoryKey, category]) => {
    const categoryItems = items.filter(item => {
      const itemCategory = typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey || '';
      return itemCategory === categoryKey;
    });
    
    console.log(`📂 Category "${categoryKey}":`, {
      categoryInfo: category,
      itemCount: categoryItems.length,
      items: categoryItems.map(item => ({ id: item.id, name: item.name, model: item.model }))
    });
  });

  // Load local assets from localStorage
  let localAssets: any[] = [];
  try {
    localAssets = JSON.parse(localStorage.getItem('lumea-local-assets') || '[]');
    console.log('🔍 SceneRenderer: Found local assets:', localAssets.length);
  } catch (error) {
    console.warn('Failed to load local assets:', error);
  }

  return (
    <group name="scene-root">
      {/* Reconstruct lights from manifest first to ensure helpers and selection work */}
      <LightsFromManifest items={items} />

      {/* Render manifest items via CategoryRenderer (lights are filtered out) */}
      {Object.entries(categories).map(([categoryKey, category]) => (
        <Suspense key={`${sceneId}-${categoryKey}`} fallback={null}>
          <CategoryRenderer
            categoryKey={categoryKey}
            category={category}
            items={items}
            sceneId={sceneId}
          />
        </Suspense>
      ))}
      
      {/* Render local assets directly */}
      {localAssets.map((asset) => {
        console.log('🔍 SceneRenderer: Rendering local asset:', {
          id: asset.id,
          name: asset.name,
          url: asset.url,
          category: asset.category
        });
        
        // Convert local asset to scene item format
        const localItem = {
          id: asset.id,
          name: asset.name,
          category: asset.category,
          model: '', // Use empty string to render entire GLB scene like regular manifest items
          selectable: true,
          locked: false,
          meta: {
            isLocal: true,
            assetName: asset.name,
            importedAt: asset.createdAt
          },
          transform: {
            position: [(Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10] as [number, number, number],
            rotation_euler: [0, 0, 0] as [number, number, number],
            scale: [1, 1, 1] as [number, number, number]
          }
        };
        
        return (
          <Suspense 
            key={`local-${asset.id}`}
            fallback={
              <mesh 
                name={`local-fallback-${asset.id}`}
                position={localItem.transform.position as [number, number, number]}
                userData={{
                  itemId: asset.id,
                  category: asset.category,
                  selectable: true,
                  locked: false,
                  meta: localItem.meta
                }}
              >
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="purple" wireframe />
              </mesh>
            }
          >
            <SafeSceneItem
              item={localItem}
              categoryUrl={asset.url}
              categoryKey={asset.category}
            />
          </Suspense>
        );
      })}
    </group>
  );
}