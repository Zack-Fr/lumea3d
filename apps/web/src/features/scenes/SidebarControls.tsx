import { useFPSCounter } from './useSidebarControls';

interface SidebarControlsProps {
  showGrid: boolean;
  exposure: number;
  showNavmesh: boolean;
  noclipMode: boolean;
  showFPS: boolean;
  isLive: boolean;
  toggleGrid: () => void;
  setExposure: (value: number) => void;
  toggleNavmesh: () => void;
  toggleNoclip: () => void;
  toggleFPS: () => void;
}

function FPSDisplay({ show }: { show: boolean }) {
  const fps = useFPSCounter();
  
  if (!show) return null;
  
  return (
    <div className="text-xs font-mono bg-black/50 px-2 py-1 rounded">
      {fps} FPS
    </div>
  );
}

function LiveBadge({ isLive }: { isLive: boolean }) {
  return (
    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
      isLive ? 'bg-green-600/80 text-green-100' : 'bg-red-600/80 text-red-100'
    }`}>
      <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-300' : 'bg-red-300'}`} />
      {isLive ? 'LIVE' : 'OFFLINE'}
    </div>
  );
}

export function SidebarControls({
  showGrid,
  exposure,
  showNavmesh,
  noclipMode,
  showFPS,
  isLive,
  toggleGrid,
  setExposure,
  toggleNavmesh,
  toggleNoclip,
  toggleFPS
}: SidebarControlsProps) {
  return (
    <div className="fixed top-4 right-4 z-10 bg-black/80 backdrop-blur-sm rounded-lg p-4 w-64 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Scene Controls</h3>
        <LiveBadge isLive={isLive} />
      </div>
      
      {/* FPS Display */}
      {showFPS && (
        <div className="mb-4">
          <FPSDisplay show={showFPS} />
        </div>
      )}
      
      {/* Grid Toggle */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={toggleGrid}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm">Show Grid</span>
        </label>
      </div>
      
      {/* Exposure Control */}
      <div className="mb-3">
        <label className="block text-sm mb-1">
          Exposure: {exposure.toFixed(1)}
        </label>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={exposure}
          onChange={(e) => setExposure(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      {/* NavMesh Toggle */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showNavmesh}
            onChange={toggleNavmesh}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm">Show NavMesh</span>
        </label>
      </div>
      
      {/* NOCLIP Mode */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={noclipMode}
            onChange={toggleNoclip}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm">NOCLIP Mode</span>
          {noclipMode && (
            <span className="text-xs bg-yellow-600 px-1 rounded">ON</span>
          )}
        </label>
      </div>
      
      {/* FPS Toggle */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showFPS}
            onChange={toggleFPS}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm">Show FPS</span>
        </label>
      </div>
      
      {/* Info */}
      <div className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-700">
        Use WASD to move, mouse to look around
      </div>
    </div>
  );
}