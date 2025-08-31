interface ControlsInstructionsProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export function ControlsInstructions({ isVisible, onDismiss }: ControlsInstructionsProps) {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white rounded-lg p-6 max-w-lg mx-4">
        <h3 className="text-lg font-semibold mb-4">🎮 3D Viewer Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Movement Controls */}
          <div>
            <h4 className="font-medium text-yellow-400 mb-2">Movement</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Move:</span>
                <span className="font-mono">WASD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Look:</span>
                <span className="font-mono">Mouse</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Sprint:</span>
                <span className="font-mono">Shift</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Jump:</span>
                <span className="font-mono">Space</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Exit lock:</span>
                <span className="font-mono">Escape</span>
              </div>
            </div>
          </div>
          
          {/* Object Controls */}
          <div>
            <h4 className="font-medium text-green-400 mb-2">Objects</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Select:</span>
                <span className="font-mono">Click</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Move:</span>
                <span className="font-mono">G</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Rotate:</span>
                <span className="font-mono">R</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Scale:</span>
                <span className="font-mono">S</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Deselect:</span>
                <span className="font-mono">Escape</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-900/50 rounded text-xs">
          💡 <strong>Click in the 3D view</strong> to enable mouse look. Use sidebar controls to toggle grid, lighting, and navigation features.
        </div>
        
        <button
          onClick={onDismiss}
          className="mt-4 w-full bg-yellow-400 text-black font-medium py-2 px-4 rounded hover:bg-yellow-500 transition-colors"
        >
          Start Exploring!
        </button>
      </div>
    </div>
  );
}