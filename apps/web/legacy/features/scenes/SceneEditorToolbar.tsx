import { useState } from 'react';
import { 
  Save, 
  Undo, 
  Redo, 
  History, 
  Users, 
  Keyboard,
  Grid,
  Zap
} from 'lucide-react';
import { useScenePersistence } from './ScenePersistenceContext';

interface SceneEditorToolbarProps {
  position?: 'top' | 'bottom';
  compact?: boolean;
  onShowHistory?: () => void;
  onShowShortcuts?: () => void;
  onToggleGrid?: () => void;
  onTogglePerformance?: () => void;
}

export function SceneEditorToolbar({
  position = 'top',
  compact = false,
  onShowHistory,
  onShowShortcuts,
  onToggleGrid,
  onTogglePerformance
}: SceneEditorToolbarProps) {
  const { state: persistenceState, actions } = useScenePersistence();
  const [showCollaborators, setShowCollaborators] = useState(false);

  const positionClasses = position === 'top' 
    ? 'top-4 left-1/2 transform -translate-x-1/2'
    : 'bottom-4 left-1/2 transform -translate-x-1/2';

  const getConnectionStatusColor = () => {
    switch (persistenceState.connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const handleSave = () => {
    if (persistenceState.isDirty && !persistenceState.isSaving) {
      actions.saveScene();
    }
  };

  if (compact) {
    return (
      <div className={`fixed ${positionClasses} z-40`}>
        <div className="bg-black bg-opacity-80 backdrop-blur-sm rounded-lg border border-gray-600 px-3 py-2">
          <div className="flex items-center gap-2">
            {/* Save Status */}
            <button
              onClick={handleSave}
              disabled={!persistenceState.isDirty || persistenceState.isSaving}
              className={`p-1 rounded transition-colors ${
                persistenceState.isDirty
                  ? 'text-yellow-400 hover:text-yellow-300'
                  : 'text-gray-600 cursor-not-allowed'
              }`}
              title={persistenceState.isDirty ? 'Save changes' : 'No changes to save'}
            >
              <Save className="w-4 h-4" />
            </button>

            {/* Connection Status */}
            <div className={`w-2 h-2 rounded-full ${
              persistenceState.connectionStatus === 'connected' ? 'bg-green-400' :
              persistenceState.connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              persistenceState.connectionStatus === 'error' ? 'bg-red-400' :
              'bg-gray-400'
            }`} title={`Connection: ${persistenceState.connectionStatus}`} />

            {/* Collaborators Count */}
            {persistenceState.collaborators.length > 0 && (
              <div className="flex items-center gap-1 text-cyan-400 text-xs">
                <Users className="w-3 h-3" />
                <span>{persistenceState.collaborators.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses} z-40`}>
      <div className="bg-black bg-opacity-90 backdrop-blur-sm rounded-lg border border-gray-600 p-2">
        <div className="flex items-center gap-1">
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!persistenceState.isDirty || persistenceState.isSaving}
            className={`p-2 rounded transition-colors ${
              persistenceState.isDirty
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
            title={
              persistenceState.isSaving ? 'Saving...' :
              persistenceState.isDirty ? 'Save changes (Ctrl+S)' :
              'No changes to save'
            }
          >
            <Save className="w-4 h-4" />
          </button>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-600 mx-1" />

          {/* Undo Button */}
          <button
            onClick={() => {/* Future: Hook to undo system */}}
            className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>

          {/* Redo Button */}
          <button
            onClick={() => {/* Future: Hook to redo system */}}
            className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>

          {/* History Button */}
          {onShowHistory && (
            <button
              onClick={onShowHistory}
              className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
              title="Show history"
            >
              <History className="w-4 h-4" />
            </button>
          )}

          {/* Separator */}
          <div className="w-px h-6 bg-gray-600 mx-1" />

          {/* View Controls */}
          {onToggleGrid && (
            <button
              onClick={onToggleGrid}
              className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
              title="Toggle grid (G)"
            >
              <Grid className="w-4 h-4" />
            </button>
          )}

          {onTogglePerformance && (
            <button
              onClick={onTogglePerformance}
              className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
              title="Toggle performance monitor"
            >
              <Zap className="w-4 h-4" />
            </button>
          )}

          {/* Separator */}
          <div className="w-px h-6 bg-gray-600 mx-1" />

          {/* Collaborators */}
          <div className="relative">
            <button
              onClick={() => setShowCollaborators(!showCollaborators)}
              className={`p-2 rounded hover:bg-gray-700 transition-colors flex items-center gap-1 ${getConnectionStatusColor()}`}
              title={`${persistenceState.collaborators.length} collaborator(s) online`}
            >
              <Users className="w-4 h-4" />
              {persistenceState.collaborators.length > 0 && (
                <span className="text-xs">{persistenceState.collaborators.length}</span>
              )}
            </button>

            {/* Collaborators Dropdown */}
            {showCollaborators && persistenceState.collaborators.length > 0 && (
              <div className="absolute top-full mt-1 right-0 bg-gray-800 border border-gray-600 rounded-lg p-2 min-w-[200px]">
                <div className="text-xs text-gray-400 mb-2">Online Collaborators</div>
                {persistenceState.collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center gap-2 py-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-white">{collaborator.name}</span>
                    <span className="text-xs text-gray-400">({collaborator.role})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shortcuts Help */}
          {onShowShortcuts && (
            <button
              onClick={onShowShortcuts}
              className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          )}

          {/* Scene Status */}
          <div className="flex items-center gap-2 ml-2 px-2 py-1 bg-gray-800 rounded text-xs">
            <span className="text-gray-400">v{persistenceState.version}</span>
            {persistenceState.pendingOps.length > 0 && (
              <span className="text-yellow-400">
                {persistenceState.pendingOps.length} pending
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}