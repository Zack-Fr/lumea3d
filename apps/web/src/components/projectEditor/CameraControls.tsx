import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ViewportMovement } from '../../types/projectEditor';
import { useSelection } from '../../features/scenes/SelectionContext';
import * as THREE from 'three';

interface CameraControlsProps {
  cameraMode: string;
  isWASDActive: boolean;
  movement: ViewportMovement;
  minDistance?: number;
  maxDistance?: number;
  moveSpeed?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
}

const CameraControlsComponent: React.FC<CameraControlsProps> = ({ 
  cameraMode, 
  isWASDActive, 
  movement,
  minDistance = 0.1,
  maxDistance = 500,
  moveSpeed: propMoveSpeed = 5,
  enablePan = true,
  enableZoom = true,
  enableRotate = true
}) => {
  const { camera, gl } = useThree();
  const { selection } = useSelection();
  const orbitControlsRef = useRef<any>();
  const moveSpeed = propMoveSpeed;
  const velocity = useRef(new THREE.Vector3());
  
  // FPS camera controls with WASD
  useFrame((state, delta) => {
    if (cameraMode === 'fps' && isWASDActive) {
      const camera = state.camera;
      const direction = new THREE.Vector3();
      const right = new THREE.Vector3();
      
      // Get camera direction vectors
      camera.getWorldDirection(direction);
      right.crossVectors(direction, camera.up).normalize();
      
      // Reset velocity
      velocity.current.set(0, 0, 0);
      
      // Apply movement based on WASD input
      if (movement.forward) {
        velocity.current.add(direction.clone().multiplyScalar(moveSpeed * delta));
      }
      if (movement.backward) {
        velocity.current.add(direction.clone().multiplyScalar(-moveSpeed * delta));
      }
      if (movement.left) {
        velocity.current.add(right.clone().multiplyScalar(-moveSpeed * delta));
      }
      if (movement.right) {
        velocity.current.add(right.clone().multiplyScalar(moveSpeed * delta));
      }
      
      // Apply velocity to camera position
      camera.position.add(velocity.current);
    }
  });

  // Disable orbit controls when in FPS mode, WASD is active, or transform is active
  useEffect(() => {
    if (orbitControlsRef.current) {
      const shouldDisable = (cameraMode === 'fps' && isWASDActive) || selection.isTransforming;
      orbitControlsRef.current.enabled = !shouldDisable;
    }
  }, [cameraMode, isWASDActive, selection.isTransforming]);

  if (cameraMode === 'fps') {
    return (
      <>
        {/* Orbit controls for when WASD is not active */}
        <OrbitControls
          ref={orbitControlsRef}
          args={[camera, gl.domElement]}
          enabled={!isWASDActive}
          enablePan={enablePan}
          enableZoom={enableZoom}
          enableRotate={enableRotate}
          maxPolarAngle={Math.PI * 0.95}
          minPolarAngle={0.05}
          minDistance={minDistance}
          maxDistance={maxDistance}
          dampingFactor={0.05}
          enableDamping={true}
          rotateSpeed={0.8}
          panSpeed={0.8}
          zoomSpeed={1.0}
          target={[0, 0, 0]}
        />
      </>
    );
  }

  // Orbit mode (default)
  return (
    <OrbitControls
      ref={orbitControlsRef}
      args={[camera, gl.domElement]}
      enablePan={enablePan}
      enableZoom={enableZoom}
      enableRotate={enableRotate}
      maxPolarAngle={Math.PI * 0.95} // Allow more vertical rotation
      minPolarAngle={0.05} // Prevent going completely upside down
      minDistance={minDistance}
      maxDistance={maxDistance}
      autoRotate={false}
      dampingFactor={0.05} // Smooth camera movement
      enableDamping={true}
      rotateSpeed={0.8} // More natural rotation speed
      panSpeed={0.8}
      zoomSpeed={1.0}
      target={[0, 0, 0]} // Look at scene center
    />
  );
};

export default CameraControlsComponent;
