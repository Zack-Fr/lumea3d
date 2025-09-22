import { useEffect, useCallback, useRef } from 'react';
import { log } from '../../utils/logger';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category: string;
}

interface UseSceneKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  preventDefault?: boolean;
}

export function useSceneKeyboardShortcuts({
  shortcuts,
  enabled = true,
  preventDefault = true
}: UseSceneKeyboardShortcutsProps) {
  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts);
  const enabledRef = useRef(enabled);

  // Update refs when props change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabledRef.current) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    )) {
      return;
    }

    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = (shortcut.ctrlKey || false) === event.ctrlKey;
      const shiftMatch = (shortcut.shiftKey || false) === event.shiftKey;
      const altMatch = (shortcut.altKey || false) === event.altKey;
      const metaMatch = (shortcut.metaKey || false) === event.metaKey;

      return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch;
    });

    if (matchingShortcut) {
      if (preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
      
  log('debug', '⌨️ SceneShortcuts: Triggered:', matchingShortcut.description);
      matchingShortcut.action();
    }
  }, [preventDefault]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current
  };
}

// Helper function to format shortcut display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const modifiers = [];
  
  if (shortcut.ctrlKey || shortcut.metaKey) {
    modifiers.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (shortcut.altKey) {
    modifiers.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
  }
  if (shortcut.shiftKey) {
    modifiers.push('⇧');
  }
  
  return [...modifiers, shortcut.key.toUpperCase()].join('+');
}

// Predefined shortcut categories
export const SHORTCUT_CATEGORIES = {
  EDIT: 'Edit',
  VIEW: 'View',
  SELECTION: 'Selection',
  TRANSFORM: 'Transform',
  SCENE: 'Scene',
  NAVIGATION: 'Navigation'
} as const;

// Common scene editor shortcuts
export function createSceneEditorShortcuts({
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
  onSave,
  onSelectAll,
  onDeselectAll,
  onToggleGrid,
  onToggleWireframe,
  onResetCamera,
  onFocusSelected
}: {
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSave?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onToggleGrid?: () => void;
  onToggleWireframe?: () => void;
  onResetCamera?: () => void;
  onFocusSelected?: () => void;
}): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = [];

  if (onUndo) {
    shortcuts.push({
      key: 'z',
      ctrlKey: true,
      action: onUndo,
      description: 'Undo last action',
      category: SHORTCUT_CATEGORIES.EDIT
    });
  }

  if (onRedo) {
    shortcuts.push({
      key: 'y',
      ctrlKey: true,
      action: onRedo,
      description: 'Redo last action',
      category: SHORTCUT_CATEGORIES.EDIT
    });
  }

  if (onDelete) {
    shortcuts.push({
      key: 'Delete',
      action: onDelete,
      description: 'Delete selected objects',
      category: SHORTCUT_CATEGORIES.EDIT
    });
  }

  if (onDuplicate) {
    shortcuts.push({
      key: 'd',
      ctrlKey: true,
      action: onDuplicate,
      description: 'Duplicate selected objects',
      category: SHORTCUT_CATEGORIES.EDIT
    });
  }

  if (onSave) {
    shortcuts.push({
      key: 's',
      ctrlKey: true,
      action: onSave,
      description: 'Save scene',
      category: SHORTCUT_CATEGORIES.SCENE
    });
  }

  if (onSelectAll) {
    shortcuts.push({
      key: 'a',
      ctrlKey: true,
      action: onSelectAll,
      description: 'Select all objects',
      category: SHORTCUT_CATEGORIES.SELECTION
    });
  }

  if (onDeselectAll) {
    shortcuts.push({
      key: 'Escape',
      action: onDeselectAll,
      description: 'Deselect all objects',
      category: SHORTCUT_CATEGORIES.SELECTION
    });
  }

  if (onToggleGrid) {
    shortcuts.push({
      key: 'g',
      action: onToggleGrid,
      description: 'Toggle grid visibility',
      category: SHORTCUT_CATEGORIES.VIEW
    });
  }

  if (onToggleWireframe) {
    shortcuts.push({
      key: 'w',
      action: onToggleWireframe,
      description: 'Toggle wireframe mode',
      category: SHORTCUT_CATEGORIES.VIEW
    });
  }

  if (onResetCamera) {
    shortcuts.push({
      key: 'Home',
      action: onResetCamera,
      description: 'Reset camera to spawn position',
      category: SHORTCUT_CATEGORIES.NAVIGATION
    });
  }

  if (onFocusSelected) {
    shortcuts.push({
      key: 'f',
      action: onFocusSelected,
      description: 'Focus on selected objects',
      category: SHORTCUT_CATEGORIES.NAVIGATION
    });
  }

  return shortcuts;
}