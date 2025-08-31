import { useState } from 'react';
import { CloudOff, Loader2, Save, Users, Wifi, WifiOff } from 'lucide-react';
import { useScenePersistence } from './ScenePersistenceContext';

interface ScenePersistenceStatusProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

export function ScenePersistenceStatus({ 
  position = 'bottom-right',
  compact = false 
}: ScenePersistenceStatusProps) {
  const { state, actions } = useScenePersistence();
  const [showDetails, setShowDetails] = useState(false);

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getStatusIcon = () => {
    if (state.isSaving) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
    }
    
    if (state.isDirty) {
      return <Save className="w-4 h-4 text-yellow-400" />;
    }
    
    switch (state.connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-400" />;
      case 'connecting':
        return <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />;
      case 'error':
        return <WifiOff className="w-4 h-4 text-red-400" />;
      default:
        return <CloudOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (state.isSaving) return 'Saving...';
    if (state.isDirty) return 'Unsaved changes';
    
    switch (state.connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection error';
      default:
        return 'Offline';
    }
  };

  const formatLastSaved = () => {
    if (!state.lastSaved) return 'Never saved';
    
    const now = Date.now();
    const diff = now - state.lastSaved;
    
    if (diff < 60000) return 'Just saved';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(state.lastSaved).toLocaleDateString();
  };

  const handleManualSave = () => {
    if (state.isDirty && !state.isSaving) {
      actions.saveScene();
    }
  };

  if (compact) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <div 
          className="bg-black bg-opacity-70 text-white text-xs font-mono px-2 py-1 rounded border border-gray-600 cursor-pointer hover:bg-opacity-80 transition-opacity"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
            {state.collaborators.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{state.collaborators.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <div className="bg-black bg-opacity-80 text-white text-xs font-mono p-3 rounded-lg border border-gray-600 min-w-[250px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 border-b border-gray-600 pb-1">
          <span className="text-blue-400 font-semibold">Scene Status</span>
          <button
            onClick={handleManualSave}
            disabled={!state.isDirty || state.isSaving}
            className="px-2 py-1 text-[10px] bg-blue-600 rounded disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
          >
            {state.isSaving ? 'Saving...' : 'Save Now'}
          </button>
        </div>

        {/* Connection Status */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon()}
            <span className="text-white">{getStatusText()}</span>
          </div>
          <div className="text-gray-400 text-[10px]">
            Version: {state.version} | {formatLastSaved()}
          </div>
        </div>

        {/* Pending Operations */}
        {state.pendingOps.length > 0 && (
          <div className="mb-2">
            <div className="text-gray-400 text-[10px] mb-1">PENDING CHANGES</div>
            <div className="text-yellow-400 text-[10px]">
              {state.pendingOps.length} operation{state.pendingOps.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Collaborators */}
        {state.collaborators.length > 0 && (
          <div>
            <div className="text-gray-400 text-[10px] mb-1">COLLABORATORS</div>
            <div className="space-y-1">
              {state.collaborators.slice(0, 3).map((collaborator) => (
                <div key={collaborator.id} className="flex items-center gap-2 text-[10px]">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-cyan-400">{collaborator.name}</span>
                  <span className="text-gray-500">({collaborator.role})</span>
                </div>
              ))}
              {state.collaborators.length > 3 && (
                <div className="text-gray-400 text-[10px]">
                  +{state.collaborators.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}