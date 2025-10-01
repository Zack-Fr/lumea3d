import { useState, useCallback } from 'react';

interface AudioState {
  soundEnabled: boolean;
}

interface AudioActions {
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
}

export const useAudio = (initialEnabled: boolean = true): AudioState & AudioActions => {
  const [soundEnabled, setSoundEnabled] = useState(initialEnabled);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  return {
    soundEnabled,
    setSoundEnabled,
    toggleSound,
  };
};