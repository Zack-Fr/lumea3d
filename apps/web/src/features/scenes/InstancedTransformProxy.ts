import * as THREE from 'three';
import { useInstancingPoolStore } from '../../stores/instancingPoolStore';
import { log } from '../../utils/logger';

export interface InstancedTransformProxy {
  proxyObject: THREE.Object3D;
  itemId: string;
  assetId: string;
  instanceId: number;
  cleanup: () => void;
  syncFromPool: () => void;
  syncToPool: () => void;
}

export class InstancedTransformProxyManager {
  private proxies = new Map<string, InstancedTransformProxy>();

  createProxy(itemId: string, assetId: string): InstancedTransformProxy | null {
    const store = useInstancingPoolStore.getState();
    const pool = store.pools.get(assetId);
    
    if (!pool) {
      log('error', `❌ TransformProxy: Pool not found for asset ${assetId}`);
      return null;
    }
    
    const instanceId = pool.indexOf.get(itemId);
    const instance = pool.instances.get(itemId);
    
    if (instanceId === undefined || !instance) {
      log('error', `❌ TransformProxy: Instance ${itemId} not found in pool ${assetId}`);
      return null;
    }

    // Create a proxy object that mimics the instance's transform
    const proxyObject = new THREE.Object3D();
    proxyObject.name = `proxy-${itemId}`;
    
    // Set initial transform from instance data
    proxyObject.position.set(...instance.position);
    proxyObject.rotation.set(...instance.rotation);
    proxyObject.scale.set(...instance.scale);
    
    // Update world matrix
    proxyObject.updateMatrixWorld();
    
    // Make proxy object visible in scene (add a small helper geometry for debugging)
    const helperGeometry = new THREE.SphereGeometry(0.1);
    const helperMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      wireframe: true,
      opacity: 0.5,
      transparent: true
    });
    const helperMesh = new THREE.Mesh(helperGeometry, helperMaterial);
    proxyObject.add(helperMesh);
    
    const syncFromPool = () => {
      const currentPool = store.pools.get(assetId);
      const currentInstance = currentPool?.instances.get(itemId);
      
      if (currentInstance) {
        proxyObject.position.set(...currentInstance.position);
        proxyObject.rotation.set(...currentInstance.rotation);
        proxyObject.scale.set(...currentInstance.scale);
        proxyObject.updateMatrixWorld();
      }
    };
    
    const syncToPool = () => {
      const currentPool = store.pools.get(assetId);
      const currentInstanceId = currentPool?.indexOf.get(itemId);
      
      if (currentPool && currentInstanceId !== undefined) {
        // Extract transform from proxy object
        const position: [number, number, number] = [
          proxyObject.position.x,
          proxyObject.position.y,
          proxyObject.position.z
        ];
        
        const rotation: [number, number, number] = [
          proxyObject.rotation.x,
          proxyObject.rotation.y,
          proxyObject.rotation.z
        ];
        
        const scale: [number, number, number] = [
          proxyObject.scale.x,
          proxyObject.scale.y,
          proxyObject.scale.z
        ];
        
        // Update instance data
        store.updateInstance(assetId, itemId, {
          position,
          rotation,
          scale
        });
        
        log('debug', `🔄 TransformProxy: Synced proxy transform to pool for ${itemId}`, {
          position,
          rotation,
          scale
        });
      }
    };
    
    const cleanup = () => {
      this.proxies.delete(itemId);
      // proxyObject will be GC'd when references are removed
    };

    const proxy: InstancedTransformProxy = {
      proxyObject,
      itemId,
      assetId,
      instanceId,
      cleanup,
      syncFromPool,
      syncToPool
    };
    
    this.proxies.set(itemId, proxy);
    
    log('info', `✅ TransformProxy: Created proxy for instance ${itemId} in asset ${assetId}`);
    
    return proxy;
  }

  getProxy(itemId: string): InstancedTransformProxy | undefined {
    return this.proxies.get(itemId);
  }

  removeProxy(itemId: string): boolean {
    const proxy = this.proxies.get(itemId);
    if (proxy) {
      proxy.cleanup();
      return true;
    }
    return false;
  }

  // Update all proxies from their pools (useful after pool changes)
  syncAllProxiesFromPool() {
    this.proxies.forEach(proxy => proxy.syncFromPool());
  }

  // Update all pools from their proxies (useful before saving/API calls)
  syncAllProxiesToPool() {
    this.proxies.forEach(proxy => proxy.syncToPool());
  }

  cleanup() {
    this.proxies.forEach(proxy => proxy.cleanup());
    this.proxies.clear();
  }
}

// Global proxy manager instance
export const instancedTransformProxyManager = new InstancedTransformProxyManager();

// Hook for integrating with React components and selection system
export function useInstancedTransformProxy() {
  const createTransformProxy = (itemId: string, assetId: string) => {
    return instancedTransformProxyManager.createProxy(itemId, assetId);
  };

  const getTransformProxy = (itemId: string) => {
    return instancedTransformProxyManager.getProxy(itemId);
  };

  const removeTransformProxy = (itemId: string) => {
    return instancedTransformProxyManager.removeProxy(itemId);
  };

  const syncProxyToPool = (itemId: string) => {
    const proxy = instancedTransformProxyManager.getProxy(itemId);
    if (proxy) {
      proxy.syncToPool();
      return true;
    }
    return false;
  };

  return {
    createTransformProxy,
    getTransformProxy,
    removeTransformProxy,
    syncProxyToPool
  };
}

// Custom selection object wrapper for instanced meshes
export function createInstancedSelectionObject(
  itemId: string, 
  assetId: string,
  originalObject: THREE.Object3D,
  worldBbox?: THREE.Box3
): any {
  // Check if itemId is valid
  if (!itemId || itemId === 'undefined') {
    log('error', `❌ Invalid itemId for createInstancedSelectionObject: "${itemId}" (assetId: ${assetId})`);
    return null;
  }
  
  log('info', `🎯 Creating instanced selection object for itemId: ${itemId}, assetId: ${assetId}`);
  
  const proxy = instancedTransformProxyManager.createProxy(itemId, assetId);
  
  if (!proxy) {
    log('error', `❌ Failed to create transform proxy for ${itemId}`);
    return null;
  }

  // Add proxy object to scene graph (required for TransformControls)
  // We'll add it as a child of the original object's parent or scene root
  let sceneParent = originalObject.parent;
  while (sceneParent && sceneParent.parent && sceneParent.type !== 'Scene') {
    sceneParent = sceneParent.parent;
  }
  
  if (sceneParent) {
    sceneParent.add(proxy.proxyObject);
    log('info', `🎯 Added proxy object to scene graph under ${sceneParent.type}`);
  } else {
    log('warn', `⚠️ Could not find scene parent for proxy object`);
  }
  
  // Create a selection object that uses the proxy for transforms
  const selectionObject = {
    itemId,
    object: proxy.proxyObject, // Use proxy object for transforms
    originalObject, // Keep reference to original for other operations
    assetId,
    isInstancedMesh: true,
    worldBbox,
    
    // Custom methods for instanced mesh handling
    syncToPool: () => proxy.syncToPool(),
    syncFromPool: () => proxy.syncFromPool(),
    cleanup: () => {
      // Remove from scene graph when cleaning up
      if (proxy.proxyObject.parent) {
        proxy.proxyObject.parent.remove(proxy.proxyObject);
      }
      proxy.cleanup();
    }
  };

  // Set userData on proxy object for selection system compatibility
  proxy.proxyObject.userData = {
    itemId,
    category: originalObject.userData?.category || 'unknown',
    selectable: true,
    locked: false,
    meta: {
      ...originalObject.userData?.meta,
      isInstancedMesh: true,
      assetId,
      worldBbox
    }
  };

  log('info', `🎯 Created instanced selection object for ${itemId} with proxy`);

  return selectionObject;
}

// Integration with SelectionContext - update selection to handle instanced meshes
export function handleInstancedMeshSelection(
  intersection: THREE.Intersection,
  originalSelectObject: (object: THREE.Object3D) => void
) {
  const userData = intersection.object.userData;
  
  log('info', `🎯 handleInstancedMeshSelection called with userData:`, userData);
  
  if (userData?.meta?.isInstancedMesh && userData?.meta?.assetId) {
    const itemId = userData.itemId; // itemId is at root level
    const assetId = userData.meta.assetId;
    const worldBbox = userData.meta.worldBbox;
    
    // Additional validation
    if (!itemId || itemId === 'undefined') {
      log('error', `❌ handleInstancedMeshSelection: Invalid itemId "${itemId}" from userData.itemId`);
      log('error', `❌ Full userData structure:`, userData);
      // Fall back to regular selection
      originalSelectObject(intersection.object);
      return null;
    }
    
    log('info', `🎯 Handling instanced mesh selection for itemId: ${itemId}, assetId: ${assetId}`);
    
    // Create selection object with transform proxy
    const selectionObject = createInstancedSelectionObject(
      itemId, 
      assetId,
      intersection.object,
      worldBbox
    );
    
    if (selectionObject) {
      // Use the proxy object for transform controls
      originalSelectObject(selectionObject.object);
      return selectionObject;
    } else {
      log('error', `❌ Failed to create selection object, falling back to regular selection`);
      originalSelectObject(intersection.object);
      return null;
    }
  }
  
  // Fall back to regular selection for non-instanced meshes
  log('info', `🎯 Not an instanced mesh, using regular selection`);
  originalSelectObject(intersection.object);
  return null;
}
