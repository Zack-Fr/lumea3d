// src/stores/manifestStore.ts
import { createStore } from 'zustand/vanilla';
import { create } from 'zustand';

type ManifestState = {
  sceneId: string | null;
  manifest: any | null;
  set: (p: Partial<Pick<ManifestState, 'sceneId' | 'manifest'>>) => void;
  clear: () => void;
};

export const manifestStore = createStore<ManifestState>()((set) => ({
  sceneId: null,
  manifest: null,
  set: (p) => set(p),
  clear: () => set({ sceneId: null, manifest: null }),
}));

export const useManifestStore = create(manifestStore);