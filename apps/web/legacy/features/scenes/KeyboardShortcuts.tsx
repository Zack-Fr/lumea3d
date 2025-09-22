import { useEffect } from 'react';
import { useSelection } from '../../../src/features/scenes/SelectionContext';
import { useSmoothCameraTransitions } from '../../../src/features/scenes/SmoothCameraControls';

interface KeyboardShortcutsProps {
  enabled?: boolean;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function KeyboardShortcuts({ 
  enabled = true, 
  onSave, 
  onUndo, 
  onRedo 
}: KeyboardShortcutsProps) {
  const { selection, setTransformMode } = useSelection();
  const { focusOnSelected, resetView, frameAll, topView, isometricView } = useSmoothCameraTransitions();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const { key, ctrlKey, metaKey, shiftKey } = event;
      const isModPressed = ctrlKey || metaKey;

      // Transform tool shortcuts
      switch (key.toLowerCase()) {
        case 'g':
          if (!isModPressed) {
            setTransformMode('translate');
            event.preventDefault();
            console.log('🔧 Switch to Move tool (G)');
          }
          break;
        
        case 'r':
          if (!isModPressed) {
            setTransformMode('rotate');
            event.preventDefault();
            console.log('🔧 Switch to Rotate tool (R)');
          }
          break;
        
        case 's':
          if (!isModPressed && !shiftKey) {
            setTransformMode('scale');
            event.preventDefault();
            console.log('🔧 Switch to Scale tool (S)');
          } else if (isModPressed && !shiftKey) {
            // Ctrl+S or Cmd+S for save
            onSave?.();
            event.preventDefault();
            console.log('💾 Save triggered');
          }
          break;

        // Camera shortcuts
        case 'f':
          if (!isModPressed && selection.selectedObject) {
            focusOnSelected(1.5);
            event.preventDefault();
            console.log('🎯 Focus on selected (F)');
          }
          break;
        
        case 'home':
          resetView(2.0);
          event.preventDefault();
          console.log('🏠 Reset view (Home)');
          break;
        
        case 'a':
          if (!isModPressed) {
            frameAll(2.5);
            event.preventDefault();
            console.log('🖼️ Frame all (A)');
          }
          break;

        // View shortcuts
        case '1':
          if (!isModPressed) {
            resetView(1.5);
            event.preventDefault();
            console.log('📐 Front view (1)');
          }
          break;
        
        case '3':
          if (!isModPressed) {
            isometricView(1.5);
            event.preventDefault();
            console.log('📐 Isometric view (3)');
          }
          break;
        
        case '7':
          if (!isModPressed) {
            topView(1.5);
            event.preventDefault();
            console.log('📐 Top view (7)');
          }
          break;

        // Edit shortcuts
        case 'z':
          if (isModPressed && !shiftKey) {
            onUndo?.();
            event.preventDefault();
            console.log('↶ Undo');
          } else if (isModPressed && shiftKey) {
            onRedo?.();
            event.preventDefault();
            console.log('↷ Redo');
          }
          break;
        
        case 'y':
          if (isModPressed) {
            onRedo?.();
            event.preventDefault();
            console.log('↷ Redo (Ctrl+Y)');
          }
          break;

        // Selection shortcuts
        case 'escape':
          // Clear selection could be implemented here
          console.log('🚫 Escape pressed - could clear selection');
          break;

        case 'delete':
        case 'backspace':
          if (selection.selectedObject) {
            console.log('🗑️ Delete selected object');
            // Delete functionality could be implemented here
          }
          break;

        default:
          break;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Log active shortcuts
    console.log('⌨️ Keyboard shortcuts enabled:');
    console.log('  Transform: G (move), R (rotate), S (scale)');
    console.log('  Camera: F (focus), Home (reset), A (frame all)');
    console.log('  Views: 1 (front), 3 (iso), 7 (top)');
    console.log('  Edit: Ctrl+Z (undo), Ctrl+Y/Ctrl+Shift+Z (redo), Ctrl+S (save)');

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled, 
    setTransformMode, 
    focusOnSelected, 
    resetView, 
    frameAll, 
    topView, 
    isometricView,
    selection.selectedObject,
    onSave,
    onUndo,
    onRedo
  ]);

  return null; // This component doesn't render anything
}

export default KeyboardShortcuts;