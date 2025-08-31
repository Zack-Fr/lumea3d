interface ControlsInstructionsProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export function ControlsInstructions({ isVisible, onDismiss }: ControlsInstructionsProps) {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white rounded-lg p-6 max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">🎮 FPS Controls</h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">Move:</span>
            <span className="font-mono">WASD / Arrow Keys</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Look around:</span>
            <span className="font-mono">Mouse</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Sprint:</span>
            <span className="font-mono">Hold Shift</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Jump:</span>
            <span className="font-mono">Space</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Exit mouse lock:</span>
            <span className="font-mono">Escape</span>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-900/50 rounded text-xs">
          💡 <strong>Click anywhere</strong> in the 3D view to enable mouse look. 
          Use the sidebar controls to toggle NOCLIP mode for free flight.
        </div>
        
        <button
          onClick={onDismiss}
          className="mt-4 w-full bg-yellow-400 text-black font-medium py-2 px-4 rounded hover:bg-yellow-500 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}