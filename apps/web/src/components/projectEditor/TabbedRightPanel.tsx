import React, { useState, useCallback } from 'react';
import { ScrollArea } from "../ui/ScrollArea";
import { 
  Settings,
  Camera,
  X
} from "lucide-react";
import PropertiesPanel from './PropertiesPanel';
import CameraControlsTab from './CameraControlsTab';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface TabbedRightPanelProps {
  show: boolean;
  onClose: () => void;
  
  // Properties panel props
  sceneId?: string;
  selectedItemId?: string | null;
  
  // Camera controls props
  cameraMode: string;
  onCameraModeChange: (mode: string) => void;
  minDistance?: number;
  maxDistance?: number;
  moveSpeed?: number;
  onZoomLimitsChange?: (min: number, max: number) => void;
  onMoveSpeedChange?: (speed: number) => void;
  onCameraPreset?: (preset: string) => void;
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
  onControlsToggle?: (control: string, enabled: boolean) => void;
  // Clipping plane props
  nearClip?: number;
  farClip?: number;
  onClippingChange?: (near: number, far: number) => void;
}

type TabType = 'properties' | 'camera';

const TabbedRightPanel: React.FC<TabbedRightPanelProps> = ({
  show,
  onClose,
  
  // Properties props
  sceneId,
  selectedItemId,
  
  // Camera props
  cameraMode,
  onCameraModeChange,
  minDistance,
  maxDistance,
  moveSpeed,
  onZoomLimitsChange,
  onMoveSpeedChange,
  onCameraPreset,
  enablePan,
  enableZoom,
  enableRotate,
  onControlsToggle,
  
  // Clipping plane props
  nearClip,
  farClip,
  onClippingChange
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('properties');

  // Tab switching handler
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'properties':
        return renderPropertiesTab();
      case 'camera':
        return renderCameraTab();
      default:
        return null;
    }
  };

  const renderPropertiesTab = () => {
    return (
      <PropertiesPanel
        show={true}
        onClose={onClose}
        sceneId={sceneId}
        selectedItemId={selectedItemId ?? undefined}
      />
    );
  };

  const renderCameraTab = () => {
    return (
      <CameraControlsTab
        show={true}
        cameraMode={cameraMode}
        onCameraModeChange={onCameraModeChange}
        minDistance={minDistance}
        maxDistance={maxDistance}
        moveSpeed={moveSpeed}
        onZoomLimitsChange={onZoomLimitsChange}
        onMoveSpeedChange={onMoveSpeedChange}
        onCameraPreset={onCameraPreset}
        enablePan={enablePan}
        enableZoom={enableZoom}
        enableRotate={enableRotate}
        onControlsToggle={onControlsToggle}
        nearClip={nearClip}
        farClip={farClip}
        onClippingChange={onClippingChange}
      />
    );
  };

  if (!show) return null;

  return (
    <aside className={styles.rightPanel}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitleRow}>
          <h2 className={styles.sidebarTitle}>
            {activeTab === 'properties' && 'Properties'}
            {activeTab === 'camera' && 'Camera Controls'}
          </h2>
          <button 
            onClick={onClose}
            className={styles.closeButton}
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <div className={styles.tabsList}>
          <button
            onClick={() => handleTabChange('properties')}
            className={`${styles.tabTrigger} ${activeTab === 'properties' ? styles.tabTriggerActive : ''}`}
          >
            <Settings className="w-4 h-4" />
            <span className={styles.tabLabel}>Properties</span>
          </button>
          <button
            onClick={() => handleTabChange('camera')}
            className={`${styles.tabTrigger} ${activeTab === 'camera' ? styles.tabTriggerActive : ''}`}
          >
            <Camera className="w-4 h-4" />
            <span className={styles.tabLabel}>Camera</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <ScrollArea className={styles.rightPanelContent}>
        {renderTabContent()}
      </ScrollArea>
    </aside>
  );
};

export default TabbedRightPanel;
