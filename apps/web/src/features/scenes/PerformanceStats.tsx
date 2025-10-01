import { useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Activity, Clock, Zap, Monitor, X } from 'lucide-react';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  memoryUsage: number;
}

interface PerformanceStatsProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function PerformanceStats({ 
  isVisible, 
  onToggleVisibility, 
  position = 'top-right' 
}: PerformanceStatsProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    memoryUsage: 0
  });

  const [frameHistory, setFrameHistory] = useState<number[]>([]);
  const maxHistoryLength = 60; // Track last 60 frames

  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    
    const updateMetrics = () => {
      const currentTime = performance.now();
      frameCount++;
      
      // Update FPS every second
      if (currentTime - lastTime >= 1000) {
        const fps = (frameCount * 1000) / (currentTime - lastTime);
        const frameTime = (currentTime - lastTime) / frameCount;
        
        setMetrics(prev => ({
          ...prev,
          fps: Math.round(fps * 10) / 10,
          frameTime: Math.round(frameTime * 100) / 100
        }));
        
        // Update frame history for graph
        setFrameHistory(prev => {
          const newHistory = [...prev, fps];
          return newHistory.slice(-maxHistoryLength);
        });
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      // Estimate memory usage (rough approximation)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024 * 10) / 10
        }));
      }
      
      requestAnimationFrame(updateMetrics);
    };
    
    updateMetrics();
  }, []);

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getPerformanceColor = (fps: number) => {
    if (fps >= 50) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getFrameTimeColor = (frameTime: number) => {
    if (frameTime <= 16.7) return 'text-green-400'; // 60fps
    if (frameTime <= 33.3) return 'text-yellow-400'; // 30fps
    return 'text-red-400';
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <div className="bg-black/80 backdrop-blur-sm text-white rounded-lg p-4 min-w-[280px] font-mono text-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="font-semibold">Performance</span>
          </div>
          <button
            onClick={onToggleVisibility}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Metrics */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-yellow-400" />
              FPS:
            </span>
            <span className={`font-bold ${getPerformanceColor(metrics.fps)}`}>
              {metrics.fps}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-blue-400" />
              Frame Time:
            </span>
            <span className={`font-bold ${getFrameTimeColor(metrics.frameTime)}`}>
              {metrics.frameTime}ms
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Monitor className="w-3 h-3 text-purple-400" />
              Memory:
            </span>
            <span className="font-bold text-gray-300">
              {metrics.memoryUsage}MB
            </span>
          </div>
        </div>

        {/* FPS Graph */}
        {frameHistory.length > 1 && (
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">FPS History</div>
            <div className="relative h-16 bg-gray-900/50 rounded border">
              <div className="absolute inset-1 flex items-end justify-between">
                {frameHistory.map((fps, index) => {
                  const height = Math.max(2, (fps / 60) * 100);
                  const color = fps >= 50 ? 'bg-green-400' : fps >= 30 ? 'bg-yellow-400' : 'bg-red-400';
                  
                  return (
                    <div
                      key={index}
                      className={`w-1 ${color} rounded-t opacity-80`}
                      style={{ height: `${Math.min(height, 100)}%` }}
                    />
                  );
                })}
              </div>
              
              {/* Reference lines */}
              <div className="absolute left-0 right-0 top-1/3 border-t border-yellow-400/20" />
              <div className="absolute left-0 right-0 top-2/3 border-t border-green-400/20" />
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>30</span>
              <span>60</span>
            </div>
          </div>
        )}

        {/* Additional Stats */}
        <div className="border-t border-gray-700 pt-3">
          <div className="text-xs text-gray-400 mb-2">Render Stats</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>Draw Calls:</span>
              <span className="text-gray-300">{metrics.drawCalls}</span>
            </div>
            <div className="flex justify-between">
              <span>Triangles:</span>
              <span className="text-gray-300">{metrics.triangles.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Geometries:</span>
              <span className="text-gray-300">{metrics.geometries}</span>
            </div>
            <div className="flex justify-between">
              <span>Textures:</span>
              <span className="text-gray-300">{metrics.textures}</span>
            </div>
          </div>
        </div>

        {/* Performance Recommendations */}
        {metrics.fps < 30 && (
          <div className="mt-3 p-2 bg-red-900/30 border border-red-700/50 rounded text-xs">
            <div className="text-red-400 font-semibold mb-1">⚠️ Performance Warning</div>
            <div className="text-red-300">
              Low FPS detected. Consider reducing scene complexity or enabling LOD.
            </div>
          </div>
        )}
        
        {metrics.memoryUsage > 500 && (
          <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs">
            <div className="text-yellow-400 font-semibold mb-1">🔋 Memory Usage High</div>
            <div className="text-yellow-300">
              Consider optimizing textures or geometry complexity.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component for tracking render stats within the Canvas
export function PerformanceTracker() {
  useFrame(() => {
    // Access Three.js renderer info for future render stats tracking
    // These would be updated in the parent component if needed
    // Could dispatch events or use context to share render stats
    
    return null;
  });

  return null;
}

export default PerformanceStats;