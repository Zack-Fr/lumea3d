import { useState } from 'react';

interface ProjectEditorSettings {
  showProperties: boolean;
  setShowProperties: (show: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  lightingMode: string;
  setLightingMode: (mode: string) => void;
  renderMode: string;
  setRenderMode: (mode: string) => void;
}

export const useProjectEditorSettings = (): ProjectEditorSettings => {
  const [showProperties, setShowProperties] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lightingMode, setLightingMode] = useState("day");
  const [renderMode, setRenderMode] = useState("realistic");

  return {
    showProperties,
    setShowProperties,
    soundEnabled,
    setSoundEnabled,
    lightingMode,
    setLightingMode,
    renderMode,
    setRenderMode
  };
};