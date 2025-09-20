// src/viewer/useScenePortal.tsx
import { useEffect, useRef } from 'react';
import { useSceneHost } from './SceneHost';

export function useScenePortal(factory: () => React.ReactNode, key: string) {
  const { mountElement, clear } = useSceneHost();
  const factoryRef = useRef(factory);
  
  // Update ref without causing re-render
  factoryRef.current = factory;

  useEffect(() => {
    mountElement(factoryRef.current());
    // once per key
    return () => clear();
  }, [key, mountElement, clear]); //only key matters for remounting
}