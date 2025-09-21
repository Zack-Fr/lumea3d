import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useSceneContext } from '../../contexts/SceneContext';

// Helper function to create visual helpers for lights
function createLightHelper(light: THREE.Light): THREE.Object3D | null {
  if (light instanceof THREE.DirectionalLight) {
    const helper = new THREE.DirectionalLightHelper(light, 2, 0xffff00);
    // Ensure helper updates when light moves
    helper.userData.needsUpdate = true;
    return helper;
  } else if (light instanceof THREE.PointLight) {
    // Create a selectable mesh helper instead of the default PointLightHelper
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffff00, 
      wireframe: true, 
      transparent: true, 
      opacity: 0.8 
    });
    const helper = new THREE.Mesh(geometry, material);
    
    // Position helper at light position initially
    helper.position.copy(light.position);
    
    // Set up automatic position syncing
    helper.userData.needsUpdate = true;
    helper.userData.lightReference = light;
    
    // Update helper position to match light
    const updateHelperPosition = () => {
      helper.position.copy(light.position);
      helper.updateMatrixWorld(true);
    };
    
    // Set up periodic sync (in case position changes aren't caught)
    const syncInterval = setInterval(updateHelperPosition, 100);
    helper.userData.syncInterval = syncInterval;
    
    // Clean up interval when helper is removed
    helper.userData.cleanup = () => {
      clearInterval(syncInterval);
    };
    
    return helper;
  } else if (light instanceof THREE.SpotLight) {
    const helper = new THREE.SpotLightHelper(light, 0xffff00);
    // Spot light helpers need manual updates
    helper.userData.needsUpdate = true;
    return helper;
  }
  return null;
}

interface LightsContainerProps {
  onLightAdded?: (light: THREE.Light) => void;
}

// Global lights store for communication between components
export class LightsManager {
  private static instance: LightsManager;
  private lights: THREE.Light[] = [];
  private callbacks: ((lights: THREE.Light[]) => void)[] = [];

  static getInstance(): LightsManager {
    if (!LightsManager.instance) {
      LightsManager.instance = new LightsManager();
    }
    return LightsManager.instance;
  }

  addLight(light: THREE.Light): void {
    this.lights.push(light);
    console.log('💡 LightsManager: Light added:', light.name);
    this.notifyCallbacks();
  }

  clear(scene?: THREE.Scene): void {
    // Remove all lights from scene if provided
    if (scene) {
      for (const light of this.lights) {
        scene.remove(light);
        if (light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) {
          scene.remove(light.target);
        }
        if ((light as any).userData?.helper) {
          const helper = (light as any).userData.helper as THREE.Object3D;
          if (helper.userData?.cleanup) try { helper.userData.cleanup(); } catch {}
          scene.remove(helper);
        }
      }
    }
    this.lights = [];
    this.notifyCallbacks();
  }

  removeLight(lightName: string): void {
    const index = this.lights.findIndex(light => light.name === lightName);
    if (index !== -1) {
      const light = this.lights[index];
      // Clean up helper if it exists
      if (light.userData.helper) {
        // Call custom cleanup if available (for our point light helpers)
        if (light.userData.helper.userData?.cleanup) {
          light.userData.helper.userData.cleanup();
        }
        // Standard disposal
        light.userData.helper.dispose?.();
      }
      this.lights.splice(index, 1);
      console.log('💡 LightsManager: Light removed:', lightName);
      this.notifyCallbacks();
    }
  }

  getLights(): THREE.Light[] {
    return [...this.lights];
  }

  subscribe(callback: (lights: THREE.Light[]) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index !== -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => callback(this.getLights()));
  }
}

const LightsContainer: React.FC<LightsContainerProps> = ({ onLightAdded }) => {
  const { scene } = useThree();
  const [lights, setLights] = useState<THREE.Light[]>([]);
  const lightsManager = useRef(LightsManager.getInstance());
  const { sceneId } = useSceneContext();
  
  // Debug lights count for development
  console.log('💡 LightsContainer render - lights count:', lights.length);

  useEffect(() => {
    const unsubscribe = lightsManager.current.subscribe((updatedLights) => {
      setLights(updatedLights);
      
      // Add new lights to the scene
      updatedLights.forEach(light => {
        if (!scene.children.includes(light)) {
          scene.add(light);
          
          // Add target for directional and spot lights
          if (light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) {
            scene.add(light.target);
          }
          
          // Add visual helper for the light
          const helper = createLightHelper(light);
          if (helper) {
            helper.name = `${light.name}-helper`;
            
            // Make helper selectable and link to the actual light for transforms
            helper.userData = {
              isHelper: true,
              originalLight: light.name,
              actualLightObject: light, // Reference to the actual light for transforms
              selectable: true, // Explicitly ensure helper is selectable
              itemId: light.userData.itemId || light.name, // Use light's itemId for selection
              // Don't copy all userData to prevent duplicate layer entries
              meta: {
                isHelper: true,
                lightType: light.userData.meta?.lightType
              }
            };
            
            console.log('💡 Created light helper with userData:', {
              helperName: helper.name,
              lightName: light.name,
              userData: helper.userData
            });
            
            // Helper should follow the light position automatically
            const updateHelper = () => {
              if (helper && light) {
                console.log('💡 Helper updateHelper called - syncing positions');
                
                // Since point light helpers should automatically follow their light,
                // we just need to ensure the helper updates its visual representation
                if ('update' in helper && typeof helper.update === 'function') {
                  helper.update();
                  console.log('💡 Helper update() called successfully');
                }
              }
            };
            
            // Update helper initially and whenever light moves
            updateHelper();
            light.userData.updateHelper = updateHelper;
            
            scene.add(helper);
            
            // Store helper reference for cleanup
            light.userData.helper = helper;
          }
          
          console.log('💡 LightsContainer: Added light and helper to scene:', {
            lightName: light.name,
            lightType: light.type,
            position: light.position.toArray(),
            intensity: light.intensity,
            hasHelper: !!helper,
            helperName: helper?.name,
            sceneChildrenCount: scene.children.length
          });
          
          // Notify parent component
          if (onLightAdded) {
            onLightAdded(light);
          }
        }
      });
    });

    return unsubscribe;
  }, [scene, onLightAdded]);

  // Reset lights when scene changes
  useEffect(() => {
    if (!sceneId) return;
    console.log('💡 LightsContainer: Scene changed, clearing existing lights');
    lightsManager.current.clear(scene);
    setLights([]);
  }, [sceneId, scene]);

  // Clean up lights when component unmounts
  useEffect(() => {
    return () => {
      lightsManager.current.clear(scene);
    };
  }, [scene]);

  // This component doesn't render anything visible
  // It just manages the lights in the scene
  return null;
};

// Utility function for other components to add lights
export const addLightToScene = (light: THREE.Light): void => {
  const manager = LightsManager.getInstance();
  manager.addLight(light);
};

// Utility function to remove lights
export const removeLightFromScene = (lightName: string): void => {
  const manager = LightsManager.getInstance();
  manager.removeLight(lightName);
};

export default LightsContainer;
