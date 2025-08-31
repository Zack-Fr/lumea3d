import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

interface PerformanceStats {
  fps: number;
  frameTime: number;
  memoryUsage: {
    geometries: number;
    textures: number;
    programs: number;
  };
  renderStats: {
    calls: number;
    triangles: number;
    points: number;
  };
}

interface UsePerformanceMonitorProps {
  enabled?: boolean;
  updateInterval?: number;
  sampleSize?: number;
  onStatsUpdate?: (stats: PerformanceStats) => void;
}

export function usePerformanceMonitor({
  enabled = true,
  updateInterval = 1000,
  sampleSize = 60,
  onStatsUpdate
}: UsePerformanceMonitorProps = {}) {
  const { gl } = useThree();
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    memoryUsage: { geometries: 0, textures: 0, programs: 0 },
    renderStats: { calls: 0, triangles: 0, points: 0 }
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastUpdateRef = useRef(0);

  const calculateStats = useCallback((): PerformanceStats => {
    const frameTimes = frameTimesRef.current;
    const avgFrameTime = frameTimes.length > 0 
      ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length 
      : 0;
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

    const info = gl.info;
    
    return {
      fps: Math.round(fps),
      frameTime: Number(avgFrameTime.toFixed(2)),
      memoryUsage: {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length || 0
      },
      renderStats: {
        calls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points
      }
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (!enabled) return;

    // Track frame time
    const frameTime = delta * 1000; // Convert to milliseconds
    frameTimesRef.current.push(frameTime);
    if (frameTimesRef.current.length > sampleSize) {
      frameTimesRef.current.shift();
    }

    // Update stats periodically
    const now = performance.now();
    if (now - lastUpdateRef.current >= updateInterval) {
      const newStats = calculateStats();
      setStats(newStats);
      onStatsUpdate?.(newStats);
      lastUpdateRef.current = now;
    }
  });

  return {
    stats,
    resetStats: useCallback(() => {
      frameTimesRef.current = [];
      setStats({
        fps: 0,
        frameTime: 0,
        memoryUsage: { geometries: 0, textures: 0, programs: 0 },
        renderStats: { calls: 0, triangles: 0, points: 0 }
      });
    }, [])
  };
}