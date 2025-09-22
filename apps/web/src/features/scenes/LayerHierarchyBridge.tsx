import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface LayerNode {
  id: string;
  name: string;
  type: 'parent' | 'submesh';
  parentId?: string;
  itemId: string;
  object: THREE.Object3D;
  children?: LayerNode[];
  visible: boolean;
}

// Global state to share layer data across components
let globalLayerData: LayerNode[] = [];
const layerDataSubscribers: Array<(layers: LayerNode[]) => void> = [];

export function subscribeToLayerData(callback: (layers: LayerNode[]) => void) {
  layerDataSubscribers.push(callback);
  return () => {
    const index = layerDataSubscribers.indexOf(callback);
    if (index > -1) {
      layerDataSubscribers.splice(index, 1);
    }
  };
}

function notifyLayerDataSubscribers(layers: LayerNode[]) {
  globalLayerData = layers;
  layerDataSubscribers.forEach(callback => callback(layers));
}

export function getGlobalLayerData() {
  return globalLayerData;
}

// Component that runs inside Canvas and updates global layer data
export function LayerHierarchyBridge() {
  const { scene } = useThree();
  const [, setUpdateTrigger] = useState(0);

  // Scan scene for objects and build hierarchy
  const scanSceneObjects = () => {
    const layerNodes: LayerNode[] = [];
    const processedItems = new Set<string>();

    scene.traverse((object) => {
      // Skip debug objects, ground plane, grid system, helpers, and other utility objects
      if (!object.userData?.itemId || 
          object.userData?.meta?.isDebug || 
          object.userData?.isHelper ||
          object.name === 'ground-plane' ||
          object.name?.includes('debug') ||
          object.name?.includes('grid') ||
          object.name?.includes('-helper')) {
        return;
      }

      // Look for parent objects with itemId that haven't been processed
      if (!processedItems.has(object.userData.itemId)) {
        const itemId = object.userData.itemId;
        
        // Get the proper name from metadata, userData, or object name
        const parentName = object.userData?.meta?.name || 
                          object.userData?.name ||
                          object.name || 
                          `Asset ${itemId.slice(-8)}`;
        
        processedItems.add(itemId);

        // Create parent node
        const parentNode: LayerNode = {
          id: `parent-${itemId}`,
          name: parentName,
          type: 'parent',
          itemId: itemId,
          object: object,
          visible: object.visible,
          children: []
        };

        // Find all mesh children (submeshes) that belong to this object
        const submeshes: LayerNode[] = [];
        
        // Recursive function to find all meshes in the object hierarchy
        const findMeshes = (parent: THREE.Object3D, depth = 0) => {
          parent.children.forEach((child) => {
            if (child instanceof THREE.Mesh) {
              // Found a mesh - this is a submesh
              let submeshName = child.name;
              
              // Generate a better name if needed
              if (!submeshName || submeshName.trim() === '' || submeshName === 'Object3D') {
                // Try to get name from material
                if (child.material) {
                  const material = Array.isArray(child.material) ? child.material[0] : child.material;
                  if ((material as any).name) {
                    submeshName = (material as any).name;
                  } else {
                    submeshName = `Part ${submeshes.length + 1}`;
                  }
                } else {
                  submeshName = `Mesh ${submeshes.length + 1}`;
                }
              }
              
              const submeshNode: LayerNode = {
                id: `submesh-${itemId}-${submeshes.length}`,
                name: submeshName,
                type: 'submesh',
                parentId: parentNode.id,
                itemId: itemId,
                object: child,
                visible: child.visible
              };
              submeshes.push(submeshNode);
            } else if (child.children && child.children.length > 0) {
              // Recursively search deeper for meshes
              findMeshes(child, depth + 1);
            }
          });
        };
        
        findMeshes(object, 0);

        parentNode.children = submeshes;
        layerNodes.push(parentNode);
      }
    });

    // Update global state and notify subscribers
    notifyLayerDataSubscribers(layerNodes);
  };

  // Refresh layers when scene changes
  useEffect(() => {
    scanSceneObjects();
    const interval = setInterval(scanSceneObjects, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, [scene]);

  // Trigger re-render every 2 seconds to keep data fresh
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // This component doesn't render anything visible
  return null;
}

export type { LayerNode };