// src/viewer/useScenePortal.tsx
import { useEffect } from 'react';
import { useSceneHost } from './SceneHost';

export function useScenePortal(factory: () => React.ReactNode, key: string) {
  const { mountElement, clear } = useSceneHost();

  useEffect(() => {
    mountElement(factory());
    // once per key
    return () => clear();
  }, [key, factory, mountElement, clear]); // ✅ only key matters for remounting
}