import React, { useState, useEffect } from 'react';
import { gpuMemoryMonitor } from '../../utils/gpuMemoryMonitor';
import type { GPUMemoryInfo } from '../../utils/gpuMemoryMonitor';
import styles from './PerformanceStatsOverlay.module.css';

interface PerformanceStatsOverlayProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const PerformanceStatsOverlay: React.FC<PerformanceStatsOverlayProps> = ({
  visible = true,
  position = 'top-right'
}) => {
  const [stats, setStats] = useState<GPUMemoryInfo | null>(null);
  const [fpsStats, setFpsStats] = useState({ current: 0, average: 0, min: 0, max: 0 });

  useEffect(() => {
    if (!visible) return;

    const updateStats = () => {
      const memoryStatus = gpuMemoryMonitor.getMemoryStatus();
      const currentFpsStats = gpuMemoryMonitor.getFPSStats();
      
      setStats(memoryStatus);
      setFpsStats(currentFpsStats);
    };

    // Update stats immediately
    updateStats();

    // Update every second
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible || !stats) {
    return null;
  }

  const getPerformanceColor = (level: string) => {
    switch (level) {
      case 'excellent': return '#22c55e'; // green
      case 'good': return '#3b82f6';      // blue
      case 'fair': return '#f59e0b';      // amber
      case 'poor': return '#ef4444';      // red
      default: return '#6b7280';          // gray
    }
  };

  const getMemoryPressureColor = (level: string) => {
    switch (level) {
      case 'low': return '#22c55e';       // green
      case 'moderate': return '#f59e0b';  // amber
      case 'high': return '#f97316';      // orange
      case 'critical': return '#ef4444';  // red
      default: return '#6b7280';          // gray
    }
  };

  return (
    <div className={`${styles.overlay} ${styles[position]}`}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.title}>🖥️ GPU Stats</span>
        </div>
        
        <div className={styles.stats}>
          {/* FPS Stats */}
          <div className={styles.statGroup}>
            <div className={styles.statLabel}>FPS</div>
            <div 
              className={styles.statValue}
              style={{ color: getPerformanceColor(stats.performanceLevel) }}
            >
              {fpsStats.current.toFixed(1)}
            </div>
            <div className={styles.statDetails}>
              avg: {fpsStats.average.toFixed(1)} | min: {fpsStats.min.toFixed(1)}
            </div>
          </div>

          {/* Performance Level */}
          <div className={styles.statGroup}>
            <div className={styles.statLabel}>Performance</div>
            <div 
              className={`${styles.statValue} ${styles.statBadge}`}
              style={{ 
                color: getPerformanceColor(stats.performanceLevel),
                borderColor: getPerformanceColor(stats.performanceLevel)
              }}
            >
              {stats.performanceLevel}
            </div>
          </div>

          {/* Memory Usage */}
          <div className={styles.statGroup}>
            <div className={styles.statLabel}>JS Heap</div>
            <div className={styles.statValue}>
              {(stats.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB
            </div>
            <div className={styles.statDetails}>
              / {(stats.jsHeapSizeLimit / 1024 / 1024).toFixed(0)}MB
            </div>
          </div>

          {/* Memory Pressure */}
          <div className={styles.statGroup}>
            <div className={styles.statLabel}>Pressure</div>
            <div 
              className={`${styles.statValue} ${styles.statBadge}`}
              style={{ 
                color: getMemoryPressureColor(stats.memoryPressureLevel),
                borderColor: getMemoryPressureColor(stats.memoryPressureLevel)
              }}
            >
              {stats.memoryPressureLevel}
            </div>
          </div>

          {/* GPU Info (shortened) */}
          <div className={styles.statGroup}>
            <div className={styles.statLabel}>GPU</div>
            <div className={styles.statValue} title={stats.webglRenderer}>
              {stats.webglRenderer.length > 15 
                ? stats.webglRenderer.substring(0, 15) + '...'
                : stats.webglRenderer
              }
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};