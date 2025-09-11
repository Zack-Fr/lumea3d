import React, { useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Lightbulb, Sun, Zap, Flashlight } from 'lucide-react';
import * as THREE from 'three';
import { useSceneContext } from '../../contexts/SceneContext';
import { addLightToScene } from './LightsContainer';

interface LightCreationProps {
  onLightCreated?: (lightObject: THREE.Light) => void;
}

type LightType = 'directional' | 'point' | 'spot';

interface LightConfig {
  type: LightType;
  color: string;
  intensity: number;
  position: [number, number, number];
  target?: [number, number, number]; // For directional and spot lights
  angle?: number; // For spot lights only
  distance?: number; // For point and spot lights
  decay?: number; // For point and spot lights
}

const LightCreation: React.FC<LightCreationProps> = ({ onLightCreated }) => {
  const { sceneId } = useSceneContext();
  const [selectedLightType, setSelectedLightType] = useState<LightType>('directional');
  const [isCreatingLight, setIsCreatingLight] = useState(false);

  const lightConfigs: Record<LightType, Omit<LightConfig, 'type'>> = {
    directional: {
      color: '#ffffff',
      intensity: 1.0,
      position: [5, 10, 5],
      target: [0, 0, 0]
    },
    point: {
      color: '#ffffff',
      intensity: 1.0,
      position: [0, 5, 0],
      distance: 20,
      decay: 2
    },
    spot: {
      color: '#ffffff',
      intensity: 1.0,
      position: [0, 10, 0],
      target: [0, 0, 0],
      angle: Math.PI / 4,
      distance: 20,
      decay: 2
    }
  };

  const createLight = useCallback(async (lightType: LightType) => {
    setIsCreatingLight(true);
    
    try {
      const config = lightConfigs[lightType];
      let light: THREE.Light;
      
      switch (lightType) {
        case 'directional':
          light = new THREE.DirectionalLight(config.color, config.intensity);
          light.position.set(...config.position);
          if (config.target) {
            light.target.position.set(...config.target);
          }
          break;
          
        case 'point':
          light = new THREE.PointLight(
            config.color, 
            config.intensity, 
            config.distance, 
            config.decay
          );
          light.position.set(...config.position);
          break;
          
        case 'spot':
          light = new THREE.SpotLight(
            config.color,
            config.intensity,
            config.distance,
            config.angle,
            0.1, // penumbra
            config.decay
          );
          light.position.set(...config.position);
          if (config.target) {
            light.target.position.set(...config.target);
          }
          break;
      }

      // Set common properties
      light.name = `${lightType}-light-${Date.now()}`;
      light.castShadow = true;
      
      // Add userData for selection system
      light.userData = {
        itemId: light.name,
        category: 'lighting',
        selectable: true,
        locked: false,
        meta: {
          isLight: true,
          lightType: lightType,
          name: `${lightType.charAt(0).toUpperCase() + lightType.slice(1)} Light`,
          createdAt: new Date().toISOString()
        }
      };

      console.log('💡 Light created:', {
        type: lightType,
        name: light.name,
        position: light.position.toArray(),
        intensity: light.intensity,
        color: light.color.getHexString()
      });

      // Add light to the 3D scene
      addLightToScene(light);
      
      // Notify parent component
      if (onLightCreated) {
        onLightCreated(light);
      }

    } catch (error) {
      console.error('❌ Failed to create light:', error);
    } finally {
      setIsCreatingLight(false);
    }
  }, [lightConfigs, onLightCreated]);

  const handleCreateLight = useCallback(() => {
    createLight(selectedLightType);
  }, [createLight, selectedLightType]);

  const lightTypeOptions = [
    {
      type: 'directional' as LightType,
      label: 'Directional',
      icon: Sun,
      description: 'Infinite light source (like sunlight)'
    },
    {
      type: 'point' as LightType,
      label: 'Point',
      icon: Lightbulb,
      description: 'Light source that emits in all directions'
    },
    {
      type: 'spot' as LightType,
      label: 'Spot',
      icon: Flashlight,
      description: 'Cone-shaped light source'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Light Type</h4>
        <div className="space-y-1">
          {lightTypeOptions.map(({ type, label, icon: Icon, description }) => (
            <div
              key={type}
              className={`p-2 rounded border cursor-pointer transition-colors ${
                selectedLightType === type
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => setSelectedLightType(type)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label} Light</span>
              </div>
              <p className="text-xs text-gray-400">{description}</p>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={handleCreateLight}
        disabled={isCreatingLight || !sceneId}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isCreatingLight ? (
          <>
            <Zap className="w-4 h-4 mr-2 animate-pulse" />
            Creating...
          </>
        ) : (
          <>
            <Lightbulb className="w-4 h-4 mr-2" />
            Add {lightTypeOptions.find(opt => opt.type === selectedLightType)?.label} Light
          </>
        )}
      </Button>

      <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
        <p><strong>Tip:</strong> After creating a light, you can select and move it using the transform gizmos.</p>
      </div>
    </div>
  );
};

export default LightCreation;
