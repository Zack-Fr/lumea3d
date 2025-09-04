import React from 'react';
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

interface PropertiesPanelProps {
  show: boolean;
  onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = React.memo(({
  show,
  onClose
}) => {
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
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
});

PropertiesPanel.displayName = 'PropertiesPanel';

export default PropertiesPanel;