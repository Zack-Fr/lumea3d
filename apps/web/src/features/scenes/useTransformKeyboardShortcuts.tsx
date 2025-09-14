import { useEffect, useCallback } from 'react';
import { log } from '../../utils/logger';
import { useSelection } from './SelectionContext';

interface UseTransformKeyboardShortcutsProps {
  enabled?: boolean;
}

export function useTransformKeyboardShortcuts({
  enabled = true
}: UseTransformKeyboardShortcutsProps = {}) {
  const { undoTransform, redoTransform, canUndoTransform, canRedoTransform } = useSelection();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    )) {
      return;
    }

    // Handle Ctrl+Z (Undo)
    if (event.ctrlKey && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      if (canUndoTransform()) {
        event.preventDefault();
        event.stopPropagation();
        const success = undoTransform();
        if (success) {
          log('info', '⌨️ Keyboard shortcut: Transform undo');
        }
      }
      return;
    }

    // Handle Ctrl+Y (Redo) or Ctrl+Shift+Z (Alternative Redo)
    if ((event.ctrlKey && event.key.toLowerCase() === 'y') || 
        (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'z')) {
      if (canRedoTransform()) {
        event.preventDefault();
        event.stopPropagation();
        const success = redoTransform();
        if (success) {
          log('info', '⌨️ Keyboard shortcut: Transform redo');
        }
      }
      return;
    }
  }, [enabled, undoTransform, redoTransform, canUndoTransform, canRedoTransform]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);

  return {
    canUndo: canUndoTransform(),
    canRedo: canRedoTransform(),
    undo: undoTransform,
    redo: redoTransform
  };
}