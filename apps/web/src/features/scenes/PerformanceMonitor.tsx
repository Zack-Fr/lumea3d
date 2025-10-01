import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: {
    geometries: number;
    textures: number;
    programs: number;
    calls: number;
    triangles: number;
    points: number;
    lines: number;
  };
  renderInfo: {
    visibleObjects: number;
    totalObjects: number;
    culledObjects: number;
  };
}

interface PerformanceMonitorProps {
  onMetricsUpdate: (metrics: PerformanceMetrics) => void;
  updateInterval?: number;
}

export function PerformanceMonitor({ 
  onMetricsUpdate, 
  updateInterval = 1000 
}: PerformanceMonitorProps) {
  const { gl, scene } = useThree();
  const frameTimeRef = useRef<number[]>([]);
  const lastUpdateRef = useRef(0);
  const visibleObjectsRef = useRef(0);
  const totalObjectsRef = useRef(0);

  useFrame((_, delta) => {
    // Track frame times for FPS calculation
    frameTimeRef.current.push(delta * 1000); // Convert to milliseconds
    if (frameTimeRef.current.length > 60) {
      frameTimeRef.current.shift(); // Keep only last 60 frames
    }

    const now = performance.now();
    if (now - lastUpdateRef.current >= updateInterval) {
      const metrics = calculateMetrics();
      onMetricsUpdate(metrics);
      lastUpdateRef.current = now;
    }
  });

  const calculateMetrics = (): PerformanceMetrics => {
    // Calculate FPS from frame times
    const avgFrameTime = frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length;
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

    // Get WebGL memory info
    const info = gl.info;
    const memoryInfo = info.memory;
    const renderInfo = info.render;

    // Count visible objects by traversing scene
    let visibleCount = 0;
    let totalCount = 0;
    
    scene.traverse((object) => {
      if (object.type === 'Mesh' || object.type === 'SkinnedMesh') {
        totalCount++;
        if (object.visible && !object.frustumCulled) {
          visibleCount++;
        }
      }
    });

    visibleObjectsRef.current = visibleCount;
    totalObjectsRef.current = totalCount;

    return {
      fps: Math.round(fps),
      frameTime: Math.round(avgFrameTime * 100) / 100,
      memoryUsage: {
        geometries: memoryInfo.geometries,
        textures: memoryInfo.textures,
        programs: 0, // Programs count not easily accessible
        calls: renderInfo.calls,
        triangles: renderInfo.triangles,
        points: renderInfo.points,
        lines: renderInfo.lines,
      },
      renderInfo: {
        visibleObjects: visibleCount,
        totalObjects: totalCount,
        culledObjects: totalCount - visibleCount,
      },
    };
  };

  // This component doesn't render anything
  return null;
}

// Performance metrics display component
interface PerformanceDisplayProps {
  metrics: PerformanceMetrics;
  isVisible: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function PerformanceDisplay({ 
  metrics, 
  isVisible, 
  position = 'top-left' 
}: PerformanceDisplayProps) {
  if (!isVisible) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const getFPSColor = (fps: number) => {
    if (fps >= 50) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-30 bg-black/80 text-white p-3 rounded-lg font-mono text-xs space-y-1 min-w-[200px]`}>
      <div className="font-semibold text-blue-400 border-b border-gray-600 pb-1 mb-2">
        Performance Metrics
      </div>
      
      {/* Frame Metrics */}
      <div className="space-y-1">
        <div className={`flex justify-between ${getFPSColor(metrics.fps)}`}>
          <span>FPS:</span>
          <span className="font-bold">{metrics.fps}</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Frame Time:</span>
          <span>{metrics.frameTime}ms</span>
        </div>
      </div>

      {/* Render Info */}
      <div className="border-t border-gray-600 pt-2 space-y-1">
        <div className="text-yellow-400 font-medium">Rendering</div>
        <div className="flex justify-between text-gray-300">
          <span>Visible:</span>
          <span>{metrics.renderInfo.visibleObjects}</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Total:</span>
          <span>{metrics.renderInfo.totalObjects}</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Culled:</span>
          <span>{metrics.renderInfo.culledObjects}</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Draw Calls:</span>
          <span>{metrics.memoryUsage.calls}</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Triangles:</span>
          <span>{metrics.memoryUsage.triangles.toLocaleString()}</span>
        </div>
      </div>

      {/* Memory Info */}
      <div className="border-t border-gray-600 pt-2 space-y-1">
        <div className="text-purple-400 font-medium">Memory</div>
        <div className="flex justify-between text-gray-300">
          <span>Geometries:</span>
          <span>{metrics.memoryUsage.geometries}</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Textures:</span>
          <span>{metrics.memoryUsage.textures}</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Programs:</span>
          <span>{metrics.memoryUsage.programs}</span>
        </div>
      </div>
    </div>
  );
}

// Hook for performance monitoring
export function usePerformanceMetrics(updateInterval = 1000) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsage: {
      geometries: 0,
      textures: 0,
      programs: 0,
      calls: 0,
      triangles: 0,
      points: 0,
      lines: 0,
    },
    renderInfo: {
      visibleObjects: 0,
      totalObjects: 0,
      culledObjects: 0,
    },
  });

  const handleMetricsUpdate = (newMetrics: PerformanceMetrics) => {
    setMetrics(newMetrics);
  };

  return {
    metrics,
    PerformanceMonitor: (props: Omit<PerformanceMonitorProps, 'onMetricsUpdate' | 'updateInterval'>) => (
      <PerformanceMonitor 
        {...props}
        onMetricsUpdate={handleMetricsUpdate}
        updateInterval={updateInterval}
      />
    ),
  };
}