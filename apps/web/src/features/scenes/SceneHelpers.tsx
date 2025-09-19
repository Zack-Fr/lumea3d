import { useRef, useState, useEffect } from 'react';
import { Grid, Plane } from '@react-three/drei';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import { toast } from 'react-toastify';
import type { ViewerControls } from './ViewerSidebar';

interface SceneHelpersProps {
  controls: ViewerControls;
  navmeshUrl?: string;
}

// Grid Helper Component
function SceneGrid({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <Grid
      position={[0, 0, 0]}
      args={[100, 100]}
      cellSize={1}
      cellThickness={0.5}
      cellColor="#444444"
      sectionSize={10}
      sectionThickness={1}
      sectionColor="#666666"
      fadeDistance={50}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid={true}
    />
  );
}

// NavMesh Visualization Component
function NavMeshVisualization({ url, visible }: { url?: string; visible: boolean }) {
  const meshRef = useRef<Group>(null);
  const [hasError, setHasError] = useState(false);

  if (!visible || !url) return null;

  const { scene } = useGLTF(url, undefined, undefined, (error: any) => {
    console.error('Failed to load navmesh GLB:', error);
    setHasError(true);
    toast.error('Failed to load navigation mesh. The asset may be missing or corrupted.', {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  });
  
  // Check for placeholder GLB
  useEffect(() => {
    if (scene && !hasError) {
      if (scene.children.length === 0 && 
          (scene as any).asset?.generator === 'Lumea Placeholder') {
        console.warn('Detected placeholder GLB for missing navmesh asset:', url);
        setHasError(true);
        toast.error('Navigation mesh not found. The asset may have been deleted or moved.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    }
  }, [scene, hasError, url]);
  
  if (hasError) return null;
  
  // Clone the navmesh and make it semi-transparent
  const navmesh = scene.clone();
  
  // Apply wireframe material to visualize navmesh
  navmesh.traverse((child) => {
    if (child instanceof Mesh) {
      child.material = child.material.clone();
      child.material.wireframe = true;
      child.material.transparent = true;
      child.material.opacity = 0.3;
      child.material.color.setHex(0x00ff00); // Green wireframe
    }
  });

  return (
    <group ref={meshRef} name="navmesh-visualization">
      <primitive object={navmesh} />
    </group>
  );
}

// FPS Counter Component (overlaid in 3D space)
function FPSDisplay({ visible }: { visible: boolean }) {
  const fpsRef = useRef(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    const delta = now - lastTime.current;

    if (delta >= 1000) { // Update every second
      fpsRef.current = (frameCount.current * 1000) / delta;
      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  if (!visible) return null;

  return (
    <group position={[-4, 3, -5]} name="fps-display">
      {/* Background plane */}
      <Plane args={[1.5, 0.5]} position={[0, 0, -0.01]}>
        <meshBasicMaterial color="#000000" opacity={0.7} transparent />
      </Plane>
      
      {/* FPS Text - This would need a text geometry implementation */}
      {/* For now, we'll handle FPS display in the UI sidebar */}
    </group>
  );
}

// Environment Exposure Controller
function ExposureController({ exposure }: { exposure: number }) {
  // This effect is handled by the Environment component in SceneViewer
  // We can add additional exposure effects here if needed
  console.log('🌞 Exposure set to:', exposure);
  return null;
}

// Main Scene Helpers Component
export function SceneHelpers({ controls, navmeshUrl }: SceneHelpersProps) {
  console.log('🔧 SceneHelpers render:', {
    showGrid: controls.showGrid,
    showNavMesh: controls.showNavMesh,
    exposure: controls.exposure,
    noclipMode: controls.noclipMode,
    navmeshUrl
  });

  return (
    <group name="scene-helpers">
      {/* Grid */}
      <SceneGrid visible={controls.showGrid} />
      
      {/* NavMesh Visualization */}
      <NavMeshVisualization 
        url={navmeshUrl} 
        visible={controls.showNavMesh} 
      />
      
      {/* FPS Display (in 3D space) */}
      <FPSDisplay visible={controls.showFPS} />
      
      {/* Exposure Controller */}
      <ExposureController exposure={controls.exposure} />
    </group>
  );
}