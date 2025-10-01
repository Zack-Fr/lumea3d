import { Move, RotateCw, Maximize2, X } from 'lucide-react';
import { useSelection } from './SelectionContext';

export function TransformControlsPanel() {
  const { selection, setTransformMode, deselectObject } = useSelection();

  if (!selection.selectedObject) {
    return null;
  }

  const { selectedObject, transformMode } = selection;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gray-800/90 backdrop-blur-sm text-white rounded-lg p-3 min-w-[300px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">
            Selected: {selectedObject.itemId}
          </div>
          <button
            onClick={deselectObject}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Deselect object"
          >
            <X size={16} />
          </button>
        </div>

        {/* Transform Mode Buttons */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 mr-2">Transform:</span>
          
          <button
            onClick={() => setTransformMode('translate')}
            className={`flex items-center space-x-1 px-3 py-2 rounded transition-colors ${
              transformMode === 'translate'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Move (G)"
          >
            <Move size={16} />
            <span className="text-xs">Move</span>
          </button>

          <button
            onClick={() => setTransformMode('rotate')}
            className={`flex items-center space-x-1 px-3 py-2 rounded transition-colors ${
              transformMode === 'rotate'
                ? 'bg-green-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Rotate (R)"
          >
            <RotateCw size={16} />
            <span className="text-xs">Rotate</span>
          </button>

          <button
            onClick={() => setTransformMode('scale')}
            className={`flex items-center space-x-1 px-3 py-2 rounded transition-colors ${
              transformMode === 'scale'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Scale (S)"
          >
            <Maximize2 size={16} />
            <span className="text-xs">Scale</span>
          </button>
        </div>

        {/* Object Info */}
        <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-400">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-500">Category:</span> {selectedObject.category}
            </div>
            <div>
              <span className="text-gray-500">Locked:</span> {selectedObject.object.userData.locked ? 'Yes' : 'No'}
            </div>
          </div>
          
          {/* Transform values */}
          <div className="mt-2 space-y-1">
            <div>
              <span className="text-gray-500">Position:</span> {' '}
              ({selectedObject.object.position.x.toFixed(2)}, {selectedObject.object.position.y.toFixed(2)}, {selectedObject.object.position.z.toFixed(2)})
            </div>
            <div>
              <span className="text-gray-500">Rotation:</span> {' '}
              ({(selectedObject.object.rotation.x * 180 / Math.PI).toFixed(1)}°, {(selectedObject.object.rotation.y * 180 / Math.PI).toFixed(1)}°, {(selectedObject.object.rotation.z * 180 / Math.PI).toFixed(1)}°)
            </div>
            <div>
              <span className="text-gray-500">Scale:</span> {' '}
              ({selectedObject.object.scale.x.toFixed(2)}, {selectedObject.object.scale.y.toFixed(2)}, {selectedObject.object.scale.z.toFixed(2)})
            </div>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-500">
          G: Move, R: Rotate, S: Scale, Esc: Deselect
        </div>
      </div>
    </div>
  );
}