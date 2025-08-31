import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Euler, Raycaster, Object3D } from 'three';
import type { ViewerControls } from './ViewerSidebar';

interface FPSControlsProps {
  controls: ViewerControls;
  spawnPosition: [number, number, number];
}

interface MovementState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

interface MouseLookState {
  isLocked: boolean;
  yaw: number;
  pitch: number;
}

export function FPSControls({ controls, spawnPosition }: FPSControlsProps) {
  const { camera, gl } = useThree();
  
  // Movement state
  const movementRef = useRef<MovementState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false
  });
  
  // Mouse look state
  const mouseLookRef = useRef<MouseLookState>({
    isLocked: false,
    yaw: 0,
    pitch: 0
  });
  
  // Camera velocity and physics
  const velocityRef = useRef(new Vector3());
  const directionRef = useRef(new Vector3());
  const raycasterRef = useRef(new Raycaster());
  
  // Configuration
  const MOVE_SPEED = 5.0;
  const SPRINT_SPEED = 10.0;
  const MOUSE_SENSITIVITY = 0.002;
  const GRAVITY = -9.8;
  const JUMP_VELOCITY = 6.0;
  const GROUND_CHECK_DISTANCE = 1.8;
  
  // Ground state
  const [isGrounded, setIsGrounded] = useState(true);
  
  // Initialize camera position
  useEffect(() => {
    camera.position.set(...spawnPosition);
    camera.rotation.set(0, 0, 0);
    console.log('🎮 FPS Controls initialized at spawn:', spawnPosition);
  }, [camera, spawnPosition]);
  
  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          movementRef.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          movementRef.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          movementRef.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          movementRef.current.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          movementRef.current.sprint = true;
          break;
        case 'Space':
          event.preventDefault();
          // Jump logic (if grounded and not noclip)
          if (isGrounded && !controls.noclipMode) {
            velocityRef.current.y = JUMP_VELOCITY;
            setIsGrounded(false);
          }
          break;
        case 'Escape':
          // Exit pointer lock
          if (mouseLookRef.current.isLocked) {
            document.exitPointerLock();
          }
          break;
      }
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          movementRef.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          movementRef.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          movementRef.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          movementRef.current.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          movementRef.current.sprint = false;
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isGrounded, controls.noclipMode]);
  
  // Pointer lock event handlers
  useEffect(() => {
    const canvas = gl.domElement;
    
    const handleClick = () => {
      if (!mouseLookRef.current.isLocked) {
        canvas.requestPointerLock();
      }
    };
    
    const handlePointerLockChange = () => {
      mouseLookRef.current.isLocked = document.pointerLockElement === canvas;
      console.log('🔒 Pointer lock:', mouseLookRef.current.isLocked ? 'ENABLED' : 'DISABLED');
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!mouseLookRef.current.isLocked) return;
      
      const { movementX, movementY } = event;
      
      // Update yaw (horizontal rotation)
      mouseLookRef.current.yaw -= movementX * MOUSE_SENSITIVITY;
      
      // Update pitch (vertical rotation) with limits
      mouseLookRef.current.pitch -= movementY * MOUSE_SENSITIVITY;
      mouseLookRef.current.pitch = Math.max(
        -Math.PI / 2 + 0.1, 
        Math.min(Math.PI / 2 - 0.1, mouseLookRef.current.pitch)
      );
    };
    
    canvas.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      canvas.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gl]);
  
  // Ground check for collision detection
  const checkGrounded = (position: Vector3, scene: Object3D) => {
    if (controls.noclipMode) {
      setIsGrounded(true);
      return true;
    }
    
    raycasterRef.current.set(position, new Vector3(0, -1, 0));
    const intersects = raycasterRef.current.intersectObjects(scene.children, true);
    
    const grounded = intersects.length > 0 && intersects[0].distance < GROUND_CHECK_DISTANCE;
    setIsGrounded(grounded);
    return grounded;
  };
  
  // Main movement loop
  useFrame((state, delta) => {
    const movement = movementRef.current;
    const mouseLook = mouseLookRef.current;
    const velocity = velocityRef.current;
    const direction = directionRef.current;
    
    // Apply mouse look rotation
    camera.rotation.set(mouseLook.pitch, mouseLook.yaw, 0);
    
    // Calculate movement direction
    direction.set(0, 0, 0);
    
    if (movement.forward) direction.z -= 1;
    if (movement.backward) direction.z += 1;
    if (movement.left) direction.x -= 1;
    if (movement.right) direction.x += 1;
    
    // Normalize diagonal movement
    if (direction.length() > 0) {
      direction.normalize();
    }
    
    // Transform direction to camera space (only yaw, not pitch)
    const cameraDirection = direction.clone();
    cameraDirection.applyEuler(new Euler(0, mouseLook.yaw, 0));
    
    // Apply movement speed
    const currentSpeed = movement.sprint ? SPRINT_SPEED : MOVE_SPEED;
    cameraDirection.multiplyScalar(currentSpeed * delta);
    
    // Apply gravity and physics (only if not in noclip mode)
    if (!controls.noclipMode) {
      // Gravity
      velocity.y += GRAVITY * delta;
      
      // Ground collision
      const wasGrounded = isGrounded;
      const grounded = checkGrounded(camera.position, state.scene);
      
      if (grounded && velocity.y <= 0) {
        velocity.y = 0;
        if (!wasGrounded) {
          console.log('🚶 Landed on ground');
        }
      }
      
      // Apply vertical velocity
      cameraDirection.y += velocity.y * delta;
    } else {
      // In noclip mode, allow vertical movement with shift/space
      if (movement.sprint) cameraDirection.y += currentSpeed * delta; // Shift = up
      // Note: Space for down could be added here if needed
    }
    
    // Apply final movement
    camera.position.add(cameraDirection);
    
    // Log movement for debugging (only when moving)
    if (cameraDirection.length() > 0.001) {
      console.log('🚶 Player position:', {
        x: camera.position.x.toFixed(2),
        y: camera.position.y.toFixed(2),
        z: camera.position.z.toFixed(2),
        noclip: controls.noclipMode,
        grounded: isGrounded
      });
    }
  });
  
  return null; // This component doesn't render anything visible
}