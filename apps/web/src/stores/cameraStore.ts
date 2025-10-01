// src/stores/cameraStore.ts
import { createStore } from 'zustand/vanilla';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

type Vec3 = [number, number, number];
type Pose = { p: Vec3; t: Vec3 };
type By = 'local' | 'remote' | 'init';

type CameraState = {
  pose: Pose;
  by: By;
  setPose: (pose: Pose, by?: By) => void;
};

export const cameraStore = createStore<CameraState>()(
  subscribeWithSelector((set) => ({
    pose: { p: [4, 2, 4], t: [0, 1, 0] },
    by: 'init' as const,
    setPose: (pose: Pose, by: By = 'local') => set({ pose, by }),
  }))
);

export const useCameraStore = create(cameraStore);