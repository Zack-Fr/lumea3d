import { useState } from 'react';
import { ActiveLayersPanel } from './ActiveLayersPanel';

export function LayersToggleButton() {
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
        className={`fixed left-4 top-4 z-40 px-3 py-2 rounded-lg shadow-lg transition-all ${
          isLayersPanelOpen 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
        title="Toggle Active Layers Panel"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📋</span>
          <span className="text-sm font-medium">Layers</span>
          {isLayersPanelOpen && <span className="text-xs">×</span>}
        </div>
      </button>

      {/* Active Layers Panel */}
      <ActiveLayersPanel 
        isOpen={isLayersPanelOpen} 
        onClose={() => setIsLayersPanelOpen(false)} 
      />
    </>
  );
}