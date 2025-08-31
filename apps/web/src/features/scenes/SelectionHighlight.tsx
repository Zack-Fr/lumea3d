import { useEffect, useState } from 'react';
import { useSelection } from './SelectionContext';
import { BoxHelper } from 'three';

export function SelectionHighlight() {
  const { selection } = useSelection();
  const [boxHelper, setBoxHelper] = useState<BoxHelper | null>(null);

  useEffect(() => {
    // Clean up previous box helper
    if (boxHelper) {
      boxHelper.parent?.remove(boxHelper);
      setBoxHelper(null);
    }

    // Create new box helper for selected object
    if (selection.selectedObject) {
      const object = selection.selectedObject.object;
      
      // Create box helper for visual feedback
      const helper = new BoxHelper(object, 0xffff00); // Yellow outline
      helper.material.linewidth = 2;
      helper.material.transparent = true;
      helper.material.opacity = 0.8;
      
      // Add to the scene
      if (object.parent) {
        object.parent.add(helper);
        setBoxHelper(helper);
        
        console.log('✨ Selection highlight added for:', selection.selectedObject.itemId);
      }
    }

    return () => {
      if (boxHelper) {
        boxHelper.parent?.remove(boxHelper);
      }
    };
  }, [selection.selectedObject]);

  return null; // This component doesn't render anything in React
}