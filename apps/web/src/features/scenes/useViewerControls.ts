import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Hook to track FPS (Frames Per Second) in React Three Fiber
 */
export function useFPS() {
  const [fps, setFPS] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    const delta = now - lastTime.current;

    // Update FPS every second
    if (delta >= 1000) {
      const currentFPS = (frameCount.current * 1000) / delta;
      setFPS(currentFPS);
      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  return fps;
}

/**
 * Hook to manage viewer controls state
 */
export function useViewerControls() {
  const [controls, setControls] = useState({
    showGrid: true,
    exposure: 1.0,
    showNavMesh: false,
    noclipMode: false,
    showFPS: true,
    isConnected: false, // TODO: Connect to real-time status
  });

  const updateControls = (updates: Partial<typeof controls>) => {
    setControls(prev => ({ ...prev, ...updates }));
  };

  // Simulate connection status (replace with real connection logic)
  useEffect(() => {
    const interval = setInterval(() => {
      setControls(prev => ({ 
        ...prev, 
        isConnected: Math.random() > 0.1 // 90% connected simulation
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    controls,
    updateControls,
  };
}