import { useState, useEffect, useRef, useCallback } from 'react';

interface ViewportMovement {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

interface ViewportControls {
  cameraMode: string;
  setCameraMode: (mode: string) => void;
  isWASDActive: boolean;
  setIsWASDActive: (active: boolean) => void;
  movement: ViewportMovement;
  viewportRef: React.RefObject<HTMLDivElement>;
  handleViewportClick: () => void;
}

export const useViewportControls = (onAchievement?: (message: string) => void): ViewportControls => {
  const [cameraMode, setCameraMode] = useState("orbit");
  const [isWASDActive, setIsWASDActive] = useState(false);
  const [movement, setMovement] = useState<ViewportMovement>({
    forward: false,
    backward: false,
    left: false,
    right: false
  });
  const viewportRef = useRef<HTMLDivElement>(null);

  // Handle WASD controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isWASDActive || !e.key) return;
      
      switch(e.key.toLowerCase()) {
        case 'w':
          setMovement(prev => ({ ...prev, forward: true }));
          break;
        case 'a':
          setMovement(prev => ({ ...prev, left: true }));
          break;
        case 's':
          setMovement(prev => ({ ...prev, backward: true }));
          break;
        case 'd':
          setMovement(prev => ({ ...prev, right: true }));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isWASDActive || !e.key) return;
      
      switch(e.key.toLowerCase()) {
        case 'w':
          setMovement(prev => ({ ...prev, forward: false }));
          break;
        case 'a':
          setMovement(prev => ({ ...prev, left: false }));
          break;
        case 's':
          setMovement(prev => ({ ...prev, backward: false }));
          break;
        case 'd':
          setMovement(prev => ({ ...prev, right: false }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isWASDActive]);

  const handleViewportClick = useCallback(() => {
    setIsWASDActive(true);
    if (viewportRef.current) {
      viewportRef.current.focus();
    }
    
    // Show achievement notification for first-time viewport activation
    if (!isWASDActive && onAchievement) {
      onAchievement("🎮 Viewport Activated! Use WASD to navigate");
    }
  }, [isWASDActive, onAchievement]);

  return {
    cameraMode,
    setCameraMode,
    isWASDActive,
    setIsWASDActive,
    movement,
    viewportRef,
    handleViewportClick
  };
};