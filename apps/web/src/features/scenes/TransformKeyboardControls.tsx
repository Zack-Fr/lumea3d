import { useEffect } from 'react';
import { useSelection } from './SelectionContext';

export function TransformKeyboardControls() {
  const { selection, setTransformMode, deselectObject } = useSelection();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when an object is selected and no input is focused
      if (!selection.selectedObject || 
          document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.code) {
        case 'KeyG':
          event.preventDefault();
          setTransformMode('translate');
          console.log('Transform: Switched to translate mode (G)');
          break;

        case 'KeyR':
          event.preventDefault();
          setTransformMode('rotate');
          console.log('Transform: Switched to rotate mode (R)');
          break;

        case 'KeyS':
          event.preventDefault();
          setTransformMode('scale');
          console.log('Transform: Switched to scale mode (S)');
          break;

        case 'Escape':
          event.preventDefault();
          deselectObject();
          console.log('Transform: Deselected object (Esc)');
          break;

        case 'Delete':
        case 'Backspace':
          // Future: Delete object functionality
          event.preventDefault();
          console.log('Transform: Delete object requested (future feature)');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selection.selectedObject, setTransformMode, deselectObject]);

  // This component doesn't render anything
  return null;
}