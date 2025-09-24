import { useEffect } from 'react';
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

  // Scan scene for objects and build hierarchy
  const scanSceneObjects = () => {
    const layerNodes: LayerNode[] = [];
    const processedItems = new Set<string>();
    const processedMeshNames = new Set<string>();

    // Promote any object with itemId to its top-most container sharing that itemId
    const getContainerFor = (obj: THREE.Object3D): THREE.Object3D => {
      const itemId = (obj as any).userData?.itemId as string | undefined;
      if (!itemId) return obj;
      let cur: THREE.Object3D = obj;
      while (cur.parent && (cur.parent as any).userData && (cur.parent as any).userData.itemId === itemId) {
        cur = cur.parent as THREE.Object3D;
      }
      return cur;
    };

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

      const container = getContainerFor(object);
      const itemId = (container as any).userData?.itemId as string | undefined;
      if (!itemId) return;
      
      // For objects with same itemId but different mesh names, treat as separate objects
      const meshName = object.name || 'unnamed';
      const uniqueKey = `${itemId}-${meshName}`;
      
      if (processedMeshNames.has(uniqueKey)) return;
      
      // Check if this is a significantly different mesh (like Cube vs small-house)
      const isDifferentMesh = object.type === 'Mesh' && meshName.toLowerCase().includes('cube');
      
      if (isDifferentMesh || !processedItems.has(itemId)) {
        
        // Determine display name based on whether this is a different mesh
        let parentName;
        let nodeId;
        
        if (isDifferentMesh) {
          // For cube mesh, use the mesh name and create unique ID
          parentName = meshName.replace(/\s*\([^)]*\)/, ''); // Remove (Material) suffix
          nodeId = `parent-${itemId}-${meshName.replace(/\s+/g, '-')}`;
          processedMeshNames.add(uniqueKey);
        } else {
          // For main object, use metadata name
          parentName = object.userData?.meta?.name || 
                      object.userData?.name ||
                      object.name || 
                      `Asset ${itemId.slice(-8)}`;
          nodeId = `parent-${itemId}`;
          processedItems.add(itemId);
          processedMeshNames.add(uniqueKey);
        }

        // Create parent node
        const parentNode: LayerNode = {
          id: nodeId,
          name: parentName,
          type: 'parent',
          itemId: isDifferentMesh ? `${itemId}-${meshName}` : itemId, // Unique itemId for different meshes
          object: isDifferentMesh ? object : container, // Use mesh directly for cube, container for others
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
        
        // For different meshes (like cube), don't look for submeshes since it IS the mesh
        if (isDifferentMesh) {
          // This object IS the mesh, no submeshes
          parentNode.children = [];
        } else {
          // For container objects, find submeshes
          findMeshes(container, 0);
          parentNode.children = submeshes;
        }
        
        layerNodes.push(parentNode);
      }
    });

    // Update global state and notify subscribers
    
    // Check if there's a stale selection and refresh it with fresh object reference
    try {
      // Import the selectionStore dynamically
      import('../../stores/selectionStore').then(({ useSelectionStore }) => {
        const currentSelected = useSelectionStore.getState().selected;
        
        if (currentSelected && currentSelected.itemId) {
          // Find the fresh object with the same itemId
          const freshNode = layerNodes.find(node => node.itemId === currentSelected.itemId);
          
          if (freshNode && freshNode.object !== currentSelected.object) {
            
            // Update with fresh object reference
            useSelectionStore.getState().set({
              ...currentSelected,
              object: freshNode.object,
              originalPosition: freshNode.object.position.clone(),
              originalRotation: freshNode.object.rotation.clone(),
              originalScale: freshNode.object.scale.clone(),
            });
          }
        }
      }).catch(error => {
        console.warn('Could not refresh stale selection:', error);
      });
    } catch (error) {
      console.warn('Error setting up stale selection refresh:', error);
    }
    
    notifyLayerDataSubscribers(layerNodes);
  };

  // Refresh layers when scene changes
  useEffect(() => {
    scanSceneObjects();
    // Scan every 15 seconds to minimize performance impact
    const interval = setInterval(scanSceneObjects, 15000);
    return () => clearInterval(interval);
  }, [scene]);

  // This component doesn't render anything visible
  return null;
}

export type { LayerNode };