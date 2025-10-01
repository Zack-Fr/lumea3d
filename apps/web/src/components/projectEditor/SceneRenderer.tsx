import React, { useMemo, Suspense, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { toast } from 'react-toastify';
import * as THREE from 'three';
import { useSceneContext } from '../../contexts/SceneContext';
import { log } from '../../utils/logger';

interface MeshItemProps {
  item: any;
  categoryKey: string;
  isEnabled: boolean;
}

// Simplified mesh component that focuses on rendering assets
const MeshItem: React.FC<MeshItemProps> = React.memo(({ item, categoryKey, isEnabled }) => {
  console.log('🔍 MeshItem: Rendering item:', {
    id: item.id,
    name: item.name,
    url: item.url,
    categoryKey,
    isEnabled,
    isLocal: item.isLocal
  });
  
  // Get the best available URL
  const bestUrl = useMemo(() => {
    if (!item) {
      console.warn('🔍 MeshItem: No item provided');
      return null;
    }
    
    // Priority order: draco -> meshopt -> original -> url
    const possibleUrls = [
      item.dracoUrl,
      item.meshoptUrl, 
      item.originalUrl,
      item.url
    ].filter(url => url && typeof url === 'string' && url.length > 0);
    
    const selectedUrl = possibleUrls[0];
    console.log('🔍 MeshItem: URL selection:', {
      itemId: item.id,
      possibleUrls,
      selectedUrl
    });
    
    return selectedUrl || null;
  }, [item]);

  // Load the GLTF model directly
  let gltf: any = null;
  let loadError = false;
  const [hasError, setHasError] = useState(false);
  
  try {
    if (bestUrl && isEnabled) {
      console.log('🔍 MeshItem: Loading GLTF:', bestUrl);
      gltf = useGLTF(bestUrl, undefined, undefined, (error: any) => {
        console.error('Failed to load GLB in MeshItem:', error);
        setHasError(true);
        loadError = true;
        toast.error('Failed to load 3D model. The asset may be missing or corrupted.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      });
      console.log('🔍 MeshItem: GLTF loaded successfully:', gltf ? 'yes' : 'no');

      // Check if this is a placeholder GLB from the API
      if (gltf && gltf.scene && gltf.scene.userData && gltf.scene.userData.generator === 'Lumea Placeholder') {
        console.warn('MeshItem: Detected placeholder GLB for:', bestUrl);
        setHasError(true);
        loadError = true;
        toast.error('3D model asset is missing from storage. Using error placeholder.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    }
  } catch (error) {
    console.error('🔍 MeshItem: useGLTF failed:', error);
    loadError = true;
  }

  if (!isEnabled) {
    console.log('🔍 MeshItem: Item disabled, not rendering:', item.id);
    return null;
  }
  
  // If there's an error, don't render anything
  if (hasError) {
    return null;
  }
  
  // Get position from item or use default
  const position = useMemo(() => {
    if (item.position && Array.isArray(item.position) && item.position.length >= 3) {
      return [item.position[0], item.position[1], item.position[2]] as [number, number, number];
    }
    if (item.transform?.position && Array.isArray(item.transform.position) && item.transform.position.length >= 3) {
      return [item.transform.position[0], item.transform.position[1], item.transform.position[2]] as [number, number, number];
    }
    if (item.transform?.position) {
      const pos = item.transform.position;
      return [pos.x || 0, pos.y || 0, pos.z || 0] as [number, number, number];
    }
    // Random positioning for demo purposes
    return [
      (Math.random() - 0.5) * 10,
      0.5,
      (Math.random() - 0.5) * 10
    ] as [number, number, number];
  }, [item]);

  // Get rotation from item or use default
  const rotation = useMemo(() => {
    if (item.rotation && Array.isArray(item.rotation) && item.rotation.length >= 3) {
      return [item.rotation[0], item.rotation[1], item.rotation[2]] as [number, number, number];
    }
    if (item.transform?.rotation_euler && Array.isArray(item.transform.rotation_euler) && item.transform.rotation_euler.length >= 3) {
      // Convert degrees to radians
      return [
        (item.transform.rotation_euler[0] * Math.PI) / 180,
        (item.transform.rotation_euler[1] * Math.PI) / 180,
        (item.transform.rotation_euler[2] * Math.PI) / 180
      ] as [number, number, number];
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
    if (item.transform?.scale && Array.isArray(item.transform.scale) && item.transform.scale.length >= 3) {
      return [item.transform.scale[0], item.transform.scale[1], item.transform.scale[2]] as [number, number, number];
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
  
  // Add selection userData to the group for object picking
  const userData = useMemo(() => ({
    itemId: item.id || `${categoryKey}-${Math.random()}`,
    category: categoryKey,
    selectable: true,
    locked: item.locked || false,
    name: item.name || `Item ${item.id}`,
    originalData: item
  }), [item, categoryKey]);
  
  console.log('🔍 MeshItem: Transform values:', {
    itemId: item.id,
    position,
    rotation,
    scale,
    hasUrl: !!bestUrl,
    hasGltf: !!gltf,
    loadError
  });

  // Show loading placeholder if we don't have a URL yet
  if (!bestUrl) {
    console.log('🔍 MeshItem: No URL available, showing placeholder:', item.id);
    return (
      <group 
        position={position} 
        rotation={rotation} 
        scale={scale}
        userData={userData}
        name={`no-url-item-${userData.itemId}`}
      >
        {/* No URL placeholder */}
        <mesh>
          <boxGeometry args={[1, 0.1, 1]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      </group>
    );
  }
  
  // Show error placeholder if loading failed
  if (loadError || !gltf) {
    return (
      <group 
        position={position} 
        rotation={rotation} 
        scale={scale}
        userData={userData}
        name={`error-item-${userData.itemId}`}
      >
        {/* Error placeholder */}
        <mesh>
          <boxGeometry args={[1, 0.1, 1]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        {/* Error text would go here in a real app */}
      </group>
    );
  }

  // Clone the scene and apply userData to all mesh children
  const clonedScene = useMemo(() => {
    if (!gltf?.scene) return null;
    
    const cloned = gltf.scene.clone(true);
    
    // Apply userData to all mesh children for selection
    cloned.traverse((child: THREE.Object3D) => {
      if (child.type === 'Mesh') {
        // Set name for debugging
        if (!child.name) {
          child.name = `${item.name || 'imported-mesh'}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Apply complete userData for selection system
        child.userData = {
          ...userData,
          originalName: child.name,
          isImportedMesh: true
        };
        
        log('debug', `Applied userData to mesh: ${child.name}`, {
          userData: child.userData,
          position: child.position.toArray(),
          visible: child.visible
        });
      }
    });
    
    return cloned;
  }, [gltf?.scene, userData, item.name]);

  console.log('✅ MeshItem: Successfully rendering GLTF item:', {
    itemId: item.id,
    name: item.name,
    categoryKey,
    position,
    rotation,
    scale,
    url: bestUrl,
    hasClonedScene: !!clonedScene
  });

  if (!clonedScene) {
    console.warn('🔍 MeshItem: No cloned scene available for:', item.id);
    return (
      <group 
        position={position} 
        rotation={rotation} 
        scale={scale}
        userData={userData}
        name={`loading-item-${userData.itemId}`}
      >
        {/* Loading placeholder */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#3b82f6" wireframe />
        </mesh>
      </group>
    );
  }

  return (
    <group 
      position={position} 
      rotation={rotation} 
      scale={scale}
      userData={userData}
      name={`scene-item-${userData.itemId}`}
    >
      <primitive object={clonedScene} />
    </group>
  );
});

MeshItem.displayName = 'MeshItem';

// Error boundary component for individual meshes
class MeshErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MeshErrorBoundary caught an error:', error, errorInfo);
    // Don't show toast here as individual mesh errors are handled by useGLTF
  }

  render() {
    if (this.state.hasError) {
      // Return null to hide the broken mesh instead of showing error UI
      return null;
    }

    return (
      <Suspense
        fallback={
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#cccccc" wireframe />
          </mesh>
        }
      >
        {this.props.children}
      </Suspense>
    );
  }
}

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
    
    // Get existing item IDs to prevent duplicates
    const existingItemIds = new Set(
      items.map(item => 
        item.item.id || 
        item.item.assetId || 
        item.item.meta?.localAssetId
      )
    );
    
    try {
      const localAssets = JSON.parse(localStorage.getItem('lumea-local-assets') || '[]');
      
      // Filter out local assets that already exist in manifest
      const uniqueLocalAssets = localAssets.filter((asset: any) => {
        // Check multiple possible ID matches to prevent duplicates
        const assetIds = [
          asset.id,
          asset.meta?.localAssetId,
          asset.meta?.backendId,
          asset.assetId
        ].filter(Boolean);
        
        const isDuplicate = assetIds.some(id => existingItemIds.has(id));
        
        if (isDuplicate) {
          console.log('🔍 SceneRenderer: Skipping duplicate local asset:', {
            assetId: asset.id,
            name: asset.name,
            possibleIds: assetIds,
            existingIds: Array.from(existingItemIds)
          });
        }
        
        return !isDuplicate;
      });
      
      // Add unique local assets to items
      uniqueLocalAssets.forEach((asset: any) => {
        const isEnabled = enabledCategories.length === 0 || enabledCategories.includes(asset.category);
        items.push({
          item: {
            id: asset.id,
            name: asset.name,
            url: asset.url,
            category: asset.category,
            position: asset.position,
            rotation: asset.rotation,
            scale: asset.scale,
            transform: asset.transform,
            meta: asset.meta,
            isLocal: true
          },
          categoryKey: asset.category,
          isEnabled
        });
      });
      
      console.log('🔍 SceneRenderer: Local assets processed:', {
        total: localAssets.length,
        unique: uniqueLocalAssets.length,
        skipped: localAssets.length - uniqueLocalAssets.length
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
  
  console.log('🔍 DEBUG: components/projectEditor/SceneRenderer - ALL RENDERABLE ITEMS:');
  allRenderableItems.forEach((renderableItem, index) => {
    console.log(`🔍 Item ${index}:`, {
      id: renderableItem.item.id,
      name: renderableItem.item.name,
      categoryKey: renderableItem.categoryKey,
      isEnabled: renderableItem.isEnabled,
      isLocal: renderableItem.item.isLocal,
      url: renderableItem.item.url
    });
  });

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
