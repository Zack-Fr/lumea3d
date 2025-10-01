import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Button } from "../ui/Button";
import { Slider } from "../ui/Slider";
import { ScrollArea } from "../ui/ScrollArea";
import { 
  Move,
  Palette,
  Lightbulb,
  Eye,
  Image as ImageIcon
} from "lucide-react";
import TextureManager from './TextureManager';
import textureManager, { TextureMapType } from '../../utils/textureManager';
import ScaleUnitSystem, { ScaleUnit } from './ScaleUnitSystem';
import HdrEnvironmentUpload from './HdrEnvironmentUpload';
import LightCreation from './LightCreation';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';
import { scenesApi, SceneItemUpdateRequest, SceneUpdateRequest } from '../../services/scenesApi';
import { useSceneContext } from '../../contexts/SceneContext';
import { useSelection } from '../../features/scenes/SelectionContext';
import { useLightingControls } from '../../hooks/useLightingControls';
import { applyMaterialOverride, PBRMaterialOverride } from '../../utils/textureSystem';
import { useSaveQueueStore } from '../../stores/saveQueueStore';

interface PropertiesPanelProps {
  show: boolean;
  onClose: () => void;
  sceneId?: string; // Add sceneId for API calls
  selectedItemId?: string; // Currently selected item for editing
}

interface ShellSettings {
  castShadow: boolean;
  receiveShadow: boolean;
  visible: boolean;
}

interface SelectedItemState {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  material: {
    roughness: number;
    metallic: number;
    emission: number;
    color: string;
  };
}

interface EnvironmentSettings {
  intensity: number;
  shadowStrength: number;
  exposure: number;
}

interface ScaleSettings {
  unit: ScaleUnit;
  sceneScale: number;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = React.memo(({
  show,
  onClose,
  sceneId,
  selectedItemId
}) => {
  const { manifest, refreshScene, sceneId: contextSceneId } = useSceneContext();
  const { selection, deselectObject } = useSelection();
  const { defaultLightEnabled, setDefaultLightEnabled } = useLightingControls();
  const { stage: stageOperation } = useSaveQueueStore();
  
  const activeSceneId = sceneId || contextSceneId;
  
  // Shell shadow state
  const [shellSettings, setShellSettings] = useState<ShellSettings>({
    castShadow: false,
    receiveShadow: false,
    visible: true
  });
  
  // Environment lighting state
  const [environmentSettings, setEnvironmentSettings] = useState<EnvironmentSettings>({
    intensity: 100,
    shadowStrength: 50,
    exposure: 1.0
  });
  
  // HDR environment state
  const [currentHdriUrl, setCurrentHdriUrl] = useState<string | null>(null);
  
  // Created lights state
  const [createdLights, setCreatedLights] = useState<THREE.Light[]>([]);
  
  // Scene scale settings state
  const [scaleSettings, setScaleSettings] = useState<ScaleSettings>({
    unit: 'cm',
    sceneScale: 1.0
  });
  
  // Selected item state
  const [selectedItem, setSelectedItem] = useState<SelectedItemState | null>(null);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [isUpdatingShell, setIsUpdatingShell] = useState(false);
  const [isUpdatingEnvironment, setIsUpdatingEnvironment] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Local material slider states (to avoid camera resets from controlled components)
  const [localRoughness, setLocalRoughness] = useState<number>(50);
  const [localMetallic, setLocalMetallic] = useState<number>(0);
  const [localEmission, setLocalEmission] = useState<number>(0);
  const [localColor, setLocalColor] = useState<string>('#ffffff');
  
  // Current textures for thumbnails - store both URL and name
  const [currentTextures, setCurrentTextures] = useState<{
    baseColor?: { url: string; name?: string };
    normal?: { url: string; name?: string };
    metallicRoughness?: { url: string; name?: string };
    emissive?: { url: string; name?: string };
    occlusion?: { url: string; name?: string };
    opacity?: { url: string; name?: string };
  }>({});
  
  // Material slots state
  const [availableMaterials, setAvailableMaterials] = useState<{
    name: string;
    index: number;
    material: THREE.Material;
    baseColorTexture?: string;
    baseColor?: string;
  }[]>([]);
  const [selectedMaterialIndex, setSelectedMaterialIndex] = useState<number>(0);
  
  // Texture manager state
  const [showTextureManager, setShowTextureManager] = useState(false);
  const [currentTextureType, setCurrentTextureType] = useState<TextureMapType>('baseColor');
  
  // Sync local material states with selected item (without causing re-renders)
  useEffect(() => {
    if (selectedItem?.material) {
      setLocalRoughness(selectedItem.material.roughness);
      setLocalMetallic(selectedItem.material.metallic);
      setLocalEmission(selectedItem.material.emission);
      setLocalColor(selectedItem.material.color);
    }
  }, [selectedItem?.id]);
  
  // Use a simple timer to periodically update light positions while transforming
  useEffect(() => {
    let intervalId: number;
    
    if (selection.isTransforming) {
      // Update positions every 50ms while transforming for live feedback
      intervalId = window.setInterval(() => {
        setCreatedLights(prev => [...prev]); // This will cause a re-render with current positions
      }, 50);
    } else {
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selection.isTransforming]);
  
  // Load current HDR URL from scene manifest (check both possible locations)
  useEffect(() => {
    const hdriUrl = manifest?.scene?.envHdriUrl || manifest?.scene?.env?.hdri_url || manifest?.env?.hdri_url;
    if (hdriUrl) {
      setCurrentHdriUrl(hdriUrl);
    } else {
      setCurrentHdriUrl(null);
    }
  }, [manifest?.scene?.envHdriUrl, manifest?.scene?.env?.hdri_url, manifest?.env?.hdri_url]);
  
  // Load environment lighting settings from manifest
  useEffect(() => {
    if (manifest?.scene) {
      const scene = manifest.scene;
      const newSettings = {
        intensity: (scene.envIntensity || 1.0) * 100, // Convert from 0-2.0 to 0-200
        shadowStrength: 50, // Default shadow strength (client-side setting)
        exposure: scene.exposure || 1.0
      };
      
      // Only update if values actually changed to prevent recursive updates
      setEnvironmentSettings(prevSettings => {
        if (prevSettings.intensity !== newSettings.intensity || 
            prevSettings.exposure !== newSettings.exposure ||
            prevSettings.shadowStrength !== newSettings.shadowStrength) {
          return newSettings;
        }
        return prevSettings;
      });
    }
  }, [manifest?.scene?.envIntensity, manifest?.scene?.exposure]);
  
  // Helper function to extract material properties from a Three.js object
  const extractMaterialProperties = useCallback((object: THREE.Object3D) => {
    let extractedMaterial = {
      roughness: 50, // Default values
      metallic: 0,
      emission: 0,
      color: '#ffffff'
    };
    
    // Find the first PBR material in the object hierarchy
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material && !('_extracted' in extractedMaterial)) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
            const stdMat = material as THREE.MeshStandardMaterial;
            
            extractedMaterial = {
              roughness: Math.round(stdMat.roughness * 100),
              metallic: Math.round(stdMat.metalness * 100), 
              emission: Math.round(stdMat.emissive.r * 100), // Use R channel as scalar
              color: `#${stdMat.color.getHexString()}`
            };
            
            (extractedMaterial as any)._extracted = true; // Mark as extracted to break loops
            break;
          }
        }
      }
    });
    
    return extractedMaterial;
  }, []);
  
  // Helper function to extract current texture URLs from a Three.js object
  const extractCurrentTextures = useCallback((object: THREE.Object3D) => {
    const textures = {
      baseColor: undefined as { url: string; name?: string } | undefined,
      normal: undefined as { url: string; name?: string } | undefined,
      metallicRoughness: undefined as { url: string; name?: string } | undefined,
      emissive: undefined as { url: string; name?: string } | undefined,
      occlusion: undefined as { url: string; name?: string } | undefined,
      opacity: undefined as { url: string; name?: string } | undefined,
    };
    
    // Find the first material with textures in the object hierarchy
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material && !textures.baseColor) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
            const stdMat = material as THREE.MeshStandardMaterial;
            
            // Extract texture URLs and names from the material with multiple fallback methods
            const getTextureData = (texture: THREE.Texture | null): { url: string; name?: string } | undefined => {
              if (!texture) return undefined;
              
              const textureName = texture.name || 'Texture';
              
              // Try different ways to get the texture URL
              if (texture.source?.data?.currentSrc) {
                return { url: texture.source.data.currentSrc, name: textureName };
              }
              if (texture.source?.data?.src) {
                return { url: texture.source.data.src, name: textureName };
              }
              if ((texture as any).image?.currentSrc) {
                return { url: (texture as any).image.currentSrc, name: textureName };
              }
              if ((texture as any).image?.src) {
                return { url: (texture as any).image.src, name: textureName };
              }
              if ((texture as any).userData?.url) {
                return { url: (texture as any).userData.url, name: textureName };
              }
              
              // Handle Three.js loader cache system - get image from cache manager
              if (texture.image && typeof texture.image === 'string') {
                // This is a UUID reference, try to find the actual image
                const loader = (window as any).__lumea_loader || (window as any).THREE?.Cache;
                if (loader && loader.get) {
                  const cachedImage = loader.get(texture.image);
                  if (cachedImage?.currentSrc) return { url: cachedImage.currentSrc, name: textureName };
                  if (cachedImage?.src) return { url: cachedImage.src, name: textureName };
                }
                
                // Try to find in Three.js global cache
                if ((window as any).THREE?.Cache?.files) {
                  const cachedFile = (window as any).THREE.Cache.files[texture.image];
                  if (cachedFile) {
                    if (typeof cachedFile === 'string') return { url: cachedFile, name: textureName };
                    if (cachedFile.currentSrc) return { url: cachedFile.currentSrc, name: textureName };
                    if (cachedFile.src) return { url: cachedFile.src, name: textureName };
                  }
                }
                
                // If it's a data URL or blob URL, return as is
                if (typeof texture.image === 'string' && (texture.image.startsWith('data:') || texture.image.startsWith('blob:'))) {
                  return { url: texture.image, name: textureName };
                }
                
                // Create a placeholder or fallback URL for UUID textures
                // You could also try to reconstruct the original URL if you know the pattern
                
                // Try to render the texture to a canvas to get a data URL
                try {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  canvas.width = 128;
                  canvas.height = 128;
                  
                  // Try to get the texture's image data
                  if (texture.source?.data) {
                    const imageData = texture.source.data;
                    if (imageData instanceof HTMLImageElement || imageData instanceof HTMLCanvasElement) {
                      ctx?.drawImage(imageData, 0, 0, 128, 128);
                      const dataUrl = canvas.toDataURL('image/png');
                      return { url: dataUrl, name: textureName };
                    }
                  }
                  
                  // Fallback: create a simple colored placeholder
                  if (ctx) {
                    const name = texture.name || 'Texture';
                    let hash = 0;
                    for (let i = 0; i < name.length; i++) {
                      hash = ((hash << 5) - hash + name.charCodeAt(i)) & 0xffffffff;
                    }
                    
                    const hue = Math.abs(hash) % 360;
                    ctx.fillStyle = `hsl(${hue}, 50%, 45%)`;
                    ctx.fillRect(0, 0, 128, 128);
                    
                    // Add name overlay
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(0, 96, 128, 32);
                    
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 10px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    const displayName = name.length > 16 ? name.substring(0, 13) + '...' : name;
                    ctx.fillText(displayName, 64, 112);
                    
                    const dataUrl = canvas.toDataURL('image/png');
                    return { url: dataUrl, name: textureName };
                  }
                } catch (error) {
                  console.warn('Failed to create canvas data URL for texture:', error);
                }
                
                // Ultimate fallback - enhanced SVG placeholder
                const name = texture.name || 'Texture';
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                  hash = ((hash << 5) - hash + name.charCodeAt(i)) & 0xffffffff;
                }
                const hue = Math.abs(hash) % 360;
                const displayName = name.length > 12 ? name.substring(0, 9) + '...' : name;
                
                const svgUrl = `data:image/svg+xml;base64,${btoa(`
                  <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:hsl(${hue}, 50%, 55%);stop-opacity:1" />
                        <stop offset="100%" style="stop-color:hsl(${hue}, 50%, 35%);stop-opacity:1" />
                      </linearGradient>
                    </defs>
                    <rect width="64" height="64" fill="url(#grad)"/>
                    <rect x="0" y="48" width="64" height="16" fill="rgba(0,0,0,0.7)"/>
                    <text x="32" y="58" text-anchor="middle" fill="white" font-size="8" font-weight="bold">${displayName}</text>
                  </svg>
                `)}`;
                
                return { url: svgUrl, name: textureName };
              }
              
              // If texture has an actual Image object
              if (texture.image && typeof texture.image === 'object') {
                if (texture.image.currentSrc) return { url: texture.image.currentSrc, name: textureName };
                if (texture.image.src) return { url: texture.image.src, name: textureName };
                
                // Create a visual placeholder for texture based on its name
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 128;
                canvas.height = 128;
                
                if (ctx) {
                  // Generate consistent color from texture name
                  let hash = 0;
                  const name = texture.name || 'Texture';
                  for (let i = 0; i < name.length; i++) {
                    hash = ((hash << 5) - hash + name.charCodeAt(i)) & 0xffffffff;
                  }
                  
                  const hue = Math.abs(hash) % 360;
                  const saturation = 60 + (Math.abs(hash >> 8) % 30); // 60-90%
                  const lightness = 40 + (Math.abs(hash >> 16) % 30); // 40-70%
                  
                  // Create gradient background
                  const gradient = ctx.createLinearGradient(0, 0, 128, 128);
                  gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness + 15}%)`);
                  gradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness - 10}%)`);
                  
                  ctx.fillStyle = gradient;
                  ctx.fillRect(0, 0, 128, 128);
                  
                  // Add subtle texture pattern
                  ctx.globalAlpha = 0.1;
                  ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness + 25}%)`;
                  for (let i = 0; i < 8; i++) {
                    for (let j = 0; j < 8; j++) {
                      if ((i + j) % 2 === 0) {
                        ctx.fillRect(i * 16, j * 16, 8, 8);
                      }
                    }
                  }
                  ctx.globalAlpha = 1;
                  
                  // Add name overlay
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                  ctx.fillRect(0, 96, 128, 32);
                  
                  ctx.fillStyle = 'white';
                  ctx.font = 'bold 10px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  
                  const displayName = name.length > 16 ? name.substring(0, 13) + '...' : name;
                  ctx.fillText(displayName, 64, 112);
                  
                  const dataUrl = canvas.toDataURL('image/png');
                  return { url: dataUrl, name: textureName };
                }
              }
              
              return undefined;
            };
            
            textures.baseColor = getTextureData(stdMat.map);
            textures.normal = getTextureData(stdMat.normalMap);
            textures.metallicRoughness = getTextureData(stdMat.metalnessMap) || getTextureData(stdMat.roughnessMap);
            textures.emissive = getTextureData(stdMat.emissiveMap);
            textures.occlusion = getTextureData(stdMat.aoMap);
            textures.opacity = getTextureData(stdMat.alphaMap);
            
            break;
          }
        }
      }
    });
    
    return textures;
  }, []);
  
  // Helper function to extract all materials from a Three.js object
  const extractAvailableMaterials = useCallback((object: THREE.Object3D) => {
    const materials: {
      name: string;
      index: number;
      material: THREE.Material;
      baseColorTexture?: string;
      baseColor?: string;
    }[] = [];
    
    let materialIndex = 0;
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
        
        meshMaterials.forEach((material) => {
          // Check if we already have this material
          const existingMaterial = materials.find(m => m.material === material);
          if (existingMaterial) return;
          
          const materialName = material.name || `Material ${materialIndex + 1}`;
          let baseColorTexture: string | undefined;
          let baseColor: string = '#ffffff';
          
          if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
            const stdMat = material as THREE.MeshStandardMaterial;
            
            // Get base color texture if available
            if (stdMat.map?.source?.data?.currentSrc || stdMat.map?.source?.data?.src) {
              baseColorTexture = stdMat.map.source.data.currentSrc || stdMat.map.source.data.src;
            }
            
            // Get base color
            baseColor = `#${stdMat.color.getHexString()}`;
          }
          
          materials.push({
            name: materialName,
            index: materialIndex,
            material,
            baseColorTexture,
            baseColor
          });
          
          materialIndex++;
        });
      }
    });
    
    return materials;
  }, []);

  // Update shell properties via API
  const updateShellProperty = useCallback(async (property: keyof ShellSettings, value: boolean) => {
    if (!activeSceneId) {
      console.warn('No activeSceneId provided - shell updates will be local only');
      // For now, just update local state when no activeSceneId is available
      setShellSettings(prev => ({ ...prev, [property]: value }));
      return;
    }
    
    setIsUpdatingShell(true);
    try {
      // Update local state optimistically
      setShellSettings(prev => ({ ...prev, [property]: value }));
      
      // For visibility, it's client-side only - no API call needed
      if (property === 'visible') {
        // TODO: Update 3D scene shell visibility directly
        return;
      }
      
      // For shadow settings, call the backend API using updateScene
      const updateBody: SceneUpdateRequest = {} as any;
      if (property === 'castShadow') {
        (updateBody as any).shellCastShadow = value;
      } else if (property === 'receiveShadow') {
        (updateBody as any).shellReceiveShadow = value;
      }
      
      // Call the backend API to update shell properties
      await scenesApi.updateScene(activeSceneId, updateBody, manifest?.scene?.version?.toString());
      
      
      // Refresh scene to reflect changes
      refreshScene();
      
    } catch (error) {
      console.error('Failed to update shell property:', error);
      // Revert optimistic update on error
      setShellSettings(prev => ({ ...prev, [property]: !value }));
      
      // Set user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastError(`Failed to update shell ${property}: ${errorMessage}`);
      
      // Clear error after 5 seconds
      setTimeout(() => setLastError(null), 5000);
    } finally {
      setIsUpdatingShell(false);
    }
  }, [activeSceneId, manifest?.scene?.version, refreshScene]);

  // Update selected item transform properties
  const updateItemTransform = useCallback(async (transform: { position?: any; rotation?: any; scale?: any }) => {
    if (!selectedItemId || !activeSceneId || !selectedItem) {
      console.warn('Cannot update item - missing selectedItemId, activeSceneId, or selectedItem');
      return;
    }
    
    setIsUpdatingItem(true);
    try {
      // Build update request
      const updateRequest: SceneItemUpdateRequest = {} as any;
      
      if (transform.position) {
        (updateRequest as any).positionX = parseFloat(transform.position.x);
        (updateRequest as any).positionY = parseFloat(transform.position.y);
        (updateRequest as any).positionZ = parseFloat(transform.position.z);
      }
      
      if (transform.rotation) {
        (updateRequest as any).rotationX = parseFloat(transform.rotation.x);
        (updateRequest as any).rotationY = parseFloat(transform.rotation.y);
        (updateRequest as any).rotationZ = parseFloat(transform.rotation.z);
      }
      
      if (transform.scale) {
        (updateRequest as any).scaleX = parseFloat(transform.scale.x);
        (updateRequest as any).scaleY = parseFloat(transform.scale.y);
        (updateRequest as any).scaleZ = parseFloat(transform.scale.z);
      }
      
      // Call the backend API to update item
      await scenesApi.updateItem(activeSceneId, selectedItemId, updateRequest, manifest?.scene?.version?.toString());
      
      
      // Update local state
      setSelectedItem(prev => prev ? { ...prev, ...transform } : null);
      
      // Refresh scene to reflect changes
      refreshScene();
      
    } catch (error) {
      console.error('Failed to update item transform:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastError(`Failed to update item transform: ${errorMessage}`);
      setTimeout(() => setLastError(null), 5000);
    } finally {
      setIsUpdatingItem(false);
    }
  }, [selectedItemId, sceneId, selectedItem, manifest?.scene?.version, refreshScene]);
  
  // Scale system handlers
  const handleUnitChange = useCallback((unit: ScaleUnit) => {
    setScaleSettings(prev => ({ ...prev, unit }));
    // TODO: Update 3D scene with new unit display
  }, []);
  
  const handleScaleChange = useCallback((sceneScale: number) => {
    setScaleSettings(prev => ({ ...prev, sceneScale }));
    // TODO: Update 3D scene scale multiplier
  }, []);
  
  
  // Light creation handler
  const handleLightCreated = useCallback((light: THREE.Light) => {
    setCreatedLights(prev => [...prev, light]);
  }, []);
  
  // Light property update handler
  const handleUpdateLightProperty = useCallback((light: THREE.Light, property: string, value: any) => {
    
    try {
      switch (property) {
        case 'intensity':
          light.intensity = value;
          break;
        case 'color':
          light.color.setHex(value.replace('#', '0x'));
          break;
        case 'distance':
          if ('distance' in light) {
            (light as any).distance = value;
          }
          break;
        case 'decay':
          if ('decay' in light) {
            (light as any).decay = value;
          }
          break;
        case 'angle':
          if ('angle' in light) {
            (light as any).angle = value;
          }
          break;
        case 'castShadow':
          light.castShadow = value;
          if (light.shadow) {
            light.shadow.needsUpdate = true;
            // Force shadow map update
            if (light.shadow.map) {
              light.shadow.map.dispose();
              light.shadow.map = null;
            }
          }
          // console.log(`💡 Light ${light.name} castShadow set to:`, value);
          break;
      }
      
      // Force re-render by creating a new array reference
      setCreatedLights(prev => [...prev]);
      
    } catch (error) {
      console.error(`Failed to update light ${property}:`, error);
    }
  }, []);
  
  // Light visibility toggle handler
  const handleToggleLightVisibility = useCallback((light: THREE.Light) => {
    light.visible = !light.visible;
    
    // Also toggle helper visibility if it exists
    if (light.userData.helper) {
      light.userData.helper.visible = light.visible;
    }
    
    // Force re-render
    setCreatedLights(prev => [...prev]);
  }, []);
  
  // Remove light handler
  const handleRemoveLight = useCallback((light: THREE.Light) => {
    
    try {
      // STEP 1: Check if this light or its helper is currently selected and deselect it first
      if (selection.selectedObject) {
        const isLightSelected = 
          selection.selectedObject.object === light ||
          selection.selectedObject.object === light.userData.helper ||
          selection.selectedObject.itemId === light.name;
        
        if (isLightSelected) {
          // Deselect to detach transform controls
          if (typeof deselectObject === 'function') {
            deselectObject();
          }
        }
      }
      
      // STEP 2: Wait a frame for transform controls to detach
      setTimeout(async () => {
        try {
          // Remove helper first (it's usually selected)
          if (light.userData.helper && light.userData.helper.parent) {
            light.userData.helper.parent.remove(light.userData.helper);
          }
          
          // Remove target for directional/spot lights
          if ((light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) && light.target.parent) {
            light.target.parent.remove(light.target);
          }
          
          // Remove light from scene
          if (light.parent) {
            light.parent.remove(light);
          }
          
          // STEP 3: Remove from LightsManager (this will clean up layers panel)
          try {
            const { removeLightFromScene } = await import('./LightsContainer');
            removeLightFromScene(light.name);
          } catch (error) {
            console.warn('Could not import removeLightFromScene:', error);
          }
          
          // STEP 4: Remove from state
          setCreatedLights(prev => prev.filter(l => l.name !== light.name));
          
        } catch (error) {
          console.error(`Failed to remove light ${light.name}:`, error);
        }
      }, 100); // 100ms delay to ensure transform controls are detached
      
    } catch (error) {
      console.error(`Failed to remove light ${light.name}:`, error);
    }
  }, [selection, deselectObject]);
  
  
  
  // Debounced material update for smooth slider interaction
  const materialUpdateTimeoutRef = useRef<number | null>(null);
  const pendingMaterialUpdatesRef = useRef<Partial<SelectedItemState['material']>>({});
  
  const debouncedMaterialUpdate = useCallback((material: Partial<SelectedItemState['material']>) => {
    // DON'T update React state here to avoid camera resets
    // The sliders will use controlled components with their own local state
    
    // Apply immediate 3D object changes without React state updates
    if (selection.selectedObject?.object) {
      // Build material overrides for immediate application
      const materialOverrides: PBRMaterialOverride = { pbr: {} };
      
      if (material.roughness !== undefined) materialOverrides.pbr!.roughnessFactor = material.roughness / 100;
      if (material.metallic !== undefined) materialOverrides.pbr!.metallicFactor = material.metallic / 100;
      if (material.emission !== undefined) {
        const emissiveFactor = material.emission / 100;
        materialOverrides.pbr!.emissiveFactor = [emissiveFactor, emissiveFactor, emissiveFactor];
      }
      if (material.color) {
        const hex = material.color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        materialOverrides.pbr!.baseColorFactor = [r, g, b, 1];
      }
      
      // Apply to 3D object immediately
      const ktx2Loader = (window as any).__lumea_ktx2_loader;
      selection.selectedObject.object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
              applyMaterialOverride(mat, materialOverrides, ktx2Loader).catch(console.warn);
            }
          });
        }
      });
    }
    
    // Accumulate pending updates for backend
    pendingMaterialUpdatesRef.current = { ...pendingMaterialUpdatesRef.current, ...material };
    
    // Debounce backend API calls
    if (materialUpdateTimeoutRef.current) {
      clearTimeout(materialUpdateTimeoutRef.current);
    }
    
    materialUpdateTimeoutRef.current = window.setTimeout(() => {
      const pendingUpdates = pendingMaterialUpdatesRef.current;
      pendingMaterialUpdatesRef.current = {};
      materialUpdateTimeoutRef.current = null;
      
      // Stage material update as delta operation if we have a selected item
      if (selection.selectedObject?.itemId && Object.keys(pendingUpdates).length > 0) {
        // Build API material overrides format
        const apiMaterialOverrides: any = {};
        if (pendingUpdates.roughness !== undefined) apiMaterialOverrides.roughness = pendingUpdates.roughness / 100;
        if (pendingUpdates.metallic !== undefined) apiMaterialOverrides.metallic = pendingUpdates.metallic / 100;
        if (pendingUpdates.emission !== undefined) apiMaterialOverrides.emissive = pendingUpdates.emission / 100;
        if (pendingUpdates.color) apiMaterialOverrides.baseColor = pendingUpdates.color;
        
        stageOperation({
          op: 'update_material',
          id: selection.selectedObject.itemId,
          materialOverrides: apiMaterialOverrides
        });
      }
    }, 300); // 300ms debounce
  }, [selection.selectedObject, stageOperation]);
  
  // Handle material slot selection
  const handleMaterialSlotSelected = useCallback((materialIndex: number) => {
    setSelectedMaterialIndex(materialIndex);
    
    // Extract material properties and textures for the selected material
    if (availableMaterials[materialIndex]) {
      const selectedMaterial = availableMaterials[materialIndex].material;
      
      if (selectedMaterial instanceof THREE.MeshStandardMaterial || 
          selectedMaterial instanceof THREE.MeshPhysicalMaterial) {
        const stdMat = selectedMaterial as THREE.MeshStandardMaterial;
        
        // Update local sliders with selected material properties
        setLocalRoughness(Math.round(stdMat.roughness * 100));
        setLocalMetallic(Math.round(stdMat.metalness * 100));
        setLocalEmission(Math.round(stdMat.emissive.r * 100));
        setLocalColor(`#${stdMat.color.getHexString()}`);
        
        // Update current textures for the selected material using the extraction helper
        const extractedTextures = selection.selectedObject
          ? extractCurrentTextures(selection.selectedObject.object)
          : {
              baseColor: undefined,
              normal: undefined,
              metallicRoughness: undefined,
              emissive: undefined,
              occlusion: undefined,
              opacity: undefined,
            };
        const textures = {
          baseColor: extractedTextures.baseColor,
          normal: extractedTextures.normal,
          metallicRoughness: extractedTextures.metallicRoughness,
          emissive: extractedTextures.emissive,
          occlusion: extractedTextures.occlusion,
          opacity: extractedTextures.opacity,
        };
        
        setCurrentTextures(textures);
      }
    }
  }, [availableMaterials, selection.selectedObject, extractCurrentTextures]);
  
  // Handle texture selection from texture manager
  const handleTextureSelected = useCallback(async (url: string, type: TextureMapType) => {
    if (!selection.selectedObject?.object || availableMaterials.length === 0) {
      console.warn('No selected object or materials for texture application');
      return;
    }
    
    const currentMaterial = availableMaterials[selectedMaterialIndex];  
    if (!currentMaterial) {
      console.warn('No current material selected');
      return;
    }
    
    // Handle texture removal (empty URL)
    if (!url || url.trim() === '') {
      try {
        setIsUpdatingItem(true);
        const material = currentMaterial.material;
        
        if (material instanceof THREE.MeshStandardMaterial || 
            material instanceof THREE.MeshPhysicalMaterial) {
          const stdMat = material as THREE.MeshStandardMaterial;
          
          // Remove the specific texture map
          let textureToRemove: THREE.Texture | null = null;
          
          switch (type) {
            case 'baseColor':
              textureToRemove = stdMat.map;
              stdMat.map = null;
              break;
            case 'normal':
              textureToRemove = stdMat.normalMap;
              stdMat.normalMap = null;
              break;
            case 'metallicRoughness':
              textureToRemove = stdMat.metalnessMap || stdMat.roughnessMap;
              stdMat.metalnessMap = null;
              stdMat.roughnessMap = null;
              break;
            case 'emissive':
              textureToRemove = stdMat.emissiveMap;
              stdMat.emissiveMap = null;
              break;
            case 'occlusion':
              textureToRemove = stdMat.aoMap;
              stdMat.aoMap = null;
              break;
            case 'opacity':
              textureToRemove = stdMat.alphaMap;
              stdMat.alphaMap = null;
              stdMat.transparent = false;
              break;
          }
          
          // Dispose the old texture
          if (textureToRemove) {
            textureToRemove.dispose();
          }
          
          material.needsUpdate = true;
          
          // Update current textures state
          setCurrentTextures(prev => ({
            ...prev,
            [type]: undefined
          }));
          
          // STEP: Stage texture removal as delta operation for backend saving
          if (selection.selectedObject?.itemId) {
            // Build texture removal material overrides for backend
            const materialOverrides: any = {};
            
            // Map texture types to backend field names (set to null for removal)
            switch (type) {
              case 'baseColor':
                materialOverrides.baseColorTexture = null;
                break;
              case 'normal':
                materialOverrides.normalTexture = null;
                break;
              case 'metallicRoughness':
                materialOverrides.metallicRoughnessTexture = null;
                break;
              case 'emissive':
                materialOverrides.emissiveTexture = null;
                break;
              case 'occlusion':
                materialOverrides.occlusionTexture = null;
                break;
              case 'opacity':
                materialOverrides.opacityTexture = null;
                break;
            }
            
            stageOperation({
              op: 'update_material',
              id: selection.selectedObject.itemId,
              materialOverrides
            });
          }
          
          console.log(`Removed ${type} texture from material`);
        }
        
        setShowTextureManager(false);
        return;
        
      } catch (error) {
        console.error('Failed to remove texture:', error);
      } finally {
        setIsUpdatingItem(false);
      }
    }
    
    try {
      // Initialize texture manager with KTX2 loader if needed
      const ktx2Loader = (window as any).__lumea_ktx2_loader;
      if (ktx2Loader && !textureManager.getCacheStats().cachedTextures) {
        textureManager.initialize(ktx2Loader);
      }
      
      // Apply texture to all materials in selected object
      const promises: Promise<void>[] = [];
      selection.selectedObject.object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial || 
                material instanceof THREE.MeshPhysicalMaterial) {
              const promise = textureManager.swapMaterialTexture(material, type, url);
              promises.push(promise);
            }
          });
        }
      });
      
      await Promise.all(promises);
      console.log(`✅ Applied texture ${url} as ${type} to selected object`);
      
      // Update current textures state for thumbnails
      // Extract the texture name from the applied texture
      let appliedTextureName: string | undefined;
      
      // Try to get texture name from the applied material
      selection.selectedObject.object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material && !appliedTextureName) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          for (const material of materials) {
            if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
              const stdMat = material as THREE.MeshStandardMaterial;
              let texture: THREE.Texture | null = null;
              
              switch (type) {
                case 'baseColor': texture = stdMat.map; break;
                case 'normal': texture = stdMat.normalMap; break;
                case 'metallicRoughness': texture = stdMat.metalnessMap || stdMat.roughnessMap; break;
                case 'emissive': texture = stdMat.emissiveMap; break;
                case 'occlusion': texture = stdMat.aoMap; break;
                case 'opacity': texture = stdMat.alphaMap; break;
              }
              
              if (texture?.name) {
                appliedTextureName = texture.name;
                break;
              }
            }
          }
        }
      });
      
      setCurrentTextures(prev => ({
        ...prev,
        [type]: { url, name: appliedTextureName }
      }));
      
      // STEP: Stage texture update as delta operation for backend saving
      if (selection.selectedObject?.itemId) {
        console.log('Staging texture update as delta operation:', {
          itemId: selection.selectedObject.itemId,
          textureType: type,
          textureUrl: url
        });
        
        // Build texture material overrides for backend
        const materialOverrides: any = {};
        
        // Map texture types to backend field names
        switch (type) {
          case 'baseColor':
            materialOverrides.baseColorTexture = url;
            break;
          case 'normal':
            materialOverrides.normalTexture = url;
            break;
          case 'metallicRoughness':
            materialOverrides.metallicRoughnessTexture = url;
            break;
          case 'emissive':
            materialOverrides.emissiveTexture = url;
            break;
          case 'occlusion':
            materialOverrides.occlusionTexture = url;
            break;
          case 'opacity':
            materialOverrides.opacityTexture = url;
            break;
        }
        
        stageOperation({
          op: 'update_material',
          id: selection.selectedObject.itemId,
          materialOverrides
        });
      }
      
      // Close texture manager
      setShowTextureManager(false);
      
    } catch (error) {
      console.error('❌ Failed to apply texture:', error);
      throw error;
    }
  }, [selection.selectedObject, stageOperation]);
  
  // Open texture manager for specific texture type
  const openTextureManager = useCallback((textureType: TextureMapType) => {
    setCurrentTextureType(textureType);
    setShowTextureManager(true);
  }, []);
  
  // Get current texture URL for the selected type
  const getCurrentTextureUrl = useCallback((textureType: TextureMapType): string | undefined => {
    const textureData = (() => {
      switch (textureType) {
        case 'baseColor': return currentTextures.baseColor;
        case 'normal': return currentTextures.normal;
        case 'metallicRoughness': return currentTextures.metallicRoughness;
        case 'emissive': return currentTextures.emissive;
        case 'occlusion': return currentTextures.occlusion;
        case 'opacity': return currentTextures.opacity;
        default: return undefined;
      }
    })();
    
    const url = textureData?.url;
    return url;
  }, [currentTextures]);
  
  // Get current texture name for the selected type
  const getCurrentTextureName = useCallback((textureType: TextureMapType): string | undefined => {
    const textureData = (() => {
      switch (textureType) {
        case 'baseColor': return currentTextures.baseColor;
        case 'normal': return currentTextures.normal;
        case 'metallicRoughness': return currentTextures.metallicRoughness;
        case 'emissive': return currentTextures.emissive;
        case 'occlusion': return currentTextures.occlusion;
        case 'opacity': return currentTextures.opacity;
        default: return undefined;
      }
    })();
    
    return textureData?.name;
  }, [currentTextures]);
  
  // Reset material to default values
  const handleResetMaterial = useCallback(async () => {
    if (!selection.selectedObject?.object) {
      console.warn('No selected object for material reset');
      return;
    }
    
    try {
      setIsUpdatingItem(true);
      setLastError(null);
      
      // Reset local state values
      setLocalRoughness(50);
      setLocalMetallic(0);
      setLocalEmission(0);
      setLocalColor('#ffffff');
      
      // Clear current textures
      setCurrentTextures({});
      
      // Apply default material properties to all materials in the selected object
      selection.selectedObject.object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial || 
                material instanceof THREE.MeshPhysicalMaterial) {
              const stdMat = material as THREE.MeshStandardMaterial;
              
              // Reset material properties to defaults
              stdMat.roughness = 0.5;
              stdMat.metalness = 0;
              stdMat.emissive.setScalar(0);
              stdMat.color.set('#ffffff');
              
              // Remove all texture maps
              if (stdMat.map) {
                stdMat.map.dispose();
                stdMat.map = null;
              }
              if (stdMat.normalMap) {
                stdMat.normalMap.dispose();
                stdMat.normalMap = null;
              }
              if (stdMat.metalnessMap) {
                stdMat.metalnessMap.dispose();
                stdMat.metalnessMap = null;
              }
              if (stdMat.roughnessMap) {
                stdMat.roughnessMap.dispose();
                stdMat.roughnessMap = null;
              }
              if (stdMat.emissiveMap) {
                stdMat.emissiveMap.dispose();
                stdMat.emissiveMap = null;
              }
              if (stdMat.aoMap) {
                stdMat.aoMap.dispose();
                stdMat.aoMap = null;
              }
              if (stdMat.alphaMap) {
                stdMat.alphaMap.dispose();
                stdMat.alphaMap = null;
                stdMat.transparent = false;
              }
              
              // Mark material for update
              material.needsUpdate = true;
            }
          });
        }
      });
      
      // STEP: Stage material reset as delta operation for backend saving
      if (selection.selectedObject?.itemId) {
        console.log('📤 Staging material reset as delta operation:', {
          itemId: selection.selectedObject.itemId
        });
        
        // Build material reset overrides for backend (default values)
        const materialOverrides: any = {
          roughness: 0.5,
          metallic: 0,
          emissive: 0,
          baseColor: '#ffffff',
          // Remove all textures by setting to null
          baseColorTexture: null,
          normalTexture: null,
          metallicRoughnessTexture: null,
          emissiveTexture: null,
          occlusionTexture: null,
          opacityTexture: null
        };
        
        stageOperation({
          op: 'update_material',
          id: selection.selectedObject.itemId,
          materialOverrides
        });
      }
      
      console.log('Material reset to default values');
      
    } catch (error) {
      console.error('Failed to reset material:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset material';
      setLastError(errorMessage);
    } finally {
      setIsUpdatingItem(false);
    }
  }, [selection.selectedObject, stageOperation]);
  
  // Update environment lighting
  const updateEnvironmentLighting = useCallback(async (settings: Partial<EnvironmentSettings>) => {
    if (!activeSceneId) {
      console.warn('Cannot update environment - missing activeSceneId');
      return;
    }
    
    setIsUpdatingEnvironment(true);
    try {
      // Update local state optimistically
      setEnvironmentSettings(prev => ({ ...prev, ...settings }));
      
      // Build scene update request
      const updateRequest: SceneUpdateRequest = {} as any;
      if (settings.intensity !== undefined) (updateRequest as any).envIntensity = settings.intensity / 100;
      if (settings.exposure !== undefined) (updateRequest as any).exposure = settings.exposure;
      
      // Call the backend API
      await scenesApi.updateScene(activeSceneId, updateRequest, manifest?.scene?.version?.toString());
      
      console.log('Successfully updated environment lighting');
      
      // Refresh scene to reflect changes
      refreshScene();
      
    } catch (error) {
      console.error('Failed to update environment lighting:', error);
      // Revert optimistic update on error
      setEnvironmentSettings(prev => ({ ...prev, ...Object.keys(settings).reduce((acc, key) => ({ ...acc, [key]: prev[key as keyof EnvironmentSettings] }), {}) }));
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastError(`Failed to update lighting: ${errorMessage}`);
      setTimeout(() => setLastError(null), 5000);
    } finally {
      setIsUpdatingEnvironment(false);
    }
  }, [activeSceneId, manifest?.scene?.version, refreshScene]);
  
  // Load selected item data when selectedItemId changes or selection changes
  useEffect(() => {
    // Priority 1: Check if we have a selected object from SelectionContext (includes debug objects)
    if (selection.selectedObject) {
      const obj = selection.selectedObject.object;
      const meta = obj.userData.meta || {};
      
      setSelectedItem({
        id: selection.selectedObject.itemId,
        name: meta.name || obj.name || selection.selectedObject.itemId,
        position: {
          x: parseFloat(obj.position.x.toFixed(3)),
          y: parseFloat(obj.position.y.toFixed(3)),
          z: parseFloat(obj.position.z.toFixed(3))
        },
        rotation: {
          x: parseFloat((obj.rotation.x * 180 / Math.PI).toFixed(1)),
          y: parseFloat((obj.rotation.y * 180 / Math.PI).toFixed(1)),
          z: parseFloat((obj.rotation.z * 180 / Math.PI).toFixed(1))
        },
        scale: {
          x: parseFloat(obj.scale.x.toFixed(3)),
          y: parseFloat(obj.scale.y.toFixed(3)),
          z: parseFloat(obj.scale.z.toFixed(3))
        },
        material: extractMaterialProperties(obj)
      });
      
      // Extract available materials from the object
      const materials = extractAvailableMaterials(obj);
      setAvailableMaterials(materials);
      setSelectedMaterialIndex(0); // Select first material by default
      
      // Extract current textures for thumbnails from first material
      if (materials.length > 0) {
        const textures = extractCurrentTextures(obj);
        setCurrentTextures(textures);
      } else {
        setCurrentTextures({});
      }
      
      return;
    }
    
    // Priority 2: Check manifest for scene items (for imported objects)
    if (selectedItemId && manifest) {
      const item = manifest.items.find(item => item.id === selectedItemId);
      if (item) {
        setSelectedItem({
          id: item.id,
          name: item.name || 'Unnamed Item',
          position: {
            x: item.transform?.position?.[0] || 0,
            y: item.transform?.position?.[1] || 0,
            z: item.transform?.position?.[2] || 0
          },
          rotation: {
            x: item.transform?.rotation_euler?.[0] || 0,
            y: item.transform?.rotation_euler?.[1] || 0,
            z: item.transform?.rotation_euler?.[2] || 0
          },
          scale: {
            x: item.transform?.scale?.[0] || 1,
            y: item.transform?.scale?.[1] || 1,
            z: item.transform?.scale?.[2] || 1
          },
          material: {
            roughness: (item.material?.roughness || 0.5) * 100,
            metallic: (item.material?.metallic || 0) * 100,
            emission: (item.material?.emissive || 0) * 100,
            color: item.material?.baseColor || '#ffffff'
          }
        });
        return;
      }
    }
    
    // No selection found
    setSelectedItem(null);
  }, [selectedItemId, manifest, selection.selectedObject, selection.selectedObject?.transformUpdateCount, extractMaterialProperties, extractCurrentTextures, extractAvailableMaterials]);

  if (!show) return null;

  return (
    <aside className={styles.rightSidebar}>
      <div className={styles.propertiesHeader}>
        <div className={styles.propertiesTitleRow}>
          <h2 className={styles.propertiesTitle}>Properties</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className={styles.propertiesClose}
          >
            ×
          </Button>
        </div>
      </div>

      <ScrollArea className={styles.propertiesScrollArea}>
        <div className={styles.propertiesContent}>
          {/* Transform */}
          <div className={styles.propertySection}>
            <h3 className={styles.propertySectionTitle}>
              <Move className="w-4 h-4 mr-2" />
              Transform {selectedItem && `- ${selectedItem.name}`}
            </h3>
            <div className={styles.propertySectionContent}>
              {selectedItem ? (
                <>
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Position</label>
                    <div className={styles.inputGrid}>
                      <input 
                        type="number" 
                        placeholder="X" 
                        className={styles.propertyInput} 
                        value={selectedItem.position.x}
                        onChange={(e) => updateItemTransform({ position: { ...selectedItem.position, x: e.target.value } })}
                        disabled={isUpdatingItem}
                        step="0.1"
                      />
                      <input 
                        type="number" 
                        placeholder="Y" 
                        className={styles.propertyInput} 
                        value={selectedItem.position.y}
                        onChange={(e) => updateItemTransform({ position: { ...selectedItem.position, y: e.target.value } })}
                        disabled={isUpdatingItem}
                        step="0.1"
                      />
                      <input 
                        type="number" 
                        placeholder="Z" 
                        className={styles.propertyInput} 
                        value={selectedItem.position.z}
                        onChange={(e) => updateItemTransform({ position: { ...selectedItem.position, z: e.target.value } })}
                        disabled={isUpdatingItem}
                        step="0.1"
                      />
                    </div>
                  </div>
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Rotation</label>
                    <div className={styles.inputGrid}>
                      <input 
                        type="number" 
                        placeholder="X" 
                        className={styles.propertyInput} 
                        value={selectedItem.rotation.x}
                        onChange={(e) => updateItemTransform({ rotation: { ...selectedItem.rotation, x: e.target.value } })}
                        disabled={isUpdatingItem}
                        step="1"
                      />
                      <input 
                        type="number" 
                        placeholder="Y" 
                        className={styles.propertyInput} 
                        value={selectedItem.rotation.y}
                        onChange={(e) => updateItemTransform({ rotation: { ...selectedItem.rotation, y: e.target.value } })}
                        disabled={isUpdatingItem}
                        step="1"
                      />
                      <input 
                        type="number" 
                        placeholder="Z" 
                        className={styles.propertyInput} 
                        value={selectedItem.rotation.z}
                        onChange={(e) => updateItemTransform({ rotation: { ...selectedItem.rotation, z: e.target.value } })}
                        disabled={isUpdatingItem}
                        step="1"
                      />
                    </div>
                  </div>
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Scale</label>
                    <div className={styles.inputGrid}>
                      <input 
                        type="number" 
                        placeholder="X" 
                        className={styles.propertyInput} 
                        value={selectedItem.scale.x}
                        onChange={(e) => updateItemTransform({ scale: { ...selectedItem.scale, x: e.target.value } })}
                        disabled={isUpdatingItem}
                        step="0.1"
                        min="0.01"
                      />
                      <input 
                        type="number" 
                        placeholder="Y" 
                        className={styles.propertyInput} 
                        value={selectedItem.scale.y}
                        onChange={(e) => updateItemTransform({ scale: { ...selectedItem.scale, y: e.target.value } })}
                        disabled={isUpdatingItem}
                        step="0.1"
                        min="0.01"
                      />
                      <input 
                        type="number" 
                        placeholder="Z" 
                        className={styles.propertyInput} 
                        value={selectedItem.scale.z}
                        onChange={(e) => updateItemTransform({ scale: { ...selectedItem.scale, z: e.target.value } })}
                        disabled={isUpdatingItem}
                        step="0.1"
                        min="0.01"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.propertyGroup}>
                  <span className={styles.propertyLabel} style={{ opacity: 0.6 }}>Select an object to edit its transform</span>
                </div>
              )}
            </div>
          </div>

          {/* Material */}
          <div className={styles.propertySection}>
            <h3 className={styles.propertySectionTitle}>
              <Palette className="w-4 h-4 mr-2" />
              Material
              {currentTextures.baseColor && (
                <span className="ml-2 inline-flex items-center gap-2 text-xs text-gray-400">
                  <span>Base Map:</span>
                  <span className="inline-block w-6 h-6 rounded overflow-hidden border border-gray-600 align-middle">
                    <img 
                      src={currentTextures.baseColor?.url} 
                      alt="Base Color Map"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </span>
                </span>
              )}
            </h3>
            <div className={styles.propertySectionContent}>
              {selectedItem ? (
                <>
                  <div className={styles.materialSwatches}>
                    {/* Material Slots */}
                    <div className={styles.materialSlots}>
                      {availableMaterials.length > 0 ? (
                        availableMaterials.map((material, index) => (
                          <div 
                            key={material.index}
                            className={`${styles.materialSlot} ${index === selectedMaterialIndex ? styles.materialSlotSelected : ''}`}
                            onClick={() => handleMaterialSlotSelected(index)}
                            style={{ cursor: isUpdatingItem ? 'wait' : 'pointer' }}
                            title={`Select ${material.name}`}
                          >
                            {material.baseColorTexture ? (
                              <img 
                                src={material.baseColorTexture} 
                                alt={material.name}
                                className={styles.materialSlotImage}
                              />
                            ) : (
                              <div 
                                className={styles.materialSlotColor}
                                style={{ backgroundColor: material.baseColor }}
                              ></div>
                            )}
                            <span className={styles.materialSlotName}>{material.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className={styles.noMaterials}>
                          <span>No materials found</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Reset Material Button */}
                    {availableMaterials.length > 0 && (
                      <button
                        className={styles.resetMaterialButton}
                        onClick={handleResetMaterial}
                        disabled={isUpdatingItem}
                        title="Reset current material to default values"
                      >
                        <span>Reset Current Material</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Texture Maps Section */}
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Texture Maps</label>
                    <div className={styles.textureMapGrid}>
                      <button
                        className={`${styles.textureMapButton} ${currentTextures.baseColor ? styles.textureMapButtonWithTexture : ''}`}
                        onClick={() => openTextureManager('baseColor')}
                        disabled={isUpdatingItem}
                        title="Apply Base Color Texture"
                      >
                        {currentTextures.baseColor ? (
                          <div className={styles.textureMapThumbnail}>
                            <img 
                              src={currentTextures.baseColor?.url} 
                              alt="Base Color"
                              className={styles.textureMapThumbnailImage}
                            />
                          </div>
                        ) : (
                          <ImageIcon className="w-4 h-4 mr-1" />
                        )}
                        <span>Base Color</span>
                      </button>
                      
                      <button
                        className={`${styles.textureMapButton} ${currentTextures.normal ? styles.textureMapButtonWithTexture : ''}`}
                        onClick={() => openTextureManager('normal')}
                        disabled={isUpdatingItem}
                        title="Apply Normal Map"
                      >
                        {currentTextures.normal ? (
                          <div className={styles.textureMapThumbnail}>
                            <img 
                              src={currentTextures.normal?.url} 
                              alt="Normal Map"
                              className={styles.textureMapThumbnailImage}
                            />
                          </div>
                        ) : (
                          <ImageIcon className="w-4 h-4 mr-1" />
                        )}
                        <span>Normal</span>
                      </button>
                      
                      <button
                        className={styles.textureMapButton}
                        onClick={() => openTextureManager('metallicRoughness')}
                        disabled={isUpdatingItem}
                        title="Apply Metallic Roughness Map"
                      >
                        <ImageIcon className="w-4 h-4 mr-1" />
                        <span>Metal/Rough</span>
                      </button>
                      
                      <button
                        className={styles.textureMapButton}
                        onClick={() => openTextureManager('emissive')}
                        disabled={isUpdatingItem}
                        title="Apply Emissive Map"
                      >
                        <ImageIcon className="w-4 h-4 mr-1" />
                        <span>Emissive</span>
                      </button>
                      
                      <button
                        className={styles.textureMapButton}
                        onClick={() => openTextureManager('occlusion')}
                        disabled={isUpdatingItem}
                        title="Apply Occlusion Map"
                      >
                        <ImageIcon className="w-4 h-4 mr-1" />
                        <span>Occlusion</span>
                      </button>
                      
                      <button
                        className={styles.textureMapButton}
                        onClick={() => openTextureManager('opacity')}
                        disabled={isUpdatingItem}
                        title="Apply Opacity Map"
                      >
                        <ImageIcon className="w-4 h-4 mr-1" />
                        <span>Opacity</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Roughness</label>
                    <Slider 
                      value={localRoughness} 
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setLocalRoughness(value);
                        debouncedMaterialUpdate({ roughness: value });
                      }}
                      max={100} 
                      step={1} 
                      className={styles.sliderContainer}
                      disabled={isUpdatingItem}
                    />
                  </div>
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Metallic</label>
                    <Slider 
                      value={localMetallic} 
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setLocalMetallic(value);
                        debouncedMaterialUpdate({ metallic: value });
                      }}
                      max={100} 
                      step={1} 
                      className={styles.sliderContainer}
                      disabled={isUpdatingItem}
                    />
                  </div>
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Emission</label>
                    <Slider 
                      value={localEmission} 
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setLocalEmission(value);
                        debouncedMaterialUpdate({ emission: value });
                      }}
                      max={100} 
                      step={1} 
                      className={styles.sliderContainer}
                      disabled={isUpdatingItem}
                    />
                  </div>
                  
                  {/* Material Update Feedback */}
                  {isUpdatingItem && (
                    <div className="mt-3 px-3 py-2 bg-[var(--glass-yellow)]/20 border border-[var(--glass-yellow)] rounded text-xs text-[var(--glass-black)] flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-[var(--glass-yellow)] border-t-transparent rounded-full animate-spin"></div>
                      Applying material changes...
                    </div>
                  )}
                  
                  {/* Current Material Values Display */}
                  <div className="mt-3 p-2 bg-gray-800/50 rounded border border-gray-600">
                    <div className="text-xs text-gray-400 mb-1">Current Values:</div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Roughness:</span>
                        <span className="font-mono">{localRoughness}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Metallic:</span>
                        <span className="font-mono">{localMetallic}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Emission:</span>
                        <span className="font-mono">{localEmission}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Color:</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border border-gray-500"
                            style={{ backgroundColor: localColor }}
                          ></div>
                          <span className="font-mono text-xs">{localColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Error Display */}
                  {lastError && (
                    <div className="mt-3 px-3 py-2 bg-red-900/30 border border-red-600 rounded text-xs text-red-200">
                      <div className="font-medium">⚠️ Error:</div>
                      <div>{lastError}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.propertyGroup}>
                  <span className={styles.propertyLabel} style={{ opacity: 0.6 }}>Select an object to edit its material</span>
                </div>
              )}
            </div>
          </div>

          {/* Lighting */}
          <div className={styles.propertySection}>
            <h3 className={styles.propertySectionTitle}>
              <Lightbulb className="w-4 h-4 mr-2" />
              Lighting (Environment)
            </h3>
            <div className={styles.propertySectionContent}>
              {/* Default Ambient Light Toggle */}
              <div className={styles.propertyGroup}>
                <div className="flex items-center justify-between">
                  <label className={styles.propertyLabel}>Default Ambient Light</label>
                  <button
                    onClick={() => {
                      setDefaultLightEnabled(!defaultLightEnabled);
                    }}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      defaultLightEnabled 
                        ? 'bg-[var(--glass-yellow)] text-[var(--glass-black)] hover:bg-[var(--glass-yellow-dark)]' 
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {defaultLightEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Provides minimal base lighting to prevent complete darkness
                </div>
              </div>
              
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Intensity</label>
                <Slider 
                  value={environmentSettings.intensity} 
                  onChange={(e) => updateEnvironmentLighting({ intensity: parseFloat(e.target.value) })}
                  max={200} 
                  step={5} 
                  className={styles.sliderContainer}
                  disabled={isUpdatingEnvironment}
                />
              </div>
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Shadow Strength</label>
                <Slider 
                  value={environmentSettings.shadowStrength} 
                  onChange={(e) => updateEnvironmentLighting({ shadowStrength: parseFloat(e.target.value) })}
                  max={100} 
                  step={1} 
                  className={styles.sliderContainer}
                  disabled={isUpdatingEnvironment}
                />
              </div>
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Exposure</label>
                <Slider 
                  value={environmentSettings.exposure * 100} 
                  onChange={(e) => updateEnvironmentLighting({ exposure: parseFloat(e.target.value) / 100 })}
                  max={300} 
                  min={10}
                  step={5} 
                  className={styles.sliderContainer}
                  disabled={isUpdatingEnvironment}
                />
              </div>
              {isUpdatingEnvironment && (
                <div style={{ padding: '4px 8px', fontSize: '11px', opacity: 0.7 }}>
                  Updating environment...
                </div>
              )}
              
              {/* Current HDR Display */}
              {currentHdriUrl && (
                <div className={styles.propertyGroup}>
                  <label className={styles.propertyLabel}>Current HDR Environment</label>
                  <div className="text-xs bg-gray-800 p-2 rounded border border-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-300 font-medium">
                        {currentHdriUrl.split('/').pop()?.split('?')[0] || 'HDR File'}
                      </span>
                    </div>
                    <div className="text-gray-500 mt-1 break-all">
                      {currentHdriUrl.substring(0, 60)}...
                    </div>
                  </div>
                </div>
              )}
              
              {/* HDR Environment Upload */}
              <HdrEnvironmentUpload
                sceneId={activeSceneId || undefined}
                currentHdriUrl={currentHdriUrl ?? undefined}
                onHdriUpdate={(hdriUrl) => {
                  console.log('🌄 PropertiesPanel: HDR URL updated:', hdriUrl);
                  setCurrentHdriUrl(hdriUrl);
                }}
                onSceneRefresh={() => {
                  console.log('🌄 PropertiesPanel: Scene refresh requested');
                  refreshScene();
                }}
              />
            </div>
          </div>
          
          {/* Light Creation */}
          <div className={styles.propertySection}>
            <h3 className={styles.propertySectionTitle}>
              <Lightbulb className="w-4 h-4 mr-2" />
              Add Lights
            </h3>
            <div className={styles.propertySectionContent}>
              <LightCreation onLightCreated={handleLightCreated} />
            </div>
          </div>
          
          {/* Dynamic Lights Management */}
          {createdLights.length > 0 && (
            <div className={styles.propertySection}>
              <h3 className={styles.propertySectionTitle}>
                <Lightbulb className="w-4 h-4 mr-2" />
                Dynamic Lights ({createdLights.length})
              </h3>
              <div className={styles.propertySectionContent}>
                <div className="space-y-4">
                  {createdLights.map((light, index) => (
                    <div key={light.name || index} className="border border-gray-600 rounded p-3 bg-gray-800/50">
                      {/* Light Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            light.visible ? 'bg-green-400' : 'bg-gray-400'
                          }`}></div>
                          <span className="font-medium text-sm">
                            {light.userData?.meta?.name || light.name}
                          </span>
                          <span className="text-xs opacity-60 bg-gray-700 px-2 py-1 rounded">
                            {light.userData?.meta?.lightType || light.type}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleToggleLightVisibility(light)}
                          className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                        >
                          {light.visible ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      
                      {/* Light Controls */}
                      <div className="space-y-2">
                        {/* Intensity Control */}
                        <div className={styles.propertyGroup}>
                          <label className="text-xs font-medium text-gray-300">Intensity</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max={light.userData?.meta?.lightType === 'directional' ? '5' : '10'}
                              step="0.1"
                              value={light.intensity}
                              onChange={(e) => handleUpdateLightProperty(light, 'intensity', parseFloat(e.target.value))}
                              className={styles.sliderContainer}
                              disabled={isUpdatingItem}
                            />
                            <span className="text-xs text-gray-400 min-w-[2.5rem]">{light.intensity.toFixed(1)}</span>
                          </div>
                        </div>
                        
                        {/* Color Control */}
                        <div className={styles.propertyGroup}>
                          <label className="text-xs font-medium text-gray-300">Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={`#${light.color.getHexString()}`}
                              onChange={(e) => handleUpdateLightProperty(light, 'color', e.target.value)}
                              className="w-8 h-6 rounded border border-gray-600 cursor-pointer"
                              disabled={isUpdatingItem}
                            />
                            <span className="text-xs text-gray-400">{`#${light.color.getHexString().toUpperCase()}`}</span>
                          </div>
                        </div>
                        
                        {/* Position Display */}
                        <div className={styles.propertyGroup}>
                          <label className="text-xs font-medium text-gray-300">Position</label>
                          <div className="text-xs text-gray-400 font-mono">
                            X: {light.position.x.toFixed(1)} Y: {light.position.y.toFixed(1)} Z: {light.position.z.toFixed(1)}
                          </div>
                        </div>
                        
                        {/* Point/Spot Light Specific Controls */}
                        {(light.userData?.meta?.lightType === 'point' || light.userData?.meta?.lightType === 'spot') && (
                          <>
                            {/* Distance Control */}
                            <div className={styles.propertyGroup}>
                              <label className="text-xs font-medium text-gray-300">Range</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="1"
                                  max="100"
                                  step="1"
                                  value={(light as any).distance || 0}
                                  onChange={(e) => handleUpdateLightProperty(light, 'distance', parseFloat(e.target.value))}
                                  className={styles.sliderContainer}
                                  disabled={isUpdatingItem}
                                />
                                <span className="text-xs text-gray-400 min-w-[2.5rem]">{((light as any).distance || 0).toFixed(0)}</span>
                              </div>
                            </div>
                            
                            {/* Decay Control */}
                            <div className={styles.propertyGroup}>
                              <label className="text-xs font-medium text-gray-300">Decay</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="2"
                                  step="0.1"
                                  value={(light as any).decay || 1}
                                  onChange={(e) => handleUpdateLightProperty(light, 'decay', parseFloat(e.target.value))}
                                  className={styles.sliderContainer}
                                  disabled={isUpdatingItem}
                                />
                                <span className="text-xs text-gray-400 min-w-[2.5rem]">{((light as any).decay || 1).toFixed(1)}</span>
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Spot Light Specific Controls */}
                        {light.userData?.meta?.lightType === 'spot' && (
                          <div className={styles.propertyGroup}>
                            <label className="text-xs font-medium text-gray-300">Angle (degrees)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="1"
                                max="90"
                                step="1"
                                value={((light as any).angle || Math.PI/6) * 180 / Math.PI}
                                onChange={(e) => handleUpdateLightProperty(light, 'angle', parseFloat(e.target.value) * Math.PI / 180)}
                                className={styles.sliderContainer}
                                disabled={isUpdatingItem}
                              />
                              <span className="text-xs text-gray-400 min-w-[2.5rem]">
                                {(((light as any).angle || Math.PI/6) * 180 / Math.PI).toFixed(0)}°
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Shadow Control */}
                        <div className={styles.propertyGroup}>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-gray-300">Cast Shadows</label>
                            <div 
                              className={`${styles.toggleSwitch} ${light.castShadow ? styles.toggleActive : ''}`}
                              onClick={() => handleUpdateLightProperty(light, 'castShadow', !light.castShadow)}
                              style={{ cursor: isUpdatingItem ? 'wait' : 'pointer', opacity: isUpdatingItem ? 0.6 : 1, transform: 'scale(0.8)' }}
                            >
                              <div className={styles.toggleKnob}></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Remove Light Button */}
                        <div className="pt-2 border-t border-gray-700">
                          <button
                            onClick={() => handleRemoveLight(light)}
                            className="text-xs px-3 py-1 rounded bg-red-600/20 text-red-300 hover:bg-red-600/30 transition-colors w-full"
                            disabled={isUpdatingItem}
                          >
                            Remove Light
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Scene Scale */}
          <div className={styles.propertySection}>
            <div className={styles.propertySectionContent}>
              <ScaleUnitSystem
                currentUnit={scaleSettings.unit}
                sceneScale={scaleSettings.sceneScale}
                onUnitChange={handleUnitChange}
                onScaleChange={handleScaleChange}
                className={styles.sliderContainer}
              />
            </div>
          </div>

          
          {/* Shell Settings */}
          <div className={styles.propertySection}>
            <h3 className={styles.propertySectionTitle}>
              <Eye className="w-4 h-4 mr-2" />
              Shell Settings
            </h3>
            <div className={styles.propertySectionContent}>
              {/* Error Message */}
              {lastError && (
                <div style={{ 
                  padding: '6px 8px', 
                  marginBottom: '8px', 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)', 
                  borderRadius: '4px', 
                  fontSize: '11px', 
                  color: '#fecaca',
                  wordBreak: 'break-word'
                }}>
                  {lastError}
                </div>
              )}
              
              <div className={styles.propertyGroup}>
                <span className={styles.propertyLabel}>Shell Cast Shadow</span>
                <div 
                  className={`${styles.toggleSwitch} ${shellSettings.castShadow ? styles.toggleActive : ''}`}
                  onClick={() => updateShellProperty('castShadow', !shellSettings.castShadow)}
                  style={{ cursor: isUpdatingShell ? 'wait' : 'pointer', opacity: isUpdatingShell ? 0.6 : 1 }}
                >
                  <div className={styles.toggleKnob}></div>
                </div>
              </div>
              
              <div className={styles.propertyGroup}>
                <span className={styles.propertyLabel}>Shell Receive Shadow</span>
                <div 
                  className={`${styles.toggleSwitch} ${shellSettings.receiveShadow ? styles.toggleActive : ''}`}
                  onClick={() => updateShellProperty('receiveShadow', !shellSettings.receiveShadow)}
                  style={{ cursor: isUpdatingShell ? 'wait' : 'pointer', opacity: isUpdatingShell ? 0.6 : 1 }}
                >
                  <div className={styles.toggleKnob}></div>
                </div>
              </div>
              
              <div className={styles.propertyGroup}>
                <span className={styles.propertyLabel}>Shell Visibility</span>
                <div 
                  className={`${styles.toggleSwitch} ${shellSettings.visible ? styles.toggleActive : ''}`}
                  onClick={() => updateShellProperty('visible', !shellSettings.visible)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.toggleKnob}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      
      {/* Texture Manager Modal */}
      <TextureManager
        show={showTextureManager}
        onClose={() => setShowTextureManager(false)}
        onTextureSelected={handleTextureSelected}
        currentTextureType={currentTextureType}
        currentTextureUrl={getCurrentTextureUrl(currentTextureType)}
        currentTextureName={getCurrentTextureName(currentTextureType)}
      />
    </aside>
  );
});

PropertiesPanel.displayName = 'PropertiesPanel';

export default PropertiesPanel;