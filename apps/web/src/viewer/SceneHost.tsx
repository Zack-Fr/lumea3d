// src/viewer/SceneHost.tsx
import React, { useState, useCallback } from 'react';

interface SceneHostState {
  element: React.ReactNode | null;
}

// Global scene host state
let sceneHostState: SceneHostState = { element: null };
let subscribers: Set<() => void> = new Set();

const notifySubscribers = () => {
  subscribers.forEach(callback => callback());
};

export function useSceneHost() {
  const [, forceUpdate] = useState({});

  React.useEffect(() => {
    const rerender = () => forceUpdate({});
    subscribers.add(rerender);
    return () => {
      subscribers.delete(rerender);
    };
  }, []);

  const mountElement = useCallback((element: React.ReactNode) => {
    sceneHostState.element = element;
    notifySubscribers();
  }, []);

  const clear = useCallback(() => {
    sceneHostState.element = null;
    notifySubscribers();
  }, []);

  return {
    mountElement,
    clear,
    element: sceneHostState.element
  };
}

export function SceneHost() {
  const { element } = useSceneHost();
  return element ? <>{element}</> : null;
}