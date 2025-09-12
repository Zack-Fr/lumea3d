import React, { useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { Button } from "../ui/Button";
import { Slider } from "../ui/Slider";
import { ScrollArea } from "../ui/ScrollArea";
import { 
  Move,
  Palette,
  Lightbulb,
  Eye,
  Ruler
} from "lucide-react";
import ScaleUnitSystem, { ScaleUnit } from './ScaleUnitSystem';
import HdrEnvironmentUpload from './HdrEnvironmentUpload';
import LightCreation from './LightCreation';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';
import { scenesApi, SceneItemUpdateRequest, SceneUpdateRequest } from '../../services/scenesApi';
import { useSceneContext } from '../../contexts/SceneContext';
import { useSelection } from '../../features/scenes/SelectionContext';
import { useLightingControls } from '../../hooks/useLightingControls';
import { applyMaterialOverride, PBRMaterialOverride } from '../../utils/textureSystem';

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
  
  // Use contextSceneId as fallback if prop sceneId is not available
  const activeSceneId = sceneId || contextSceneId;
  
  console.log('🏠 PropertiesPanel: Scene ID debug', {
    propSceneId: sceneId,
    contextSceneId: contextSceneId,
    activeSceneId: activeSceneId,
    hasManifest: !!manifest
  });
  
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
  
  // Use a simple timer to periodically update light positions while transforming
  useEffect(() => {
    let intervalId: number;
    
    if (selection.isTransforming) {
      console.log('💡 PropertiesPanel: Starting live position updates (transforming)'); 
      // Update positions every 50ms while transforming for live feedback
      intervalId = window.setInterval(() => {
        console.log('💡 PropertiesPanel: Live position update tick');
        setCreatedLights(prev => [...prev]); // This will cause a re-render with current positions
      }, 50);
    } else {
      console.log('💡 PropertiesPanel: Stopping live position updates (not transforming)');
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
          console.log('✨ Environment: Loading settings from manifest:', newSettings);
          return newSettings;
        }
        return prevSettings;
      });
    }
  }, [manifest?.scene?.envIntensity, manifest?.scene?.exposure]);
  
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
        console.log('Shell visibility changed:', value);
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
      
      console.log(`Successfully updated shell ${property} to ${value} for scene ${activeSceneId}`);
      
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
      
      console.log(`Successfully updated item ${selectedItemId} transform`);
      
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
    console.log('Scene unit changed to:', unit);
  }, []);
  
  const handleScaleChange = useCallback((sceneScale: number) => {
    setScaleSettings(prev => ({ ...prev, sceneScale }));
    // TODO: Update 3D scene scale multiplier
    console.log('Scene scale changed to:', sceneScale);
  }, []);
  
  
  // Light creation handler
  const handleLightCreated = useCallback((light: THREE.Light) => {
    console.log('💡 Light created in PropertiesPanel:', light.name);
    setCreatedLights(prev => [...prev, light]);
  }, []);
  
  // Light property update handler
  const handleUpdateLightProperty = useCallback((light: THREE.Light, property: string, value: any) => {
    console.log(`💡 Updating light ${light.name} ${property}:`, value);
    
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
          console.log(`💡 Light ${light.name} castShadow set to:`, value);
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
    console.log(`💡 Light ${light.name} visibility:`, light.visible);
    
    // Also toggle helper visibility if it exists
    if (light.userData.helper) {
      light.userData.helper.visible = light.visible;
    }
    
    // Force re-render
    setCreatedLights(prev => [...prev]);
  }, []);
  
  // Remove light handler
  const handleRemoveLight = useCallback((light: THREE.Light) => {
    console.log(`💡 Removing light:`, light.name);
    
    try {
      // STEP 1: Check if this light or its helper is currently selected and deselect it first
      if (selection.selectedObject) {
        const isLightSelected = 
          selection.selectedObject.object === light ||
          selection.selectedObject.object === light.userData.helper ||
          selection.selectedObject.itemId === light.name;
        
        if (isLightSelected) {
          console.log(`💡 Deselecting light before removal:`, light.name);
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
            console.log(`💡 Helper removed for light:`, light.name);
          }
          
          // Remove target for directional/spot lights
          if ((light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) && light.target.parent) {
            light.target.parent.remove(light.target);
            console.log(`💡 Target removed for light:`, light.name);
          }
          
          // Remove light from scene
          if (light.parent) {
            light.parent.remove(light);
            console.log(`💡 Light removed from scene:`, light.name);
          }
          
          // STEP 3: Remove from LightsManager (this will clean up layers panel)
          try {
            const { removeLightFromScene } = await import('./LightsContainer');
            removeLightFromScene(light.name);
            console.log(`💡 Light removed from LightsManager:`, light.name);
          } catch (error) {
            console.warn('Could not import removeLightFromScene:', error);
          }
          
          // STEP 4: Remove from state
          setCreatedLights(prev => prev.filter(l => l.name !== light.name));
          
          console.log(`✓ Light ${light.name} removed successfully`);
          
        } catch (error) {
          console.error(`Failed to remove light ${light.name} in timeout:`, error);
        }
      }, 100); // 100ms delay to ensure transform controls are detached
      
    } catch (error) {
      console.error(`Failed to remove light ${light.name}:`, error);
    }
  }, [selection, deselectObject]);
  
  // Update item material properties
  const updateItemMaterial = useCallback(async (material: Partial<SelectedItemState['material']>) => {
    if (!selectedItemId || !sceneId) {
      console.warn('Cannot update material - missing selectedItemId or sceneId');
      return;
    }
    
    setIsUpdatingItem(true);
    try {
      // Build material overrides in the correct format
      const materialOverrides: PBRMaterialOverride = {
        pbr: {}
      };
      
      if (material.roughness !== undefined) materialOverrides.pbr!.roughnessFactor = material.roughness / 100;
      if (material.metallic !== undefined) materialOverrides.pbr!.metallicFactor = material.metallic / 100;
      if (material.emission !== undefined) {
        const emissiveFactor = material.emission / 100;
        materialOverrides.pbr!.emissiveFactor = [emissiveFactor, emissiveFactor, emissiveFactor];
      }
      if (material.color) {
        // Convert hex color to RGB array
        const hex = material.color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        materialOverrides.pbr!.baseColorFactor = [r, g, b, 1];
      }
      
      // STEP 1: Apply changes immediately to the 3D object for instant feedback
      if (selection.selectedObject?.object) {
        console.log('🎨 Applying immediate material update to 3D object:', selectedItemId);
        
        // Apply material changes directly to all materials in the selected object
        try {
          const ktx2Loader = (window as any).__lumea_ktx2_loader;
          let materialCount = 0;
          
          selection.selectedObject.object.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach(async (mat) => {
                if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                  try {
                    await applyMaterialOverride(mat, materialOverrides, ktx2Loader);
                    materialCount++;
                  } catch (matError) {
                    console.warn('⚠️ Failed to apply override to material:', mat.name, matError);
                  }
                }
              });
            }
          });
          
          console.log(`✅ Immediate material updates applied to ${materialCount} materials`);
        } catch (error) {
          console.warn('⚠️ Failed to apply immediate material update:', error);
        }
      }
      
      // STEP 2: Build API request format (legacy format for backend)
      const apiMaterialOverrides: any = {};
      if (material.roughness !== undefined) apiMaterialOverrides.roughness = material.roughness / 100;
      if (material.metallic !== undefined) apiMaterialOverrides.metallic = material.metallic / 100;
      if (material.emission !== undefined) apiMaterialOverrides.emissive = material.emission / 100;
      if (material.color) apiMaterialOverrides.baseColor = material.color;
      
      const updateRequest: SceneItemUpdateRequest = {
        materialOverrides: apiMaterialOverrides
      } as any;
      
      // STEP 3: Call the backend API to persist changes
      await scenesApi.updateItem(sceneId, selectedItemId, updateRequest, manifest?.scene?.version?.toString());
      
      console.log(`Successfully updated item ${selectedItemId} material in backend`);
      
      // STEP 4: Update local state
      setSelectedItem(prev => prev ? { ...prev, material: { ...prev.material, ...material } } : null);
      
      // Note: We don't call refreshScene() anymore since we applied changes immediately
      
    } catch (error) {
      console.error('Failed to update item material:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastError(`Failed to update material: ${errorMessage}`);
      setTimeout(() => setLastError(null), 5000);
    } finally {
      setIsUpdatingItem(false);
    }
  }, [selectedItemId, sceneId, manifest?.scene?.version, selection.selectedObject]);
  
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
        material: {
          roughness: 50, // Default for debug objects
          metallic: 0,
          emission: 0,
          color: '#ffffff'
        }
      });
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
  }, [selectedItemId, manifest, selection.selectedObject, selection.selectedObject?.transformUpdateCount]);

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
            </h3>
            <div className={styles.propertySectionContent}>
              {selectedItem ? (
                <>
                  <div className={styles.materialSwatches}>
                    <div 
                      className={`${styles.materialSwatch} ${styles.materialSwatchRed}`}
                      onClick={() => updateItemMaterial({ color: '#ff0000' })}
                      style={{ cursor: isUpdatingItem ? 'wait' : 'pointer' }}
                    ></div>
                    <div 
                      className={`${styles.materialSwatch} ${styles.materialSwatchBlue}`}
                      onClick={() => updateItemMaterial({ color: '#0066ff' })}
                      style={{ cursor: isUpdatingItem ? 'wait' : 'pointer' }}
                    ></div>
                    <div 
                      className={`${styles.materialSwatch} ${styles.materialSwatchGreen}`}
                      onClick={() => updateItemMaterial({ color: '#00ff66' })}
                      style={{ cursor: isUpdatingItem ? 'wait' : 'pointer' }}
                    ></div>
                    <div 
                      className={`${styles.materialSwatch} ${styles.materialSwatchYellow}`}
                      onClick={() => updateItemMaterial({ color: '#ffff00' })}
                      style={{ cursor: isUpdatingItem ? 'wait' : 'pointer' }}
                    ></div>
                  </div>
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Roughness</label>
                    <Slider 
                      value={selectedItem.material.roughness} 
                      onChange={(e) => updateItemMaterial({ roughness: parseFloat(e.target.value) })}
                      max={100} 
                      step={1} 
                      className={styles.sliderContainer}
                      disabled={isUpdatingItem}
                    />
                  </div>
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Metallic</label>
                    <Slider 
                      value={selectedItem.material.metallic} 
                      onChange={(e) => updateItemMaterial({ metallic: parseFloat(e.target.value) })}
                      max={100} 
                      step={1} 
                      className={styles.sliderContainer}
                      disabled={isUpdatingItem}
                    />
                  </div>
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Emission</label>
                    <Slider 
                      value={selectedItem.material.emission} 
                      onChange={(e) => updateItemMaterial({ emission: parseFloat(e.target.value) })}
                      max={100} 
                      step={1} 
                      className={styles.sliderContainer}
                      disabled={isUpdatingItem}
                    />
                  </div>
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
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
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
            <h3 className={styles.propertySectionTitle}>
              <Ruler className="w-4 h-4 mr-2" />
              Scene Scale
            </h3>
            <div className={styles.propertySectionContent}>
              <ScaleUnitSystem
                currentUnit={scaleSettings.unit}
                sceneScale={scaleSettings.sceneScale}
                onUnitChange={handleUnitChange}
                onScaleChange={handleScaleChange}
                className=""
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
    </aside>
  );
});

PropertiesPanel.displayName = 'PropertiesPanel';

export default PropertiesPanel;