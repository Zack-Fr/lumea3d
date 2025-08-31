import { useState } from 'react';
import { useFrame } from '@react-three/fiber';

// Sidebar Controls State Hook
export function useSidebarControls() {
  const [showGrid, setShowGrid] = useState(true);
  const [exposure, setExposure] = useState(1.0);
  const [showNavmesh, setShowNavmesh] = useState(false);
  const [noclipMode, setNoclipMode] = useState(false);
  const [showFPS, setShowFPS] = useState(true);
  const [isLive, setIsLive] = useState(true); // Connection status
  
  const toggleGrid = () => setShowGrid(!showGrid);
  const toggleNavmesh = () => setShowNavmesh(!showNavmesh);
  const toggleNoclip = () => setNoclipMode(!noclipMode);
  const toggleFPS = () => setShowFPS(!showFPS);
  
  return {
    // State
    showGrid,
    exposure,
    showNavmesh,
    noclipMode,
    showFPS,
    isLive,
    
    // Actions
    toggleGrid,
    setExposure,
    toggleNavmesh,
    toggleNoclip,
    toggleFPS,
    setIsLive
  };
}

// FPS Counter Hook
export function useFPSCounter() {
  const [fps, setFPS] = useState(0);
  
  useFrame((_, delta) => {
    // Calculate FPS from delta time
    const currentFPS = Math.round(1 / delta);
    setFPS(currentFPS);
  });
  
  return fps;
}