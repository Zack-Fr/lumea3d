/**
 * Mesh Validation System
 * 
 * Proactively detects when meshes disappear from the viewport and attempts recovery.
 * This helps prevent the "mesh disappearing" issue by monitoring and validating
 * mesh states continuously.
 */

import { Object3D, Scene, Mesh, InstancedMesh } from 'three';

export interface MeshValidationConfig {
  checkInterval: number; // How often to validate meshes (ms)
  maxMissingFrames: number; // How many frames a mesh can be missing before recovery
  enableAutoRecovery: boolean; // Whether to automatically attempt recovery
  logLevel: 'none' | 'errors' | 'warnings' | 'info'; // Logging level
}

export interface MeshState {
  id: string;
  type: 'mesh' | 'instancedMesh' | 'group';
  visible: boolean;
  instanceCount?: number;
  lastSeen: number;
  missingFrames: number;
  geometry: {
    hasVertices: boolean;
    vertexCount: number;
    hasIndices: boolean;
    indexCount: number;
  };
  material: {
    isValid: boolean;
    type: string;
    hasTextures: boolean;
  };
}

export interface ValidationResult {
  totalMeshes: number;
  validMeshes: number;
  invisibleMeshes: number;
  corruptedMeshes: number;
  missingGeometry: number;
  missingMaterials: number;
  issues: string[];
  recoveryActions: string[];
}

class MeshValidationSystem {
  private config: MeshValidationConfig = {
    checkInterval: 2000, // Check every 2 seconds
    maxMissingFrames: 3, // Allow 3 missing frames before recovery
    enableAutoRecovery: true,
    logLevel: 'warnings'
  };
  
  private meshStates = new Map<string, MeshState>();
  private validationTimer: number | null = null;
  private isValidating = false;
  private scene: Scene | null = null;
  private recoveryCallbacks = new Set<() => void>();
  
  configure(config: Partial<MeshValidationConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('info', '🔍 Mesh validation system configured:', this.config);
  }
  
  startValidation(scene: Scene): void {
    this.scene = scene;
    this.stopValidation(); // Stop any existing validation
    
    this.validationTimer = setInterval(() => {
      if (!this.isValidating) {
        this.validateMeshes();
      }
    }, this.config.checkInterval);
    
    this.log('info', '🔍 Mesh validation system started');
  }
  
  stopValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = null;
    }
    this.isValidating = false;
    this.log('info', '🔍 Mesh validation system stopped');
  }
  
  addRecoveryCallback(callback: () => void): void {
    this.recoveryCallbacks.add(callback);
  }
  
  removeRecoveryCallback(callback: () => void): void {
    this.recoveryCallbacks.delete(callback);
  }
  
  private async validateMeshes(): Promise<ValidationResult> {
    if (!this.scene || this.isValidating) {
      return this.createEmptyResult();
    }
    
    this.isValidating = true;
    const startTime = performance.now();
    
    try {
      const result: ValidationResult = {
        totalMeshes: 0,
        validMeshes: 0,
        invisibleMeshes: 0,
        corruptedMeshes: 0,
        missingGeometry: 0,
        missingMaterials: 0,
        issues: [],
        recoveryActions: []
      };
      
      const currentMeshIds = new Set<string>();
      
      // Traverse the scene to find all meshes
      this.scene.traverse((object: Object3D) => {
        if (this.isMeshObject(object)) {
          result.totalMeshes++;
          const meshId = this.generateMeshId(object);
          currentMeshIds.add(meshId);
          
          const meshState = this.validateMeshObject(object, meshId);
          this.meshStates.set(meshId, meshState);
          
          // Categorize the mesh
          if (meshState.visible) {
            result.validMeshes++;
          } else {
            result.invisibleMeshes++;
            result.issues.push(`Mesh ${meshId} is invisible`);
          }
          
          if (!meshState.geometry.hasVertices) {
            result.missingGeometry++;
            result.issues.push(`Mesh ${meshId} has no geometry vertices`);
          }
          
          if (!meshState.material.isValid) {
            result.missingMaterials++;
            result.issues.push(`Mesh ${meshId} has invalid material`);
          }
          
          // Check for corruption indicators
          if (this.isMeshCorrupted(meshState)) {
            result.corruptedMeshes++;
            result.issues.push(`Mesh ${meshId} appears corrupted`);
          }
        }
      });
      
      // Check for disappeared meshes
      for (const [meshId, meshState] of this.meshStates.entries()) {
        if (!currentMeshIds.has(meshId)) {
          meshState.missingFrames++;
          meshState.lastSeen = Date.now();
          
          if (meshState.missingFrames > this.config.maxMissingFrames) {
            result.issues.push(`Mesh ${meshId} has disappeared (${meshState.missingFrames} missing frames)`);
            
            if (this.config.enableAutoRecovery) {
              result.recoveryActions.push(`Triggering recovery for disappeared mesh ${meshId}`);
              this.triggerRecovery();
            }
          }
        } else {
          // Reset missing frames counter if mesh is found
          meshState.missingFrames = 0;
        }
      }
      
      // Clean up old mesh states
      for (const [meshId, meshState] of this.meshStates.entries()) {
        if (Date.now() - meshState.lastSeen > 30000) { // Remove after 30 seconds
          this.meshStates.delete(meshId);
        }
      }
      
      const duration = performance.now() - startTime;
      
      // Log results based on configuration
      if (result.issues.length > 0) {
        this.log('warnings', '⚠️ Mesh validation found issues:', {
          summary: this.summarizeResult(result),
          issues: result.issues.slice(0, 5), // Show first 5 issues
          duration: `${duration.toFixed(1)}ms`
        });
      } else if (this.config.logLevel === 'info') {
        this.log('info', '✅ Mesh validation passed:', {
          summary: this.summarizeResult(result),
          duration: `${duration.toFixed(1)}ms`
        });
      }
      
      return result;
    } catch (error) {
      this.log('errors', '❌ Mesh validation error:', error);
      return this.createEmptyResult();
    } finally {
      this.isValidating = false;
    }
  }
  
  private isMeshObject(object: Object3D): boolean {
    return object instanceof Mesh || object instanceof InstancedMesh || 
           (object.children.length > 0 && object.type === 'Group');
  }
  
  private generateMeshId(object: Object3D): string {
    // Create a unique ID based on object properties
    const base = `${object.type}_${object.uuid}`;
    if (object.name) {
      return `${base}_${object.name}`;
    }
    return base;
  }
  
  private validateMeshObject(object: Object3D, meshId: string): MeshState {
    const now = Date.now();
    const existing = this.meshStates.get(meshId);
    
    const meshState: MeshState = {
      id: meshId,
      type: object instanceof InstancedMesh ? 'instancedMesh' : 
            object instanceof Mesh ? 'mesh' : 'group',
      visible: object.visible,
      lastSeen: now,
      missingFrames: existing ? existing.missingFrames : 0,
      geometry: this.validateGeometry(object),
      material: this.validateMaterial(object)
    };
    
    if (object instanceof InstancedMesh) {
      meshState.instanceCount = object.count;
    }
    
    return meshState;
  }
  
  private validateGeometry(object: Object3D): MeshState['geometry'] {
    if (object instanceof Mesh || object instanceof InstancedMesh) {
      const geometry = object.geometry;
      const hasVertices = geometry && geometry.attributes.position && 
                         geometry.attributes.position.count > 0;
      const vertexCount = hasVertices ? geometry.attributes.position.count : 0;
      const hasIndices = geometry && geometry.index && geometry.index.count > 0;
      const indexCount = hasIndices ? geometry.index.count : 0;
      
      return {
        hasVertices,
        vertexCount,
        hasIndices,
        indexCount
      };
    }
    
    return {
      hasVertices: true, // Groups don't have geometry
      vertexCount: 0,
      hasIndices: false,
      indexCount: 0
    };
  }
  
  private validateMaterial(object: Object3D): MeshState['material'] {
    if (object instanceof Mesh || object instanceof InstancedMesh) {
      const material = object.material;
      const isValid = !!material && typeof material === 'object';
      const type = material ? material.type : 'None';
      
      let hasTextures = false;
      if (material && 'map' in material) {
        hasTextures = !!(material as any).map;
      }
      
      return {
        isValid,
        type,
        hasTextures
      };
    }
    
    return {
      isValid: true, // Groups don't have materials
      type: 'Group',
      hasTextures: false
    };
  }
  
  private isMeshCorrupted(meshState: MeshState): boolean {
    // Check for corruption indicators
    return (!meshState.geometry.hasVertices && meshState.type !== 'group') ||
           (!meshState.material.isValid && meshState.type !== 'group') ||
           (meshState.type === 'instancedMesh' && (!meshState.instanceCount || meshState.instanceCount <= 0));
  }
  
  private triggerRecovery(): void {
    this.log('warnings', '🔄 Triggering mesh recovery callbacks');
    
    for (const callback of this.recoveryCallbacks) {
      try {
        callback();
      } catch (error) {
        this.log('errors', '❌ Recovery callback failed:', error);
      }
    }
  }
  
  private summarizeResult(result: ValidationResult): string {
    return `${result.validMeshes}/${result.totalMeshes} valid, ` +
           `${result.invisibleMeshes} invisible, ` +
           `${result.corruptedMeshes} corrupted, ` +
           `${result.issues.length} issues`;
  }
  
  private createEmptyResult(): ValidationResult {
    return {
      totalMeshes: 0,
      validMeshes: 0,
      invisibleMeshes: 0,
      corruptedMeshes: 0,
      missingGeometry: 0,
      missingMaterials: 0,
      issues: [],
      recoveryActions: []
    };
  }
  
  private log(level: MeshValidationConfig['logLevel'], message: string, data?: any): void {
    if (this.config.logLevel === 'none') return;
    
    const shouldLog = 
      (level === 'errors') ||
      (level === 'warnings' && ['warnings', 'info'].includes(this.config.logLevel)) ||
      (level === 'info' && this.config.logLevel === 'info');
    
    if (shouldLog) {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }
  
  // Public API for manual validation
  async validateNow(): Promise<ValidationResult> {
    return this.validateMeshes();
  }
  
  getMeshStates(): Map<string, MeshState> {
    return new Map(this.meshStates);
  }
  
  getConfig(): MeshValidationConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const meshValidationSystem = new MeshValidationSystem();
export default meshValidationSystem;