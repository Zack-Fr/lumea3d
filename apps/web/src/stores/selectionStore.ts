// src/stores/selectionStore.ts
import { createStore } from 'zustand/vanilla';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type Selected = null | { 
  assetId: string; 
  itemId: string; 
  index?: number;
  object?: any; // Three.js Object3D
  category?: string;
  originalPosition?: any;
  originalRotation?: any;
  originalScale?: any;
};

type SelectionState = {
  selected: Selected;
  transformMode: 'translate' | 'rotate' | 'scale';
  isTransforming: boolean;
  set: (s: Selected) => void;
  clear: () => void;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  setIsTransforming: (transforming: boolean) => void;
};

export const selectionStore = createStore<SelectionState>()(
  subscribeWithSelector((set) => ({
    selected: null,
    transformMode: 'translate' as const,
    isTransforming: false,
    set: (s: Selected) => set({ selected: s }),
    clear: () => set({ selected: null, isTransforming: false }),
    setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => set({ transformMode: mode }),
    setIsTransforming: (transforming: boolean) => set({ isTransforming: transforming }),
  }))
);

export const useSelectionStore = create(selectionStore);