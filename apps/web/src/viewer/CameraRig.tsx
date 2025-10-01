// src/viewer/CameraRig.tsx
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { cameraStore } from '../stores/cameraStore';

const rafThrottle = <T extends (...a: any[]) => void>(fn: T) => {
  let ticking = false;
  return ((...args: any[]) => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      fn(...args);
    });
  }) as T;
};

export function CameraRig({ sceneId }: { sceneId: string }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Apply pose once per scene
  useEffect(() => {
    const { pose } = cameraStore.getState();
    camera.position.set(...pose.p);
    camera.lookAt(...pose.t);
    camera.updateProjectionMatrix();
    cameraStore.setState({ by: 'local' });
  }, [sceneId, camera]);

  // Follow remote updates only
  useEffect(() => {
    const unsub = cameraStore.subscribe((s) => s, ({ pose, by }) => {
      if (by !== 'remote') return;
      camera.position.set(...pose.p);
      camera.lookAt(...pose.t);
      camera.updateProjectionMatrix();
    });
    return () => unsub();
  }, [camera]);

  // Controls → store (local), throttled
  useEffect(() => {
    const c = controlsRef.current;
    const onChange = rafThrottle(() => {
      const p = camera.position.toArray() as [number, number, number];
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const t: [number, number, number] = [p[0] + dir.x, p[1] + dir.y, p[2] + dir.z];
      cameraStore.setState({ pose: { p, t }, by: 'local' });
    });
    c?.addEventListener('change', onChange);
    c?.addEventListener('end', onChange);
    return () => {
      c?.removeEventListener('change', onChange);
      c?.removeEventListener('end', onChange);
    };
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.1}
    />
  );
}