import * as THREE from 'three';
import { useInstancingPool } from '../instancing/useInstancingPool';

/**
 * Helper for computing per-instance bounding boxes correctly
 * Uses asset-local bbox transformed by instance matrix, not pool-wide bbox
 */
export class InstanceBoxHelper {
  private boxHelper: THREE.Box3Helper | null = null;
  private currentBox: THREE.Box3 | null = null;
  
  constructor(
    private scene: THREE.Scene,
    private color: THREE.Color = new THREE.Color(0x00ff00)
  ) {}
  
  /**
   * Show bounding box for a specific instance
   */
  showForInstance(assetId: string, index: number): THREE.Box3 | null {
    const { instanceWorldBox } = useInstancingPool.getState();
    
    // Get the world bounding box for this specific instance
    const worldBox = instanceWorldBox(assetId, index);
    
    if (!worldBox || worldBox.isEmpty()) {
      console.warn(`⚠️ Could not compute bounding box for instance ${index} in asset ${assetId}`);
      this.hide();
      return null;
    }
    
    // Remove old helper
    this.hide();
    
    // Create new helper
    this.currentBox = worldBox;
    this.boxHelper = new THREE.Box3Helper(worldBox, this.color);
    this.boxHelper.name = `instance-box-helper-${assetId}-${index}`;
    
    // Add to scene
    this.scene.add(this.boxHelper);
    
    console.log(`📦 Showing bounding box for instance ${index} in asset ${assetId}:`, {
      min: worldBox.min.toArray(),
      max: worldBox.max.toArray(),
      size: worldBox.getSize(new THREE.Vector3()).toArray(),
      center: worldBox.getCenter(new THREE.Vector3()).toArray()
    });
    
    return worldBox;
  }
  
  /**
   * Update the bounding box for the current instance (call during transforms)
   */
  updateForInstance(assetId: string, index: number): void {
    if (!this.boxHelper) return;
    
    const { instanceWorldBox } = useInstancingPool.getState();
    const worldBox = instanceWorldBox(assetId, index);
    
    if (!worldBox || worldBox.isEmpty()) return;
    
    // Remove old helper
    this.hide();
    
    // Create new helper with updated box - this is more reliable than trying to update geometry
    this.currentBox = worldBox;
    this.boxHelper = new THREE.Box3Helper(worldBox, this.color);
    this.boxHelper.name = `instance-box-helper-${assetId}-${index}`;
    
    // Add to scene
    this.scene.add(this.boxHelper);
  }
  
  /**
   * Hide the bounding box helper
   */
  hide(): void {
    if (this.boxHelper && this.boxHelper.parent) {
      this.boxHelper.parent.remove(this.boxHelper);
      this.boxHelper.geometry?.dispose();
      this.boxHelper = null;
    }
    this.currentBox = null;
  }
  
  /**
   * Get the current bounding box
   */
  getCurrentBox(): THREE.Box3 | null {
    return this.currentBox;
  }
  
  /**
   * Check if helper is currently showing
   */
  isShowing(): boolean {
    return this.boxHelper !== null;
  }
  
  /**
   * Set the color of the bounding box
   */
  setColor(color: THREE.Color): void {
    this.color = color;
    if (this.boxHelper && this.boxHelper.material instanceof THREE.LineBasicMaterial) {
      this.boxHelper.material.color.copy(color);
    }
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    this.hide();
  }
}

/**
 * React hook for using the instance box helper
 */
export function useInstanceBoxHelper(scene: THREE.Scene, color?: THREE.Color) {
  const helper = new InstanceBoxHelper(scene, color);
  
  return {
    showForInstance: (assetId: string, index: number) => helper.showForInstance(assetId, index),
    updateForInstance: (assetId: string, index: number) => helper.updateForInstance(assetId, index),
    hide: () => helper.hide(),
    getCurrentBox: () => helper.getCurrentBox(),
    isShowing: () => helper.isShowing(),
    setColor: (color: THREE.Color) => helper.setColor(color),
    dispose: () => helper.dispose()
  };
}