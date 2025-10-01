import { Move, RotateCw, Maximize2, X } from 'lucide-react';
import { useSelection } from '../../features/scenes/SelectionContext';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

export function GlassTransformControlsPanel() {
  const { selection, setTransformMode, deselectObject } = useSelection();

  if (!selection.selectedObject) {
    return null;
  }

  const { selectedObject, transformMode } = selection;

  return (
    <div className={styles.transformControlsPanel}>
      <div className={styles.transformControlsContainer}>
        {/* Header */}
        <div className={styles.transformHeader}>
          <div className={styles.transformTitle}>
            <span className={styles.selectedLabel}>Selected:</span>
            <span className={styles.selectedName}>{selectedObject.itemId}</span>
          </div>
          <button
            onClick={deselectObject}
            className={styles.transformCloseButton}
            title="Deselect object (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transform Mode Buttons */}
        <div className={styles.transformModeButtons}>
          <span className={styles.transformModeLabel}>Transform:</span>
          
          <button
            onClick={() => setTransformMode('translate')}
            className={`${styles.transformModeButton} ${
              transformMode === 'translate' ? styles.transformModeButtonActive : ''
            }`}
            title="Move (G)"
          >
            <Move className="w-4 h-4" />
            <span>Move</span>
          </button>

          <button
            onClick={() => setTransformMode('rotate')}
            className={`${styles.transformModeButton} ${
              transformMode === 'rotate' ? styles.transformModeButtonActive : ''
            }`}
            title="Rotate (R)"
          >
            <RotateCw className="w-4 h-4" />
            <span>Rotate</span>
          </button>

          <button
            onClick={() => setTransformMode('scale')}
            className={`${styles.transformModeButton} ${
              transformMode === 'scale' ? styles.transformModeButtonActive : ''
            }`}
            title="Scale (S)"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Scale</span>
          </button>
        </div>

        {/* Object Info */}
        <div className={styles.transformObjectInfo}>
          <div className={styles.transformInfoGrid}>
            <div className={styles.transformInfoItem}>
              <span className={styles.transformInfoLabel}>Category:</span>
              <span className={styles.transformInfoValue}>{selectedObject.category}</span>
            </div>
            <div className={styles.transformInfoItem}>
              <span className={styles.transformInfoLabel}>Locked:</span>
              <span className={styles.transformInfoValue}>
                {selectedObject.object.userData.locked ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          
          {/* Transform values */}
          <div className={styles.transformValues}>
            <div className={styles.transformValueRow}>
              <span className={styles.transformValueLabel}>Position:</span>
              <span className={styles.transformValueData}>
                ({selectedObject.object.position.x.toFixed(2)}, {selectedObject.object.position.y.toFixed(2)}, {selectedObject.object.position.z.toFixed(2)})
              </span>
            </div>
            <div className={styles.transformValueRow}>
              <span className={styles.transformValueLabel}>Rotation:</span>
              <span className={styles.transformValueData}>
                ({(selectedObject.object.rotation.x * 180 / Math.PI).toFixed(1)}°, {(selectedObject.object.rotation.y * 180 / Math.PI).toFixed(1)}°, {(selectedObject.object.rotation.z * 180 / Math.PI).toFixed(1)}°)
              </span>
            </div>
            <div className={styles.transformValueRow}>
              <span className={styles.transformValueLabel}>Scale:</span>
              <span className={styles.transformValueData}>
                ({selectedObject.object.scale.x.toFixed(2)}, {selectedObject.object.scale.y.toFixed(2)}, {selectedObject.object.scale.z.toFixed(2)})
              </span>
            </div>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className={styles.transformShortcuts}>
          <span className={styles.transformShortcutsText}>
            G: Move, R: Rotate, S: Scale, ESC: Deselect
          </span>
        </div>
      </div>
    </div>
  );
}

export default GlassTransformControlsPanel;
