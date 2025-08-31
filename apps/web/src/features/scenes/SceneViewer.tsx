import { Canvas } from '@react-three/fiber';
import { Environment, Stats } from '@react-three/drei';
import { Suspense } from 'react';
import type { SceneManifestV2 } from '@lumea/shared';
import { CategoryRenderer } from './CategoryRenderer';
import { GLBPreloader, useSceneMetrics } from './GLBPreloader';

interface SceneGraphProps {
  manifest: SceneManifestV2;
}

function SceneGraph({ manifest }: SceneGraphProps) {
  const categories = Object.entries(manifest.categories);
  useSceneMetrics(manifest); // Use metrics for logging
  
  console.log('🏗️ SceneGraph rendering with categories:', categories.map(([key]) => ({
    key,
    itemCount: manifest.items.filter(item => item.category === key).length
  })));
  
  return (
    <>
      {/* Preload GLBs for better performance */}
      <GLBPreloader manifest={manifest} />
      
      {/* Environment lighting */}
      {manifest.env?.hdri_url && (
        <Environment files={manifest.env.hdri_url} />
      )}
      
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
      
      {/* Performance stats */}
      <Stats />
    </>
  );
}

interface SceneViewerProps {
  manifest: SceneManifestV2;
}

export default function SceneViewer({ manifest }: SceneViewerProps) {
  const spawnPosition = manifest.spawn.position;
  
  return (
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
        <SceneGraph manifest={manifest} />
      </Suspense>
    </Canvas>
  );
}