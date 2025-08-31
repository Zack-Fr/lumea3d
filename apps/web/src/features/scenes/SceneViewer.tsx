import { Canvas } from '@react-three/fiber';
import { Environment, Stats, useGLTF } from '@react-three/drei';
import { Suspense } from 'react';
import type { SceneManifestV2 } from '@lumea/shared';
import { pickCategoryUrl } from './useSceneAssets';

interface CategoryProps {
  url: string;
}

function Category({ url }: CategoryProps) {
  const gltf = useGLTF(url);
  return <primitive object={gltf.scene} />;
}

interface SceneGraphProps {
  manifest: SceneManifestV2;
}

function SceneGraph({ manifest }: SceneGraphProps) {
  const categories = Object.entries(manifest.categories);
  
  return (
    <>
      {/* Environment lighting */}
      {manifest.env?.hdri_url && (
        <Environment files={manifest.env.hdri_url} />
      )}
      
      {/* Load category GLBs */}
      {categories.map(([key, category]) => (
        <group key={key} name={`category-${key}`}>
          <Suspense fallback={null}>
            <Category url={pickCategoryUrl(category)} />
          </Suspense>
        </group>
      ))}
      
      {/* TODO: Item transforms and instancing 
          - Find named node by item.model (if provided) in the category scene
          - Clone or instance; apply item.transform
      */}
      
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