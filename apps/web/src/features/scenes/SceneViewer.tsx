import { Canvas } from '@react-three/fiber';
import { Environment, Stats } from '@react-three/drei';
import { Suspense, useState, useCallback } from 'react';
import type { SceneManifestV2 } from '@lumea/shared';
import { CategoryRenderer } from './CategoryRenderer';
import { GLBPreloader, useSceneMetrics } from './GLBPreloader';
import { ViewerSidebar, type ViewerControls } from './ViewerSidebar';
import { SceneHelpers } from './SceneHelpers';
import { FPSTracker } from './FPSTracker';
import { useViewerControls } from './useViewerControls';

interface SceneGraphProps {
  manifest: SceneManifestV2;
  controls: ViewerControls;
  onFPSUpdate: (fps: number) => void;
}

function SceneGraph({ manifest, controls, onFPSUpdate }: SceneGraphProps) {
  const categories = Object.entries(manifest.categories);
  useSceneMetrics(manifest); // Use metrics for logging
  
  console.log('🏗️ SceneGraph rendering with categories:', categories.map(([key]) => ({
    key,
    itemCount: manifest.items.filter(item => item.category === key).length
  })));
  
  return (
    <>
      {/* FPS Tracker */}
      <FPSTracker onFPSUpdate={onFPSUpdate} controls={controls} />
      
      {/* Preload GLBs for better performance */}
      <GLBPreloader manifest={manifest} />
      
      {/* Scene Helpers (Grid, NavMesh, etc.) */}
      <SceneHelpers 
        controls={controls} 
        navmeshUrl={manifest.navmesh_url} 
      />
      
      {/* Environment lighting with exposure control */}
      {manifest.env?.hdri_url && (
        <Environment files={manifest.env.hdri_url} />
      )}
      
      {/* Exposure control via ambient light */}
      <ambientLight intensity={0.2 * controls.exposure} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.8 * controls.exposure}
        castShadow
      />
      
      {/* Render categories with their items */}
      {categories.map(([categoryKey, category]) => (
        <Suspense key={categoryKey} fallback={null}>
          <CategoryRenderer
            categoryKey={categoryKey}
            category={category}
            items={manifest.items}
          />
        </Suspense>
      ))}
      
      {/* Performance stats (only if FPS is enabled) */}
      {controls.showFPS && <Stats />}
    </>
  );
}

interface SceneViewerProps {
  manifest: SceneManifestV2;
}

export default function SceneViewer({ manifest }: SceneViewerProps) {
  const spawnPosition = manifest.spawn.position;
  const { controls, updateControls } = useViewerControls();
  const [currentFPS, setCurrentFPS] = useState(0);

  const handleFPSUpdate = useCallback((fps: number) => {
    setCurrentFPS(fps);
  }, []);
  
  return (
    <div className="relative h-screen w-full">
      {/* 3D Canvas */}
      <Canvas
        camera={{ 
          position: spawnPosition, 
          fov: 60 
        }}
        gl={{ 
          antialias: true, 
          powerPreference: 'high-performance' 
        }}
      >
        {/* Background */}
        <color attach="background" args={['#0b0b0b']} />
        
        {/* Scene content */}
        <Suspense fallback={null}>
          <SceneGraph 
            manifest={manifest} 
            controls={controls}
            onFPSUpdate={handleFPSUpdate}
          />
        </Suspense>
      </Canvas>

      {/* Sidebar Controls */}
      <ViewerSidebar
        controls={controls}
        onControlsChange={updateControls}
        fps={currentFPS}
      />
    </div>
  );
}