import React, { useMemo, Suspense, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import { useSceneContext } from '../../contexts/SceneContext';
import { log } from '../../utils/logger';

interface MeshItemProps {
  item: any;
  categoryKey: string;
  isEnabled: boolean;
}

// Enhanced mesh component with progressive loading and format fallbacks
const MeshItem: React.FC<MeshItemProps> = React.memo(({ item, categoryKey, isEnabled }) => {
  const [loadingState, setLoadingState] = React.useState<'loading' | 'loaded' | 'error' | 'fallback'>('loading');
  const [currentUrlIndex, setCurrentUrlIndex] = React.useState(0);
  
  // Get all available URLs with fallbacks
  const availableUrls = useMemo(() => {
    if (!item) return [];
    
    const urls: Array<{ url: string; type: 'draco' | 'meshopt' | 'original' | 'local' | 'unknown' }> = [];
    
    // Priority order: draco -> meshopt -> original -> local
    if (item.dracoUrl && typeof item.dracoUrl === 'string') {
      urls.push({ url: item.dracoUrl, type: 'draco' });
    }
    if (item.meshoptUrl && typeof item.meshoptUrl === 'string') {
      urls.push({ url: item.meshoptUrl, type: 'meshopt' });
    }
    if (item.originalUrl && typeof item.originalUrl === 'string') {
      urls.push({ url: item.originalUrl, type: 'original' });
    }
    if (item.url && typeof item.url === 'string') {
      urls.push({ url: item.url, type: 'unknown' });
    }
    
    // Check localStorage for local assets
    try {
      const localAssets = JSON.parse(localStorage.getItem('lumea-local-assets') || '[]');
      const localAsset = localAssets.find((asset: any) => asset.id === item.id || asset.id === item.assetId);
      if (localAsset?.url) {
        urls.push({ url: localAsset.url, type: 'local' });
      }
    } catch (error) {
      console.warn('Failed to read local assets:', error);
    }
    
    return urls;
  }, [item]);

  const currentUrl = availableUrls[currentUrlIndex];
  
  // Progressive loading with fallbacks
  const loadWithFallback = useCallback(async (urlIndex: number) => {
    if (!availableUrls[urlIndex]) {
      setLoadingState('error');
      log('error', `MeshItem: No more URLs to try for ${item.name || item.id}`);
      return;
    }
    
    const urlData = availableUrls[urlIndex];
    log('debug', `MeshItem: Attempting to load ${urlData.type} format`, { 
      url: urlData.url, 
      attempt: urlIndex + 1, 
      total: availableUrls.length 
    });
    
    try {
      setLoadingState('loading');
      
      // Test if the URL is accessible
      const response = await fetch(urlData.url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      setLoadingState('loaded');
      log('info', `MeshItem: Successfully loaded ${urlData.type} format for ${item.name || item.id}`);
      
    } catch (error) {
      log('warn', `MeshItem: Failed to load ${urlData.type} format, trying fallback`, error);
      
      // Try next URL
      const nextIndex = urlIndex + 1;
      if (nextIndex < availableUrls.length) {
        setCurrentUrlIndex(nextIndex);
        setTimeout(() => loadWithFallback(nextIndex), 100); // Small delay between attempts
      } else {
        setLoadingState('error');
        log('error', `MeshItem: All URLs failed for ${item.name || item.id}`);
      }
    }
  }, [availableUrls, item]);
  
  // Start loading when component mounts or URLs change
  React.useEffect(() => {
    if (availableUrls.length > 0 && isEnabled) {
      setCurrentUrlIndex(0);
      loadWithFallback(0);
    }
  }, [availableUrls, isEnabled, loadWithFallback]);

  // Load the GLTF model with error handling
  let gltf: any = null;
  try {
    if (currentUrl && loadingState === 'loaded') {
      gltf = useGLTF(currentUrl.url, true);
    }
  } catch (error) {
    log('error', 'useGLTF failed:', error);
    setLoadingState('error');
  }

  if (!isEnabled) {
    return null;
  }
  
  // Get position from item or use default
  const position = useMemo(() => {
    if (item.position && Array.isArray(item.position) && item.position.length >= 3) {
      return [item.position[0], item.position[1], item.position[2]] as [number, number, number];
    }
    if (item.transform?.position) {
      const pos = item.transform.position;
      return [pos.x || 0, pos.y || 0, pos.z || 0] as [number, number, number];
    }
    // Random positioning for demo purposes
    return [
      (Math.random() - 0.5) * 10,
      0,
      (Math.random() - 0.5) * 10
    ] as [number, number, number];
  }, [item]);

  // Get rotation from item or use default
  const rotation = useMemo(() => {
    if (item.rotation && Array.isArray(item.rotation) && item.rotation.length >= 3) {
      return [item.rotation[0], item.rotation[1], item.rotation[2]] as [number, number, number];
    }
    if (item.transform?.rotation) {
      const rot = item.transform.rotation;
      return [rot.x || 0, rot.y || 0, rot.z || 0] as [number, number, number];
    }
    return [0, 0, 0] as [number, number, number];
  }, [item]);

  // Get scale from item or use default
  const scale = useMemo(() => {
    if (item.scale && Array.isArray(item.scale) && item.scale.length >= 3) {
      return [item.scale[0], item.scale[1], item.scale[2]] as [number, number, number];
    }
    if (item.transform?.scale) {
      const scl = item.transform.scale;
      return [scl.x || 1, scl.y || 1, scl.z || 1] as [number, number, number];
    }
    if (typeof item.scale === 'number') {
      return [item.scale, item.scale, item.scale] as [number, number, number];
    }
    return [1, 1, 1] as [number, number, number];
  }, [item]);
  
  // Handle different loading states
  if (loadingState === 'loading') {
    return (
      <group position={position} rotation={rotation} scale={scale}>
        {/* Loading placeholder */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#3b82f6" wireframe />
        </mesh>
      </group>
    );
  }
  
  if (loadingState === 'error' || !currentUrl || !gltf) {
    return (
      <group position={position} rotation={rotation} scale={scale}>
        {/* Error placeholder */}
        <mesh>
          <boxGeometry args={[1, 0.1, 1]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        {/* Error text would go here in a real app */}
      </group>
    );
  }

  log('debug', `Rendering mesh item: ${item.name || item.id}`, {
    categoryKey,
    position,
    rotation,
    scale,
    url: currentUrl?.url,
    format: currentUrl?.type,
    state: loadingState
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={gltf.scene.clone()} />
    </group>
  );
});

MeshItem.displayName = 'MeshItem';

// Error boundary component for individual meshes
const MeshErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ 
  children
}) => {
  return (
    <Suspense 
      fallback={
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#cccccc" wireframe />
        </mesh>
      }
    >
      {children}
    </Suspense>
  );
};

// Main scene renderer component
const SceneRenderer: React.FC = React.memo(() => {
  const { 
    manifest, 
    enabledCategories, 
    isLoading, 
    error 
  } = useSceneContext();

  // Filter and prepare renderable items
  const renderableItems = useMemo(() => {
    if (!manifest || !manifest.categories || !manifest.items) {
      return [];
    }

    const items: Array<{ item: any; categoryKey: string; isEnabled: boolean }> = [];
    
    // Process categories
    Object.entries(manifest.categories).forEach(([categoryKey, categoryData]: [string, any]) => {
      const isEnabled = enabledCategories.length === 0 || enabledCategories.includes(categoryKey);
      
      if (categoryData.items && Array.isArray(categoryData.items)) {
        categoryData.items.forEach((item: any) => {
          items.push({
            item,
            categoryKey,
            isEnabled
          });
        });
      }
    });

    // Also process direct items array if available
    if (Array.isArray(manifest.items)) {
      manifest.items.forEach((item: any) => {
        const categoryKey = item.category || item.categoryKey || 'misc';
        const isEnabled = enabledCategories.length === 0 || enabledCategories.includes(categoryKey);
        
        items.push({
          item,
          categoryKey,
          isEnabled
        });
      });
    }

    log('debug', `SceneRenderer: Processing ${items.length} items from manifest`, {
      enabledCategories,
      totalCategories: Object.keys(manifest.categories || {}).length
    });

    return items;
  }, [manifest, enabledCategories]);

  // Add local assets to renderable items
  const allRenderableItems = useMemo(() => {
    const items = [...renderableItems];
    
    try {
      const localAssets = JSON.parse(localStorage.getItem('lumea-local-assets') || '[]');
      localAssets.forEach((asset: any) => {
        const isEnabled = enabledCategories.length === 0 || enabledCategories.includes(asset.category);
        items.push({
          item: {
            id: asset.id,
            name: asset.name,
            url: asset.url,
            category: asset.category,
            isLocal: true
          },
          categoryKey: asset.category,
          isEnabled
        });
      });
    } catch (error) {
      console.warn('Failed to load local assets:', error);
    }
    
    return items;
  }, [renderableItems, enabledCategories]);

  if (isLoading) {
    log('debug', 'SceneRenderer: Scene is loading, showing placeholder');
    return (
      <group>
        {/* Loading placeholder */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#3b82f6" wireframe />
        </mesh>
      </group>
    );
  }

  if (error) {
    log('error', 'SceneRenderer: Scene has error, showing error indicator', error);
    return (
      <group>
        {/* Error indicator */}
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color="#ef4444" wireframe />
        </mesh>
      </group>
    );
  }

  if (allRenderableItems.length === 0) {
    log('debug', 'SceneRenderer: No renderable items, showing empty scene indicator');
    return (
      <group>
        {/* Empty scene indicator */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#6b7280" transparent opacity={0.3} />
        </mesh>
      </group>
    );
  }

  log('info', `SceneRenderer: Rendering ${allRenderableItems.filter(item => item.isEnabled).length} enabled items`);

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#f3f4f6" />
      </mesh>

      {/* Render all mesh items */}
      {allRenderableItems.map((renderableItem, index) => {
        const { item, categoryKey, isEnabled } = renderableItem;
        const itemKey = item.id || item.assetId || `item-${index}`;
        
        return (
          <MeshErrorBoundary key={itemKey}>
            <MeshItem
              item={item}
              categoryKey={categoryKey}
              isEnabled={isEnabled}
            />
          </MeshErrorBoundary>
        );
      })}
    </group>
  );
});

SceneRenderer.displayName = 'SceneRenderer';

export default SceneRenderer;
