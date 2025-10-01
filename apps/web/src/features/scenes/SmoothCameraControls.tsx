import { useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { log } from '../../utils/logger';
import { Vector3, Euler, MathUtils } from 'three';
import { useSelection } from './SelectionContext';

interface CameraTransition {
  targetPosition: Vector3;
  targetRotation: Euler;
  targetZoom?: number;
  duration: number;
  easing: (t: number) => number;
  onComplete?: () => void;
}

interface SmoothCameraControlsProps {
  enabled: boolean;
}

// Easing functions for smooth transitions
const easingFunctions = {
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number) => t * t * t,
  linear: (t: number) => t
};

export function useSmoothCameraTransitions() {
  const { camera } = useThree();
  const { selection } = useSelection();
  const transitionRef = useRef<CameraTransition | null>(null);
  const startPosition = useRef<Vector3>(new Vector3());
  const startRotation = useRef<Euler>(new Euler());
  const startZoom = useRef<number>(1);
  const elapsedTime = useRef<number>(0);

  // Focus on selected object with smooth transition
  const focusOnSelected = useCallback((duration: number = 1.5) => {
    if (!selection.selectedObject) {
      console.warn('No object selected to focus on');
      return;
    }

    const targetObject = selection.selectedObject.object;
    
    // Calculate optimal camera distance based on object bounds
    const distance = 8; // Default distance for focused view

    // Get object world position
    const objectPosition = new Vector3();
    targetObject.getWorldPosition(objectPosition);

    // Calculate target camera position (offset from object)
    const targetPosition = objectPosition.clone().add(new Vector3(distance * 0.7, distance * 0.5, distance * 0.7));
    
    // Calculate target rotation to look at object
    const lookDirection = objectPosition.clone().sub(targetPosition).normalize();
    const targetRotation = new Euler();
    targetRotation.setFromQuaternion(camera.quaternion.clone().setFromUnitVectors(camera.getWorldDirection(new Vector3()), lookDirection));

    startTransition(targetPosition, targetRotation, undefined, duration, easingFunctions.easeInOut);
  }, [camera, selection.selectedObject]);

  // Reset to default view
  const resetView = useCallback((duration: number = 2.0) => {
    const defaultPosition = new Vector3(10, 8, 10);
    const defaultRotation = new Euler(-Math.PI / 6, Math.PI / 4, 0);
    
    startTransition(defaultPosition, defaultRotation, undefined, duration, easingFunctions.easeOut);
  }, []);

  // Smooth zoom to fit all objects
  const frameAll = useCallback((duration: number = 2.5) => {
    // TODO: Calculate scene bounds and optimal camera position
    const optimalPosition = new Vector3(15, 10, 15);
    const targetRotation = new Euler(-Math.PI / 8, Math.PI / 4, 0);
    
    startTransition(optimalPosition, targetRotation, undefined, duration, easingFunctions.easeInOut);
  }, []);

  // Top-down view for layout overview
  const topView = useCallback((duration: number = 1.5) => {
    const topPosition = new Vector3(0, 20, 0);
    const topRotation = new Euler(-Math.PI / 2, 0, 0);
    
    startTransition(topPosition, topRotation, undefined, duration, easingFunctions.easeOut);
  }, []);

  // Isometric view for technical viewing
  const isometricView = useCallback((duration: number = 1.5) => {
    const isoPosition = new Vector3(10, 10, 10);
    const isoRotation = new Euler(-Math.PI / 4, Math.PI / 4, 0);
    
    startTransition(isoPosition, isoRotation, undefined, duration, easingFunctions.easeOut);
  }, []);

  // Start a new camera transition
  const startTransition = useCallback((
    targetPosition: Vector3,
    targetRotation: Euler,
    targetZoom?: number,
    duration: number = 1.5,
    easing: (t: number) => number = easingFunctions.easeInOut,
    onComplete?: () => void
  ) => {
    // Store starting values
    startPosition.current.copy(camera.position);
    startRotation.current.copy(camera.rotation);
    startZoom.current = camera.zoom;
    elapsedTime.current = 0;

    // Set up transition
    transitionRef.current = {
      targetPosition: targetPosition.clone(),
      targetRotation: targetRotation.clone(),
      targetZoom,
      duration,
      easing,
      onComplete
    };

  log('info', `🎥 Starting camera transition to (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)}, ${targetPosition.z.toFixed(1)})`);
  }, [camera]);

  // Stop current transition
  const stopTransition = useCallback(() => {
    if (transitionRef.current) {
  log('info', '🛑 Camera transition stopped');
      transitionRef.current = null;
      elapsedTime.current = 0;
    }
  }, []);

  // Check if transition is active
  const isTransitioning = useCallback(() => {
    return transitionRef.current !== null;
  }, []);

  return {
    focusOnSelected,
    resetView,
    frameAll,
    topView,
    isometricView,
    startTransition,
    stopTransition,
    isTransitioning,
    // Current transition reference for the animation component
    transitionRef,
    startPosition,
    startRotation,
    startZoom,
    elapsedTime
  };
}

// Component that handles the actual camera animation
export function SmoothCameraControls({ enabled }: SmoothCameraControlsProps) {
  const { camera } = useThree();
  const { transitionRef, startPosition, startRotation, startZoom, elapsedTime } = useSmoothCameraTransitions();

  useFrame((_state, delta) => {
    if (!enabled || !transitionRef.current) {
      return;
    }

    const transition = transitionRef.current;
    elapsedTime.current += delta;
    
    // Calculate progress (0 to 1)
    const progress = Math.min(elapsedTime.current / transition.duration, 1);
    const easedProgress = transition.easing(progress);

    // Interpolate position
    camera.position.lerpVectors(startPosition.current, transition.targetPosition, easedProgress);
    
    // Interpolate rotation
    camera.rotation.x = MathUtils.lerp(startRotation.current.x, transition.targetRotation.x, easedProgress);
    camera.rotation.y = MathUtils.lerp(startRotation.current.y, transition.targetRotation.y, easedProgress);
    camera.rotation.z = MathUtils.lerp(startRotation.current.z, transition.targetRotation.z, easedProgress);

    // Interpolate zoom if specified
    if (transition.targetZoom !== undefined) {
      camera.zoom = MathUtils.lerp(startZoom.current, transition.targetZoom, easedProgress);
      camera.updateProjectionMatrix();
    }

    // Check if transition is complete
    if (progress >= 1) {
      // Ensure exact final values
      camera.position.copy(transition.targetPosition);
      camera.rotation.copy(transition.targetRotation);
      if (transition.targetZoom !== undefined) {
        camera.zoom = transition.targetZoom;
        camera.updateProjectionMatrix();
      }

      // Call completion callback
      if (transition.onComplete) {
        transition.onComplete();
      }

      // Clear transition
      transitionRef.current = null;
      elapsedTime.current = 0;
      
  log('info', '✅ Camera transition completed');
    }
  });

  return null;
}

// Camera transition status component
export function CameraTransitionStatus() {
  const { isTransitioning } = useSmoothCameraTransitions();

  if (!isTransitioning()) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          Camera transitioning...
        </div>
      </div>
    </div>
  );
}

export default SmoothCameraControls;