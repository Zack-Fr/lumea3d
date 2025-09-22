import React from 'react';
import { useFPS } from '../../../src/features/scenes/useViewerControls';
import type { ViewerControls } from './ViewerSidebar';

interface FPSTrackerProps {
  onFPSUpdate: (fps: number) => void;
  controls: ViewerControls;
}

/**
 * Component that tracks FPS inside the Canvas and reports it to parent
 * Must be used inside a Canvas component
 */
export function FPSTracker({ onFPSUpdate, controls }: FPSTrackerProps) {
  const fps = useFPS();

  // Update parent component with current FPS
  React.useEffect(() => {
    if (controls.showFPS) {
      onFPSUpdate(fps);
    }
  }, [fps, controls.showFPS, onFPSUpdate]);

  return null; // This component doesn't render anything visible
}