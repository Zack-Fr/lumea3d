import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ViewportMovement } from '../../types/projectEditor';
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

  // Disable orbit controls when in FPS mode and WASD is active
  useEffect(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = !(cameraMode === 'fps' && isWASDActive);
    }
  }, [cameraMode, isWASDActive]);

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
          maxPolarAngle={Math.PI * 0.9}
          minDistance={minDistance}
          maxDistance={maxDistance}
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
      maxPolarAngle={Math.PI * 0.9}
      minDistance={minDistance}
      maxDistance={maxDistance}
      autoRotate={false}
      autoRotateSpeed={0.5}
    />
  );
};

export default CameraControlsComponent;
