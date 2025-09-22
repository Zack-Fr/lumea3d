import { useReducer, useCallback, useRef } from 'react';
import { log } from '../../../src/utils/logger';
import type { SceneManifestV2, DeltaOp } from '@/api/sdk';

interface HistoryEntry {
  id: string;
  timestamp: number;
  operations: DeltaOp[];
  description: string;
  manifest: SceneManifestV2;
}

interface SceneHistoryState {
  history: HistoryEntry[];
  currentIndex: number;
  maxHistorySize: number;
  isUndoing: boolean;
  isRedoing: boolean;
}

type SceneHistoryAction =
  | { type: 'ADD_ENTRY'; payload: Omit<HistoryEntry, 'id' | 'timestamp'> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_UNDOING'; payload: boolean }
  | { type: 'SET_REDOING'; payload: boolean };

function sceneHistoryReducer(
  state: SceneHistoryState,
  action: SceneHistoryAction
): SceneHistoryState {
  switch (action.type) {
    case 'ADD_ENTRY': {
      const newEntry: HistoryEntry = {
        ...action.payload,
        id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };

      // Remove any history after current index (when adding new entry after undo)
      const truncatedHistory = state.history.slice(0, state.currentIndex + 1);
      
      // Add new entry
      const newHistory = [...truncatedHistory, newEntry];
      
      // Limit history size
      const limitedHistory = newHistory.length > state.maxHistorySize
        ? newHistory.slice(-state.maxHistorySize)
        : newHistory;

      return {
        ...state,
        history: limitedHistory,
        currentIndex: limitedHistory.length - 1
      };
    }

    case 'UNDO': {
      if (state.currentIndex <= 0) return state;
      
      return {
        ...state,
        currentIndex: state.currentIndex - 1,
        isUndoing: true
      };
    }

    case 'REDO': {
      if (state.currentIndex >= state.history.length - 1) return state;
      
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        isRedoing: true
      };
    }

    case 'CLEAR_HISTORY': {
      return {
        ...state,
        history: [],
        currentIndex: -1
      };
    }

    case 'SET_UNDOING': {
      return {
        ...state,
        isUndoing: action.payload
      };
    }

    case 'SET_REDOING': {
      return {
        ...state,
        isRedoing: action.payload
      };
    }

    default:
      return state;
  }
}

interface UseSceneHistoryProps {
  maxHistorySize?: number;
  onUndo?: (manifest: SceneManifestV2) => void;
  onRedo?: (manifest: SceneManifestV2) => void;
}

export function useSceneHistory({
  maxHistorySize = 50,
  onUndo,
  onRedo
}: UseSceneHistoryProps = {}) {
  const [state, dispatch] = useReducer(sceneHistoryReducer, {
    history: [],
    currentIndex: -1,
    maxHistorySize,
    isUndoing: false,
    isRedoing: false
  });

  const pendingOperationsRef = useRef<DeltaOp[]>([]);
  const batchTimeoutRef = useRef<number>();

  const addToHistory = useCallback((
    operations: DeltaOp[],
    manifest: SceneManifestV2,
    description: string
  ) => {
    if (operations.length === 0) return;

    dispatch({
      type: 'ADD_ENTRY',
      payload: {
        operations,
        manifest,
        description
      }
    });

  log('debug', '📚 SceneHistory: Added entry:', description, operations);
  }, []);

  const addOperation = useCallback((
    operation: DeltaOp,
    manifest: SceneManifestV2,
    description?: string
  ) => {
    // Add to pending operations for batching
    pendingOperationsRef.current.push(operation);

    // Clear existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    // Set timeout to batch operations
    batchTimeoutRef.current = window.setTimeout(() => {
      const operations = [...pendingOperationsRef.current];
      pendingOperationsRef.current = [];

      const batchDescription = description || generateDescription(operations);
      addToHistory(operations, manifest, batchDescription);
    }, 500); // Batch operations within 500ms
  }, [addToHistory]);

  const undo = useCallback(() => {
    if (state.currentIndex <= 0 || state.isUndoing || state.isRedoing) {
      return null;
    }

    dispatch({ type: 'UNDO' });
    
    const targetEntry = state.history[state.currentIndex - 1];
      if (targetEntry && onUndo) {
      onUndo(targetEntry.manifest);
      log('debug', '↶ SceneHistory: Undo to:', targetEntry.description);
    }

    // Reset undo flag after processing
    setTimeout(() => {
      dispatch({ type: 'SET_UNDOING', payload: false });
    }, 0);

    return targetEntry?.manifest || null;
  }, [state.currentIndex, state.history, state.isUndoing, state.isRedoing, onUndo]);

  const redo = useCallback(() => {
    if (state.currentIndex >= state.history.length - 1 || state.isUndoing || state.isRedoing) {
      return null;
    }

    dispatch({ type: 'REDO' });
    
    const targetEntry = state.history[state.currentIndex + 1];
    if (targetEntry && onRedo) {
      onRedo(targetEntry.manifest);
      log('debug', '↷ SceneHistory: Redo to:', targetEntry.description);
    }

    // Reset redo flag after processing
    setTimeout(() => {
      dispatch({ type: 'SET_REDOING', payload: false });
    }, 0);

    return targetEntry?.manifest || null;
  }, [state.currentIndex, state.history, state.isUndoing, state.isRedoing, onRedo]);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
    pendingOperationsRef.current = [];
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
  log('info', '🗑️ SceneHistory: Cleared history');
  }, []);

  const canUndo = state.currentIndex > 0 && !state.isUndoing && !state.isRedoing;
  const canRedo = state.currentIndex < state.history.length - 1 && !state.isUndoing && !state.isRedoing;

  const getCurrentEntry = useCallback(() => {
    return state.currentIndex >= 0 ? state.history[state.currentIndex] : null;
  }, [state.currentIndex, state.history]);

  const getHistoryPreview = useCallback((count = 10) => {
    const start = Math.max(0, state.currentIndex - count);
    const end = Math.min(state.history.length, state.currentIndex + count + 1);
    
    return state.history.slice(start, end).map((entry, index) => ({
      ...entry,
      isCurrent: start + index === state.currentIndex,
      relativeIndex: start + index - state.currentIndex
    }));
  }, [state.currentIndex, state.history]);

  return {
    // State
    history: state.history,
    currentIndex: state.currentIndex,
    canUndo,
    canRedo,
    isUndoing: state.isUndoing,
    isRedoing: state.isRedoing,
    
    // Actions
    addOperation,
    addToHistory,
    undo,
    redo,
    clearHistory,
    
    // Queries
    getCurrentEntry,
    getHistoryPreview
  };
}

function generateDescription(operations: DeltaOp[]): string {
  if (operations.length === 0) return 'No changes';
  if (operations.length === 1) {
    const op = operations[0];
    switch (op.op) {
      case 'upsert_item':
        return `Add/update item`;
      case 'remove_item':
        return `Delete item`;
      case 'update_item':
        return `Transform item`;
      case 'scene_props':
        return `Update scene properties`;
      case 'category_add':
        return `Add category`;
      case 'category_remove':
        return `Remove category`;
      default:
        return 'Scene change';
    }
  }
  
  // Multiple operations
  const counts = operations.reduce((acc, op) => {
    acc[op.op] = (acc[op.op] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const descriptions: string[] = [];
  if (counts.upsert_item) descriptions.push(`${counts.upsert_item} item${counts.upsert_item > 1 ? 's' : ''} added/updated`);
  if (counts.remove_item) descriptions.push(`${counts.remove_item} item${counts.remove_item > 1 ? 's' : ''} deleted`);
  if (counts.update_item) descriptions.push(`${counts.update_item} item${counts.update_item > 1 ? 's' : ''} transformed`);
  if (counts.scene_props) descriptions.push('Scene properties updated');

  return descriptions.join(', ') || `${operations.length} changes`;
}