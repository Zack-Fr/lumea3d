import { useState, useCallback } from 'react';

interface PanelsState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
}

interface PanelsActions {
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
}

export const usePanels = (
  initialLeft: boolean = true, 
  initialRight: boolean = true
): PanelsState & PanelsActions => {
  const [leftPanelOpen, setLeftPanelOpen] = useState(initialLeft);
  const [rightPanelOpen, setRightPanelOpen] = useState(initialRight);

  const toggleLeftPanel = useCallback(() => {
    setLeftPanelOpen(prev => !prev);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setRightPanelOpen(prev => !prev);
  }, []);

  return {
    leftPanelOpen,
    rightPanelOpen,
    setLeftPanelOpen,
    setRightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
  };
};