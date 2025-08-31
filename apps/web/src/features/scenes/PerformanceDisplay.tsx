import { useState, useEffect } from 'react';

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

interface PerformanceDisplayProps {
  stats: PerformanceStats;
  visible: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

export function PerformanceDisplay({ 
  stats, 
  visible, 
  position = 'top-left',
  compact = false 
}: PerformanceDisplayProps) {
  const [displayStats, setDisplayStats] = useState(stats);

  useEffect(() => {
    setDisplayStats(stats);
  }, [stats]);

  if (!visible) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const fpsColor = displayStats.fps >= 55 ? 'text-green-400' : 
                   displayStats.fps >= 30 ? 'text-yellow-400' : 'text-red-400';

  if (compact) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <div className="bg-black bg-opacity-70 text-white text-xs font-mono px-2 py-1 rounded">
          <div className={`${fpsColor} font-bold`}>
            {displayStats.fps} FPS
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <div className="bg-black bg-opacity-80 text-white text-xs font-mono p-3 rounded-lg border border-gray-600 min-w-[200px]">
        <div className="mb-2 border-b border-gray-600 pb-1">
          <span className="text-blue-400 font-semibold">Performance</span>
        </div>
        
        {/* FPS and Frame Time */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <span className="text-gray-400">FPS:</span>
            <span className={`ml-1 font-bold ${fpsColor}`}>
              {displayStats.fps}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Frame:</span>
            <span className="ml-1 text-white">
              {displayStats.frameTime}ms
            </span>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="mb-2">
          <div className="text-gray-400 text-[10px] mb-1">MEMORY</div>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <div>
              <span className="text-gray-500">Geo:</span>
              <span className="ml-1 text-cyan-400">
                {displayStats.memoryUsage.geometries}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Tex:</span>
              <span className="ml-1 text-cyan-400">
                {displayStats.memoryUsage.textures}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Prog:</span>
              <span className="ml-1 text-cyan-400">
                {displayStats.memoryUsage.programs}
              </span>
            </div>
          </div>
        </div>

        {/* Render Stats */}
        <div>
          <div className="text-gray-400 text-[10px] mb-1">RENDER</div>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <div>
              <span className="text-gray-500">Calls:</span>
              <span className="ml-1 text-purple-400">
                {displayStats.renderStats.calls}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Tris:</span>
              <span className="ml-1 text-purple-400">
                {Math.round(displayStats.renderStats.triangles / 1000)}k
              </span>
            </div>
            <div>
              <span className="text-gray-500">Pts:</span>
              <span className="ml-1 text-purple-400">
                {displayStats.renderStats.points}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}