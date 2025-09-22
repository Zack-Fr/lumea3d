import { useState, useCallback } from 'react';
import { 
  Grid, 
  Sun, 
  Navigation, 
  Zap, 
  Activity, 
  Wifi,
  WifiOff,
  Eye,
  EyeOff 
} from 'lucide-react';
import { AssetImportButton } from '../../../src/features/scenes/AssetImportButton';

export interface ViewerControls {
  showGrid: boolean;
  exposure: number;
  showNavMesh: boolean;
  noclipMode: boolean;
  showFPS: boolean;
  isConnected: boolean;
}

interface ViewerSidebarProps {
  controls: ViewerControls;
  onControlsChange: (controls: Partial<ViewerControls>) => void;
  fps?: number;
  onAssetImportComplete?: (assetId: string) => void;
}

export function ViewerSidebar({ 
  controls, 
  onControlsChange, 
  fps = 0,
  onAssetImportComplete 
}: ViewerSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = useCallback((key: keyof ViewerControls) => {
    onControlsChange({ [key]: !controls[key] });
  }, [controls, onControlsChange]);

  const handleExposureChange = useCallback((value: number) => {
    onControlsChange({ exposure: value });
  }, [onControlsChange]);

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Collapse/Expand Button */}
      <button
        className="mb-2 p-2 bg-gray-800/90 text-white rounded-lg hover:bg-gray-700 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>

      {/* Controls Panel */}
      {isExpanded && (
        <div className="bg-gray-800/90 backdrop-blur-sm text-white rounded-lg p-4 min-w-[200px] space-y-3">
          {/* Header */}
          <div className="text-sm font-medium text-gray-300 border-b border-gray-600 pb-2">
            Viewer Controls
          </div>

          {/* Grid Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Grid size={16} />
              <span className="text-sm">Grid</span>
            </div>
            <button
              className={`w-10 h-6 rounded-full transition-colors ${
                controls.showGrid ? 'bg-yellow-400' : 'bg-gray-600'
              }`}
              onClick={() => handleToggle('showGrid')}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  controls.showGrid ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Exposure Control */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Sun size={16} />
              <span className="text-sm">Exposure</span>
              <span className="text-xs text-gray-400 ml-auto">
                {controls.exposure.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={controls.exposure}
              onChange={(e) => handleExposureChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* NavMesh Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Navigation size={16} />
              <span className="text-sm">NavMesh</span>
            </div>
            <button
              className={`w-10 h-6 rounded-full transition-colors ${
                controls.showNavMesh ? 'bg-blue-400' : 'bg-gray-600'
              }`}
              onClick={() => handleToggle('showNavMesh')}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  controls.showNavMesh ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* NOCLIP Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap size={16} />
              <span className="text-sm">NOCLIP</span>
            </div>
            <button
              className={`w-10 h-6 rounded-full transition-colors ${
                controls.noclipMode ? 'bg-purple-400' : 'bg-gray-600'
              }`}
              onClick={() => handleToggle('noclipMode')}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  controls.noclipMode ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* FPS Display Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity size={16} />
              <span className="text-sm">Show FPS</span>
            </div>
            <button
              className={`w-10 h-6 rounded-full transition-colors ${
                controls.showFPS ? 'bg-green-400' : 'bg-gray-600'
              }`}
              onClick={() => handleToggle('showFPS')}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  controls.showFPS ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Status Section */}
          <div className="border-t border-gray-600 pt-3 space-y-2">
            {/* Live Connection Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {controls.isConnected ? (
                  <Wifi size={16} className="text-green-400" />
                ) : (
                  <WifiOff size={16} className="text-red-400" />
                )}
                <span className="text-sm">
                  {controls.isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              <div
                className={`w-2 h-2 rounded-full ${
                  controls.isConnected ? 'bg-green-400' : 'bg-red-400'
                }`}
              />
            </div>

            {/* Asset Import Button */}
            <AssetImportButton 
              variant="sidebar" 
              onImportComplete={onAssetImportComplete}
            />

            {/* FPS Display */}
            {controls.showFPS && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">FPS:</span>
                <span className={`font-mono ${fps < 30 ? 'text-red-400' : fps < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {fps.toFixed(0)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Default controls state
export const defaultViewerControls: ViewerControls = {
  showGrid: true,
  exposure: 1.0,
  showNavMesh: false,
  noclipMode: false,
  showFPS: true,
  isConnected: false,
};