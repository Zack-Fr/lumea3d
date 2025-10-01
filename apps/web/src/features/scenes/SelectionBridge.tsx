import { useEffect } from 'react';
import { useSelection } from './SelectionContext';

interface SelectionBridgeProps {
  onSelectionChange: (itemId: string | null) => void;
}

/**
 * Bridge component to sync SelectionContext with external state
 * This allows the Properties panel to show selected object details
 */
export function SelectionBridge({ onSelectionChange }: SelectionBridgeProps) {
  const { selection } = useSelection();
  
  useEffect(() => {
    const selectedItemId = selection.selectedObject?.itemId || null;
    onSelectionChange(selectedItemId);
  }, [selection.selectedObject, onSelectionChange]);
  
  return null; // This component doesn't render anything
}

export default SelectionBridge;
