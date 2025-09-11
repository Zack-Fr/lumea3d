import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

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

  removeLight(lightName: string): void {
    const index = this.lights.findIndex(light => light.name === lightName);
    if (index !== -1) {
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
          
          console.log('💡 LightsContainer: Added light to scene:', light.name);
          
          // Notify parent component
          if (onLightAdded) {
            onLightAdded(light);
          }
        }
      });
    });

    return unsubscribe;
  }, [scene, onLightAdded]);

  // Clean up lights when component unmounts
  useEffect(() => {
    return () => {
      lights.forEach(light => {
        scene.remove(light);
        if (light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) {
          scene.remove(light.target);
        }
      });
    };
  }, [scene, lights]);

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
