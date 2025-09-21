import React, { useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Lightbulb, Sun, Zap, Flashlight } from 'lucide-react';
import * as THREE from 'three';
import { useSceneContext } from '../../contexts/SceneContext';
import { scenesApi } from '../../services/scenesApi';
import { addLightToScene } from './LightsContainer';
import { useSaveQueueStore } from '../../stores/saveQueueStore';

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
  const { sceneId, manifest } = useSceneContext();
  
  // Debug: Log available categories
  React.useEffect(() => {
    if (manifest?.categories) {
      console.log('Available categories in project:', Object.keys(manifest.categories));
    }
  }, [manifest]);
  
  const [selectedLightType, setSelectedLightType] = useState<LightType>('directional');
  const setSaveQueueSceneId = useSaveQueueStore(s => s.setSceneId);
  const [isCreatingLight, setIsCreatingLight] = useState(false);

  const lightConfigs: Record<LightType, Omit<LightConfig, 'type'>> = {
    directional: {
      color: '#ffffff',
      intensity: 2.0, // Increased for better visibility
      position: [5, 10, 5],
      target: [0, 0, 0]
    },
    point: {
      color: '#ffddaa', // Warm white color
      intensity: 3.0, // Increased intensity
      position: [0, 5, 0],
      distance: 50, // Increased range
      decay: 1 // Reduced decay for longer range
    },
    spot: {
      color: '#ffffff',
      intensity: 2.5, // Increased intensity
      position: [0, 10, 0],
      target: [0, 0, 0],
      angle: Math.PI / 3, // Wider cone
      distance: 40, // Increased range
      decay: 1 // Reduced decay
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
            (light as THREE.DirectionalLight).target.position.set(...config.target);
          }
          // Configure shadows for directional light
          light.castShadow = true;
          if (light.shadow) {
            light.shadow.mapSize.width = 2048;
            light.shadow.mapSize.height = 2048;
            const shadowCamera = light.shadow.camera as THREE.OrthographicCamera;
            shadowCamera.near = 0.5;
            shadowCamera.far = 50;
            shadowCamera.left = -20;
            shadowCamera.right = 20;
            shadowCamera.top = 20;
            shadowCamera.bottom = -20;
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
            (light as THREE.SpotLight).target.position.set(...config.target);
          }
          break;
      }

      // Set common properties
      light.name = lightType === 'directional' ? 'Directional Light' : lightType === 'spot' ? 'Spot Light' : 'Point Light';
      
      // Enable shadows for point and spot lights (directional already configured above)
      if (lightType === 'point' || lightType === 'spot') {
        light.castShadow = true;
        if (light.shadow) {
          light.shadow.mapSize.width = 2048; // Higher resolution shadows
          light.shadow.mapSize.height = 2048;
          const shadowCamera = light.shadow.camera as THREE.PerspectiveCamera;
          shadowCamera.near = 0.1;
          shadowCamera.far = lightType === 'point' ? (config.distance || 50) : (config.distance || 40);
          light.shadow.bias = -0.0001; // Reduce shadow acne
          light.shadow.normalBias = 0.02;
          light.shadow.radius = 4; // Soft shadows
        }
      }
      
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
      
      console.log('💡 Created light with userData:', {
        lightName: light.name,
        userData: light.userData,
        selectable: light.userData.selectable
      });

      // Add light to the 3D scene visually
      addLightToScene(light);
      
      // Add light to scene persistence system
      console.log('� Adding light to scene persistence:', {
        lightName: light.name,
        itemId: light.userData.itemId,
        lightType: lightType
      });
      
      // Save light to backend using direct API
      if (sceneId) {
        try {
          // Get a valid category key (prefer 'lighting' if available, otherwise use first available)
          const availableCategories = manifest?.categories ? Object.keys(manifest.categories) : [];
          const categoryKey = availableCategories.includes('lighting') 
            ? 'lighting' 
            : availableCategories.length > 0 
              ? availableCategories[0] 
              : 'furniture'; // fallback
          
          console.log('Using categoryKey for light:', categoryKey, 'from available:', availableCategories);

          // Create the request in the format expected by the backend API
          const createRequest = {
            categoryKey: categoryKey,
            model: lightType,
            positionX: light.position.x,
            positionY: light.position.y,
            positionZ: light.position.z,
            rotationX: light.rotation.x,
            rotationY: light.rotation.y,
            rotationZ: light.rotation.z,
            scaleX: light.scale.x,
            scaleY: light.scale.y,
            scaleZ: light.scale.z,
            selectable: true,
            locked: false,
            meta: {
              isLight: true,
              lightType: lightType,
              lightName: light.name,
              lightProperties: {
                color: light.color.getHexString(),
                intensity: light.intensity,
                ...(lightType === 'point' && { 
                  distance: (light as THREE.PointLight).distance,
                  decay: (light as THREE.PointLight).decay 
                }),
                ...(lightType === 'spot' && { 
                  distance: (light as THREE.SpotLight).distance,
                  decay: (light as THREE.SpotLight).decay,
                  angle: (light as THREE.SpotLight).angle 
                })
              }
            }
          };

          const result = await scenesApi.addItem(sceneId, createRequest, manifest?.scene?.version?.toString());
          console.log('✅ Light saved to backend:', {
            lightName: light.name,
            backendId: result.id,
            lightType: lightType
          });

          // Update the light's userData with the backend-generated ID
          light.userData.itemId = result.id;
          light.name = result.id; // Use backend ID for consistency

          // Sync save queue version after backend increments scene version
          try {
            const vResp = await scenesApi.getVersion(sceneId);
            const newVersionNum = parseInt((vResp?.version ?? '1').toString(), 10);
            if (!Number.isNaN(newVersionNum)) {
              setSaveQueueSceneId(sceneId, newVersionNum);
            }
          } catch (e) {
            console.warn('⚠️ Failed to sync save queue version after addItem:', e);
          }
          
        } catch (error) {
          console.error('❌ Failed to save light to backend:', error);
          
          // Mark light as local-only if persistence fails
          light.userData.saveError = true;
          light.userData.errorMessage = error instanceof Error ? error.message : String(error);
          light.userData.localOnly = true;
        }
      }
      
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
                  ? 'border-[var(--glass-yellow)] bg-[var(--glass-yellow)]/10'
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
        className="w-full bg-[var(--glass-yellow)] hover:bg-[var(--glass-yellow-dark)] text-[var(--glass-black)]"
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
