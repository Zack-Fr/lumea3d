import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gpuMemoryMonitor } from '../../utils/gpuMemoryMonitor';
import type { GPUMemoryInfo } from '../../utils/gpuMemoryMonitor';
import styles from './PerformanceStatsOverlay.module.css';

interface PerformanceStatsOverlayProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  projectId?: string | number | null;
}

export const PerformanceStatsOverlay: React.FC<PerformanceStatsOverlayProps> = ({
  visible = true,
  position = 'top-right',
  projectId
}) => {
  const [stats, setStats] = useState<GPUMemoryInfo | null>(null);
  const [fpsStats, setFpsStats] = useState({ current: 0, average: 0, min: 0, max: 0 });
  const [collapsed, setCollapsed] = useState<boolean>(false);
  // Persist collapsed state per-project (falls back to global key when no projectId)
  const storageKeyLocal = projectId ? `project-gpu-stats-collapsed-${projectId}` : 'project-gpu-stats-collapsed-global';

  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // load stored offset
  useEffect(() => {
    try {
      const storedOffset = localStorage.getItem(`${storageKeyLocal}-offset`);
      if (storedOffset) {
        const parsed = JSON.parse(storedOffset);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setOffset(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [storageKeyLocal]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // only left button
    if (e.button !== 0) return;
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    // capture pointer to continue receiving events even if pointer leaves
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !dragStartRef.current) return;
    const next = { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y };
    setOffset(next);
  }, []);

  const finishDrag = useCallback((e?: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    dragStartRef.current = null;
    try {
      localStorage.setItem(`${storageKeyLocal}-offset`, JSON.stringify(offset));
    } catch (err) {
      // ignore
    }
    if (e && e.pointerId) {
      try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch {};
    }
  }, [offset, storageKeyLocal]);

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKeyLocal);
      if (stored !== null) setCollapsed(stored === 'true');
    } catch (e) {
      // ignore storage errors
    }
  }, [storageKeyLocal]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(storageKeyLocal, next ? 'true' : 'false');
    } catch (e) {
      // ignore storage errors
    }
  };

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

  const transformStyle = { transform: `translate(${offset.x}px, ${offset.y}px)` };

  return (
    <div className={`${styles.overlay} ${styles[position]} ${collapsed ? styles.collapsed : ''}`} style={transformStyle}>
      <div className={`${styles.container} ${collapsed ? styles.containerCollapsed : ''}`}>
        <div
          className={styles.header}
          onPointerDown={(e) => handlePointerDown(e)}
          onPointerMove={(e) => handlePointerMove(e)}
          onPointerUp={(e) => finishDrag(e)}
          onPointerCancel={(e) => finishDrag(e)}
        >
          <div className={styles.headerLeft}>
            <span className={styles.title}>🖥️ GPU Stats</span>
          </div>
          <div className={styles.headerControls}>
            <button
              onClick={(e) => { e.stopPropagation(); toggleCollapsed(); }}
              aria-label={collapsed ? 'Expand GPU stats' : 'Collapse GPU stats'}
              className={styles.collapseButton}
            >
              {collapsed ? '▸' : '▾'}
            </button>
          </div>
        </div>

        <div className={styles.stats} aria-hidden={collapsed} style={{ display: collapsed ? 'none' : undefined }}>
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