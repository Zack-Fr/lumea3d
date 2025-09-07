import React from 'react';
import { Separator } from "../ui/Separator";
import { Target, Clock, Layers, TrendingUp, Loader2 } from "lucide-react";
import { useSceneContext } from '../../contexts/SceneContext';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface ViewportSettingsProps {
  cameraMode: string;
  renderMode: string;
}

const ViewportSettings: React.FC<ViewportSettingsProps> = React.memo(({
  cameraMode,
  renderMode
}) => {
  const { loading, metrics, isLoading } = useSceneContext();

  // Helper function to get performance color
  const getPerformanceColor = (score: string) => {
    switch (score) {
      case 'excellent': return '#10b981'; // green
      case 'good': return '#3b82f6';      // blue  
      case 'fair': return '#f59e0b';      // yellow
      case 'poor': return '#ef4444';      // red
      default: return '#6b7280';          // gray
    }
  };

  return (
    <div className={styles.viewportSettings}>
      <div className={styles.settingsContent}>
        {/* Camera Mode */}
        <div className={styles.settingsItem}>
          <Target className="w-4 h-4 text-glass-yellow" />
          <span className={styles.settingsItemText}>{cameraMode === "fps" ? "FPS" : "Orbit"}</span>
        </div>
        
        <Separator orientation="vertical" className={styles.settingsSeparator} />
        
        {/* Render Mode */}
        <div className={styles.settingsItem}>
          <span className={styles.settingsItemText}>{renderMode}</span>
        </div>
        
        {/* Loading Progress */}
        {isLoading && (
          <>
            <Separator orientation="vertical" className={styles.settingsSeparator} />
            <div className={styles.settingsItem}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className={styles.settingsItemText}>
                {loading.stage} • {Math.round(loading.progress * 100)}%
              </span>
            </div>
          </>
        )}
        
        {/* Performance Metrics */}
        {metrics && !isLoading && (
          <>
            <Separator orientation="vertical" className={styles.settingsSeparator} />
            
            {/* Load Time */}
            <div className={styles.settingsItem}>
              <Clock className="w-4 h-4" />
              <span className={styles.settingsItemText}>
                {metrics.totalLoadTime}ms
              </span>
            </div>
            
            <Separator orientation="vertical" className={styles.settingsSeparator} />
            
            {/* Category Count */}
            <div className={styles.settingsItem}>
              <Layers className="w-4 h-4" />
              <span className={styles.settingsItemText}>
                {metrics.categoryCount} cats
              </span>
            </div>
            
            <Separator orientation="vertical" className={styles.settingsSeparator} />
            
            {/* Performance Score */}
            <div className={styles.settingsItem}>
              <TrendingUp 
                className="w-4 h-4" 
                style={{ color: getPerformanceColor(metrics.performanceScore) }}
              />
              <span 
                className={styles.settingsItemText}
                style={{ color: getPerformanceColor(metrics.performanceScore) }}
              >
                {metrics.performanceScore}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

ViewportSettings.displayName = 'ViewportSettings';

export default ViewportSettings;