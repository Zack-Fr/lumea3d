import React from 'react';
import { useSaveQueueStore } from '../stores/saveQueueStore';

interface AutosaveIndicatorProps {
  className?: string;
}

export const AutosaveIndicator: React.FC<AutosaveIndicatorProps> = ({ className = '' }) => {
  const { saveState, queue, createSnapshot } = useSaveQueueStore();
  const [isCreatingSnapshot, setIsCreatingSnapshot] = React.useState(false);

  const handleManualSave = async () => {
    try {
      setIsCreatingSnapshot(true);
      const timestamp = new Date().toLocaleString();
      await createSnapshot(`Manual Save - ${timestamp}`);
    } catch (error) {
      console.error('Manual save failed:', error);
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const getStatusText = () => {
    if (saveState.isOffline) {
      return 'Offline';
    }
    if (saveState.isSaving || isCreatingSnapshot) {
      return 'Saving…';
    }
    if (saveState.saveError) {
      return 'Save failed';
    }
    if (queue.length > 0) {
      return 'Unsaved changes';
    }
    if (saveState.lastSaved) {
      return 'All changes saved';
    }
    return 'Ready';
  };

  const getStatusIcon = () => {
    if (saveState.isOffline) {
      return '🔌';
    }
    if (saveState.isSaving || isCreatingSnapshot) {
      return '💾';
    }
    if (saveState.saveError) {
      return '❌';
    }
    if (queue.length > 0) {
      return '⏳';
    }
    return '✅';
  };

  const getStatusColor = () => {
    if (saveState.isOffline || saveState.saveError) {
      return 'text-red-500';
    }
    if (saveState.isSaving || isCreatingSnapshot) {
      return 'text-blue-500';
    }
    if (queue.length > 0) {
      return 'text-yellow-500';
    }
    return 'text-green-500';
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Status indicator */}
      <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
        <span className="animate-pulse">{getStatusIcon()}</span>
        <span>{getStatusText()}</span>
        {saveState.lastSaved && !queue.length && (
          <span className="text-gray-400 text-xs">
            • v{saveState.currentVersion}
          </span>
        )}
      </div>

      {/* Error details */}
      {saveState.saveError && (
        <div className="text-xs text-red-400 max-w-xs truncate" title={saveState.saveError}>
          {saveState.saveError}
        </div>
      )}

      {/* Manual save button */}
      <button
        onClick={handleManualSave}
        disabled={saveState.isSaving || isCreatingSnapshot || saveState.isOffline}
        className={`
          px-3 py-1 text-sm rounded border 
          ${saveState.isSaving || isCreatingSnapshot || saveState.isOffline
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
          }
          transition-colors
        `}
        title="Create manual snapshot"
      >
        {isCreatingSnapshot ? 'Saving…' : 'Manual Save'}
      </button>

      {/* Queue info (debug) */}
      {queue.length > 0 && (
        <span className="text-xs text-gray-400">
          {queue.length} pending
        </span>
      )}
    </div>
  );
};

export default AutosaveIndicator;