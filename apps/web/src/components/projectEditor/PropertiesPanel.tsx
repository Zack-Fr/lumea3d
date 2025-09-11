import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from "../ui/Button";
import { Slider } from "../ui/Slider";
import { ScrollArea } from "../ui/ScrollArea";
import { 
  Move,
  Palette,
  Lightbulb,
  Layers,
  Eye,
  Ruler
} from "lucide-react";
import ScaleUnitSystem, { ScaleUnit } from './ScaleUnitSystem';
import ObjectsCounter from './ObjectsCounter';
import HdrEnvironmentUpload from './HdrEnvironmentUpload';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';
import { scenesApi, SceneItemUpdateRequest, SceneUpdateRequest } from '../../services/scenesApi';
import { useSceneContext } from '../../contexts/SceneContext';

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
  const { manifest, refreshScene } = useSceneContext();
  
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
  
  // Load current HDR URL from scene manifest
  useEffect(() => {
    if (manifest?.scene?.env?.hdri_url) {
      setCurrentHdriUrl(manifest.scene.env.hdri_url);
    } else {
      setCurrentHdriUrl(null);
    }
  }, [manifest?.scene?.env?.hdri_url]);
  
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
    if (!sceneId) {
      console.warn('No sceneId provided - shell updates will be local only');
      // For now, just update local state when no sceneId is available
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
      await scenesApi.updateScene(sceneId, updateBody, manifest?.scene?.version?.toString());
      
      console.log(`Successfully updated shell ${property} to ${value} for scene ${sceneId}`);
      
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
  }, [sceneId, manifest?.scene?.version, refreshScene]);

  // Update selected item transform properties
  const updateItemTransform = useCallback(async (transform: { position?: any; rotation?: any; scale?: any }) => {
    if (!selectedItemId || !sceneId || !selectedItem) {
      console.warn('Cannot update item - missing selectedItemId, sceneId, or selectedItem');
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
      await scenesApi.updateItem(sceneId, selectedItemId, updateRequest, manifest?.scene?.version?.toString());
      
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
  
  // Calculate object information from scene manifest
  const objectInfo = useMemo(() => {
    const items = manifest?.items || [];
    
    // Count by category
    const byCategory: Record<string, number> = {};
    items.forEach(item => {
      const category = typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey || 'unknown';
      byCategory[category] = (byCategory[category] || 0) + 1;
    });
    
    return {
      total: items.length,
      visible: items.length, // TODO: Track actual visibility state
      selected: selectedItemId ? 1 : 0, // TODO: Support multi-selection
      byCategory
    };
  }, [manifest?.items, selectedItemId]);
  
  // Objects visibility handler
  const handleToggleAllVisibility = useCallback((show: boolean) => {
    console.log('Toggle all objects visibility:', show);
    // TODO: Implement global object visibility toggle
  }, []);
  
  // Update item material properties
  const updateItemMaterial = useCallback(async (material: Partial<SelectedItemState['material']>) => {
    if (!selectedItemId || !sceneId) {
      console.warn('Cannot update material - missing selectedItemId or sceneId');
      return;
    }
    
    setIsUpdatingItem(true);
    try {
      // Build material overrides
      const materialOverrides: any = {};
      if (material.roughness !== undefined) materialOverrides.roughness = material.roughness / 100;
      if (material.metallic !== undefined) materialOverrides.metallic = material.metallic / 100;
      if (material.emission !== undefined) materialOverrides.emissive = material.emission / 100;
      if (material.color) materialOverrides.baseColor = material.color;
      
      const updateRequest: SceneItemUpdateRequest = {
        materialOverrides
      } as any;
      
      // Call the backend API
      await scenesApi.updateItem(sceneId, selectedItemId, updateRequest, manifest?.scene?.version?.toString());
      
      console.log(`Successfully updated item ${selectedItemId} material`);
      
      // Update local state
      setSelectedItem(prev => prev ? { ...prev, material: { ...prev.material, ...material } } : null);
      
      // Refresh scene to reflect changes
      refreshScene();
      
    } catch (error) {
      console.error('Failed to update item material:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastError(`Failed to update material: ${errorMessage}`);
      setTimeout(() => setLastError(null), 5000);
    } finally {
      setIsUpdatingItem(false);
    }
  }, [selectedItemId, sceneId, manifest?.scene?.version, refreshScene]);
  
  // Update environment lighting
  const updateEnvironmentLighting = useCallback(async (settings: Partial<EnvironmentSettings>) => {
    if (!sceneId) {
      console.warn('Cannot update environment - missing sceneId');
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
      await scenesApi.updateScene(sceneId, updateRequest, manifest?.scene?.version?.toString());
      
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
  }, [sceneId, manifest?.scene?.version, refreshScene]);
  
  // Load selected item data when selectedItemId changes
  useEffect(() => {
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
      } else {
        setSelectedItem(null);
      }
    } else {
      setSelectedItem(null);
    }
  }, [selectedItemId, manifest]);

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
              
              {/* HDR Environment Upload */}
              <HdrEnvironmentUpload
                sceneId={sceneId}
                currentHdriUrl={currentHdriUrl}
                onHdriUpdate={(hdriUrl) => {
                  setCurrentHdriUrl(hdriUrl);
                  // Optionally refresh the scene to apply new HDR
                  if (refreshScene) {
                    refreshScene();
                  }
                }}
              />
            </div>
          </div>

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

          {/* Layer Controls / Objects */}
          <div className={styles.propertySection}>
            <h3 className={styles.propertySectionTitle}>
              <Layers className="w-4 h-4 mr-2" />
              Layers
            </h3>
            <div className={styles.propertySectionContent}>
              <ObjectsCounter
                objectInfo={objectInfo}
                onToggleVisibility={handleToggleAllVisibility}
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