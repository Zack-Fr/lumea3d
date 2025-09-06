import { useState, useCallback } from 'react';
import { 
  Camera, 
  Move, 
  RotateCw, 
  Maximize2, 
  Eye, 
  Grid,
  Layers,
  Settings,
  Play,
  Pause,
  BarChart3,
  MousePointer,
  Lightbulb,
  Save,
  Undo,
  Redo,
  Target,
  ZoomOut
} from 'lucide-react';
import { useSelection } from './SelectionContext';
import { useSmoothCameraTransitions } from './SmoothCameraControls';
import { PerformanceStats } from './PerformanceStats';

interface ShellUIControlsProps {
  cameraMode: 'orbit' | 'fps';
  onCameraModeChange: (mode: 'orbit' | 'fps') => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showPerformance: boolean;
  onTogglePerformance: () => void;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  lightingMode: 'realistic' | 'flat';
  onToggleLighting: () => void;
  selectionMode: 'select' | 'navigate';
  onToggleSelectionMode: () => void;
}

interface CameraControlsProps {
  cameraMode: 'orbit' | 'fps';
  onCameraModeChange: (mode: 'orbit' | 'fps') => void;
  onFocusSelected: () => void;
  onResetView: () => void;
}

interface TransformToolbarProps {
  transformMode: 'translate' | 'rotate' | 'scale';
  onTransformModeChange: (mode: 'translate' | 'rotate' | 'scale') => void;
  hasSelection: boolean;
}

interface ViewportToolbarProps {
  showGrid: boolean;
  onToggleGrid: () => void;
  showPerformance: boolean;
  onTogglePerformance: () => void;
  lightingMode: 'realistic' | 'flat';
  onToggleLighting: () => void;
  selectionMode: 'select' | 'navigate';
  onToggleSelectionMode: () => void;
}

interface PlaybackControlsProps {
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// Camera Controls Component
function CameraControls({ 
  cameraMode, 
  onCameraModeChange, 
  onFocusSelected, 
  onResetView 
}: CameraControlsProps) {
  return (
    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg p-1">
      <button
        onClick={() => onCameraModeChange('orbit')}
        className={`p-2 rounded transition-colors ${
          cameraMode === 'orbit'
            ? 'bg-blue-500 text-white'
            : 'text-gray-300 hover:bg-gray-700'
        }`}
        title="Orbit Camera (1)"
      >
        <Camera size={16} />
      </button>
      
      <button
        onClick={() => onCameraModeChange('fps')}
        className={`p-2 rounded transition-colors ${
          cameraMode === 'fps'
            ? 'bg-blue-500 text-white'
            : 'text-gray-300 hover:bg-gray-700'
        }`}
        title="First Person Camera (2)"
      >
        <Eye size={16} />
      </button>
      
      <div className="w-px h-6 bg-gray-600 mx-1" />
      
      <button
        onClick={onFocusSelected}
        className="p-2 rounded text-gray-300 hover:bg-gray-700 transition-colors"
        title="Focus Selected (F)"
      >
        <Target size={16} />
      </button>
      
      <button
        onClick={onResetView}
        className="p-2 rounded text-gray-300 hover:bg-gray-700 transition-colors"
        title="Reset View (Home)"
      >
        <ZoomOut size={16} />
      </button>
    </div>
  );
}

// Transform Toolbar Component
function TransformToolbar({ 
  transformMode, 
  onTransformModeChange, 
  hasSelection 
}: TransformToolbarProps) {
  if (!hasSelection) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg p-1">
      <button
        onClick={() => onTransformModeChange('translate')}
        className={`flex items-center gap-1 px-3 py-2 rounded transition-colors ${
          transformMode === 'translate'
            ? 'bg-blue-500 text-white'
            : 'text-gray-300 hover:bg-gray-700'
        }`}
        title="Move Tool (G)"
      >
        <Move size={16} />
        <span className="text-xs">Move</span>
      </button>
      
      <button
        onClick={() => onTransformModeChange('rotate')}
        className={`flex items-center gap-1 px-3 py-2 rounded transition-colors ${
          transformMode === 'rotate'
            ? 'bg-green-500 text-white'
            : 'text-gray-300 hover:bg-gray-700'
        }`}
        title="Rotate Tool (R)"
      >
        <RotateCw size={16} />
        <span className="text-xs">Rotate</span>
      </button>
      
      <button
        onClick={() => onTransformModeChange('scale')}
        className={`flex items-center gap-1 px-3 py-2 rounded transition-colors ${
          transformMode === 'scale'
            ? 'bg-purple-500 text-white'
            : 'text-gray-300 hover:bg-gray-700'
        }`}
        title="Scale Tool (S)"
      >
        <Maximize2 size={16} />
        <span className="text-xs">Scale</span>
      </button>
    </div>
  );
}

// Viewport Toolbar Component
function ViewportToolbar({
  showGrid,
  onToggleGrid,
  showPerformance,
  onTogglePerformance,
  lightingMode,
  onToggleLighting,
  selectionMode,
  onToggleSelectionMode
}: ViewportToolbarProps) {
  return (
    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg p-1">
      <button
        onClick={onToggleSelectionMode}
        className={`p-2 rounded transition-colors ${
          selectionMode === 'select'
            ? 'bg-yellow-500 text-white'
            : 'text-gray-300 hover:bg-gray-700'
        }`}
        title="Selection Mode (Q)"
      >
        <MousePointer size={16} />
      </button>
      
      <button
        onClick={onToggleGrid}
        className={`p-2 rounded transition-colors ${
          showGrid
            ? 'bg-gray-500 text-white'
            : 'text-gray-300 hover:bg-gray-700'
        }`}
        title="Toggle Grid (G)"
      >
        <Grid size={16} />
      </button>
      
      <button
        onClick={onToggleLighting}
        className={`p-2 rounded transition-colors ${
          lightingMode === 'realistic'
            ? 'bg-yellow-500 text-white'
            : 'text-gray-300 hover:bg-gray-700'
        }`}
        title="Toggle Lighting (L)"
      >
        <Lightbulb size={16} />
      </button>
      
      <button
        onClick={onTogglePerformance}
        className={`p-2 rounded transition-colors ${
          showPerformance
            ? 'bg-green-500 text-white'
            : 'text-gray-300 hover:bg-gray-700'
        }`}
        title="Performance Stats (P)"
      >
        <BarChart3 size={16} />
      </button>
    </div>
  );
}

// Playback Controls Component
function PlaybackControls({
  isPlaying,
  onTogglePlayback,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg p-1">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-2 rounded text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        <Undo size={16} />
      </button>
      
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-2 rounded text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Y)"
      >
        <Redo size={16} />
      </button>
      
      <div className="w-px h-6 bg-gray-600 mx-1" />
      
      <button
        onClick={onTogglePlayback}
        className={`p-2 rounded transition-colors ${
          isPlaying
            ? 'bg-red-500 text-white'
            : 'bg-green-500 text-white'
        }`}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      
      <button
        onClick={onSave}
        className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        title="Save Scene (Ctrl+S)"
      >
        <Save size={16} />
      </button>
    </div>
  );
}

// Main Shell UI Controls Component
export function ShellUIControls({
  cameraMode,
  onCameraModeChange,
  showGrid,
  onToggleGrid,
  showPerformance,
  onTogglePerformance,
  isPlaying,
  onTogglePlayback,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  lightingMode,
  onToggleLighting,
  selectionMode,
  onToggleSelectionMode
}: ShellUIControlsProps) {
  const { selection, setTransformMode } = useSelection();
  const { focusOnSelected, resetView } = useSmoothCameraTransitions();
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showPerformanceStats, setShowPerformanceStats] = useState(showPerformance);

  const handleFocusSelected = useCallback(() => {
    if (selection.selectedObject) {
      console.log('🎯 Focus on selected object');
      focusOnSelected(1.5);
    }
  }, [selection.selectedObject, focusOnSelected]);

  const handleResetView = useCallback(() => {
    console.log('🏠 Reset camera to default view');
    resetView(2.0);
  }, [resetView]);

  return (
    <>
      {/* Top Toolbar */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-center gap-3">
          <CameraControls
            cameraMode={cameraMode}
            onCameraModeChange={onCameraModeChange}
            onFocusSelected={handleFocusSelected}
            onResetView={handleResetView}
          />
          
          <ViewportToolbar
            showGrid={showGrid}
            onToggleGrid={onToggleGrid}
            showPerformance={showPerformance}
            onTogglePerformance={onTogglePerformance}
            lightingMode={lightingMode}
            onToggleLighting={onToggleLighting}
            selectionMode={selectionMode}
            onToggleSelectionMode={onToggleSelectionMode}
          />
          
          <PlaybackControls
            isPlaying={isPlaying}
            onTogglePlayback={onTogglePlayback}
            onSave={onSave}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>
      </div>

      {/* Bottom Transform Toolbar */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <TransformToolbar
          transformMode={selection.transformMode}
          onTransformModeChange={setTransformMode}
          hasSelection={!!selection.selectedObject}
        />
      </div>

      {/* Layer Panel Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className={`p-3 rounded-lg transition-colors ${
            showLayerPanel
              ? 'bg-blue-500 text-white'
              : 'bg-black/40 backdrop-blur-sm text-gray-300 hover:bg-gray-700'
          }`}
          title="Toggle Layers Panel"
        >
          <Layers size={20} />
        </button>
      </div>

      {/* Performance Stats Integration */}
      <PerformanceStats 
        isVisible={showPerformanceStats}
        onToggleVisibility={() => {
          setShowPerformanceStats(!showPerformanceStats);
          onTogglePerformance();
        }}
        position="top-left"
      />

      {/* Responsive Mobile Toolbar - Hidden on Desktop */}
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        <div className="flex flex-col gap-2">
          <button
            className="p-3 bg-black/40 backdrop-blur-sm rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
            title="Mobile Menu"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </>
  );
}

export default ShellUIControls;