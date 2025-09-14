import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as THREE from 'three';
import { useInstancingPool } from '../instancing/useInstancingPool';

export interface InstancedSelection {
  assetId: string;
  index: number;
  itemId: string;
}

interface SelectionState {
  selection: InstancedSelection | null;
  transformMode: 'translate' | 'rotate' | 'scale';
  isTransforming: boolean;
  
  // Actions
  selectInstance: (assetId: string, index: number, itemId: string) => void;
  deselect: () => void;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  setIsTransforming: (transforming: boolean) => void;
}

export const useSelection = create<SelectionState>()(
  subscribeWithSelector((set) => ({
    selection: null,
    transformMode: 'translate',
    isTransforming: false,
    
    selectInstance: (assetId: string, index: number, itemId: string) => {
      console.log(`🎯 Selecting instance: assetId=${assetId}, index=${index}, itemId=${itemId}`);
      
      set({
        selection: { assetId, index, itemId },
        isTransforming: false
      });
    },
    
    deselect: () => {
      console.log('🎯 Deselecting instance');
      set({
        selection: null,
        isTransforming: false
      });
    },
    
    setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => {
      console.log(`🔧 Transform mode changed to: ${mode}`);
      set({ transformMode: mode });
    },
    
    setIsTransforming: (transforming: boolean) => {
      set({ isTransforming: transforming });
    }
  }))
);

/**
 * Handle picking from raycast intersection
 * Extract assetId, instanceId, and map to real itemId
 */
export function handleInstancedMeshPick(intersection: THREE.Intersection): InstancedSelection | null {
  const mesh = intersection.object as THREE.InstancedMesh;
  const instanceId = intersection.instanceId;
  
  if (instanceId === undefined || instanceId === null) {
    console.warn('⚠️ No instanceId in intersection');
    return null;
  }
  
  // Get assetId from mesh userData
  const assetId = mesh.userData?.assetId;
  if (!assetId) {
    console.warn('⚠️ No assetId in mesh userData');
    return null;
  }
  
  // Get pool and map instanceId to itemId
  const { getPool } = useInstancingPool.getState();
  const pool = getPool(assetId);
  
  if (!pool) {
    console.warn(`⚠️ Pool not found for assetId: ${assetId}`);
    return null;
  }
  
  if (instanceId >= pool.ids.length || instanceId < 0) {
    console.warn(`⚠️ Invalid instanceId ${instanceId} for pool with ${pool.ids.length} instances`);
    return null;
  }
  
  const itemId = pool.ids[instanceId];
  if (!itemId) {
    console.warn(`⚠️ No itemId found at index ${instanceId}`);
    return null;
  }
  
  console.log(`🎯 Mapped raycast to selection:`, {
    assetId,
    instanceId,
    itemId,
    poolSize: pool.ids.length
  });
  
  return {
    assetId,
    index: instanceId,
    itemId
  };
}

// PickHandler removed - event handling is done directly in InstancedRenderer
