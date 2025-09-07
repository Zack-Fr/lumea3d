import React, { useState, useCallback } from 'react';
import { Button } from "../ui/Button";
import { Slider } from "../ui/Slider";
import { ScrollArea } from "../ui/ScrollArea";
import { 
  Move,
  Palette,
  Lightbulb,
  Layers,
  Eye
} from "lucide-react";
import styles from '../../pages/projectEditor/ProjectEditor.module.css';
import { scenesApi } from '../../services/scenesApi';

interface PropertiesPanelProps {
  show: boolean;
  onClose: () => void;
  sceneId?: string; // Add sceneId for API calls
}

interface ShellSettings {
  castShadow: boolean;
  receiveShadow: boolean;
  visible: boolean;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = React.memo(({
  show,
  onClose,
  sceneId
}) => {
  // Shell shadow state
  const [shellSettings, setShellSettings] = useState<ShellSettings>({
    castShadow: false,
    receiveShadow: false,
    visible: true
  });
  
  const [isUpdatingShell, setIsUpdatingShell] = useState(false);
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
      
      // For shadow settings, call the backend API
      const shellPropName = property === 'castShadow' ? 'shellCastShadow' : 'shellReceiveShadow';
      
      // Call the backend API to update shell properties
      await scenesApi.patchProps(sceneId, { 
        shell: { [shellPropName]: value } 
      }, '1'); // Use version 1 for now
      
      console.log(`Successfully updated ${shellPropName} to ${value} for scene ${sceneId}`);
      
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
  }, [sceneId]);

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
              Transform
            </h3>
            <div className={styles.propertySectionContent}>
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Position</label>
                <div className={styles.inputGrid}>
                  <input type="number" placeholder="X" className={styles.propertyInput} defaultValue="0" />
                  <input type="number" placeholder="Y" className={styles.propertyInput} defaultValue="0" />
                  <input type="number" placeholder="Z" className={styles.propertyInput} defaultValue="0" />
                </div>
              </div>
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Rotation</label>
                <div className={styles.inputGrid}>
                  <input type="number" placeholder="X" className={styles.propertyInput} defaultValue="0" />
                  <input type="number" placeholder="Y" className={styles.propertyInput} defaultValue="0" />
                  <input type="number" placeholder="Z" className={styles.propertyInput} defaultValue="0" />
                </div>
              </div>
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Scale</label>
                <div className={styles.inputGrid}>
                  <input type="number" placeholder="X" className={styles.propertyInput} defaultValue="1" />
                  <input type="number" placeholder="Y" className={styles.propertyInput} defaultValue="1" />
                  <input type="number" placeholder="Z" className={styles.propertyInput} defaultValue="1" />
                </div>
              </div>
            </div>
          </div>

          {/* Material */}
          <div className={styles.propertySection}>
            <h3 className={styles.propertySectionTitle}>
              <Palette className="w-4 h-4 mr-2" />
              Material
            </h3>
            <div className={styles.propertySectionContent}>
              <div className={styles.materialSwatches}>
                <div className={`${styles.materialSwatch} ${styles.materialSwatchRed}`}></div>
                <div className={`${styles.materialSwatch} ${styles.materialSwatchBlue}`}></div>
                <div className={`${styles.materialSwatch} ${styles.materialSwatchGreen}`}></div>
                <div className={`${styles.materialSwatch} ${styles.materialSwatchYellow}`}></div>
              </div>
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Roughness</label>
                <Slider defaultValue={50} max={100} step={1} className={styles.sliderContainer} />
              </div>
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Metallic</label>
                <Slider defaultValue={0} max={100} step={1} className={styles.sliderContainer} />
              </div>
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Emission</label>
                <Slider defaultValue={0} max={100} step={1} className={styles.sliderContainer} />
              </div>
            </div>
          </div>

          {/* Lighting */}
          <div className={styles.propertySection}>
            <h3 className={styles.propertySectionTitle}>
              <Lightbulb className="w-4 h-4 mr-2" />
              Lighting
            </h3>
            <div className={styles.propertySectionContent}>
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Intensity</label>
                <Slider defaultValue={100} max={200} step={5} className={styles.sliderContainer} />
              </div>
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Shadow</label>
                <Slider defaultValue={50} max={100} step={1} className={styles.sliderContainer} />
              </div>
              <div className={styles.propertyGroup}>
                <span className={styles.propertyLabel}>Cast Shadows</span>
                <div className={styles.toggleSwitch}>
                  <div className={styles.toggleKnob}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Layer Controls */}
          <div className={styles.propertySection}>
            <h3 className={styles.propertySectionTitle}>
              <Layers className="w-4 h-4 mr-2" />
              Layers
            </h3>
            <div className={styles.propertySectionContent}>
              {['Background', 'Objects', 'Lighting', 'Effects'].map((layer) => (
                <div key={layer} className={styles.layerItem}>
                  <div className={styles.layerInfo}>
                    <Eye className="w-4 h-4 text-glass-gray" />
                    <span className={styles.layerName}>{layer}</span>
                  </div>
                  <div className={styles.layerToggle}>
                    <div className={styles.layerToggleKnob}></div>
                  </div>
                </div>
              ))}
              
              {/* Shell Shadow Controls */}
              <div className={styles.propertyGroup} style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span className={styles.propertyLabel} style={{ marginBottom: '8px', display: 'block', fontSize: '12px', opacity: 0.8 }}>Shell Settings</span>
                
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
        </div>
      </ScrollArea>
    </aside>
  );
});

PropertiesPanel.displayName = 'PropertiesPanel';

export default PropertiesPanel;