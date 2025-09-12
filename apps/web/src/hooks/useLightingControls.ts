import { useState, useCallback, useEffect } from 'react';

interface LightingControls {
  defaultLightEnabled: boolean;
  setDefaultLightEnabled: (enabled: boolean) => void;
  toggleDefaultLight: () => void;
}

// Simple singleton state to share between components
class LightingControlsManager {
  private static instance: LightingControlsManager;
  private _defaultLightEnabled: boolean = true;
  private subscribers: Set<() => void> = new Set();

  static getInstance(): LightingControlsManager {
    if (!LightingControlsManager.instance) {
      LightingControlsManager.instance = new LightingControlsManager();
    }
    return LightingControlsManager.instance;
  }

  get defaultLightEnabled(): boolean {
    return this._defaultLightEnabled;
  }

  setDefaultLightEnabled(enabled: boolean): void {
    if (this._defaultLightEnabled !== enabled) {
      this._defaultLightEnabled = enabled;
      console.log('🌄 Default light:', enabled ? 'enabled' : 'disabled');
      this.notifySubscribers();
    }
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback());
  }
}

export const useLightingControls = (): LightingControls => {
  const manager = LightingControlsManager.getInstance();
  const [defaultLightEnabled, setLocalState] = useState(manager.defaultLightEnabled);

  // Subscribe to changes from the manager
  useEffect(() => {
    return manager.subscribe(() => {
      setLocalState(manager.defaultLightEnabled);
    });
  }, [manager]);

  const setDefaultLightEnabled = useCallback((enabled: boolean) => {
    manager.setDefaultLightEnabled(enabled);
  }, [manager]);

  const toggleDefaultLight = useCallback(() => {
    manager.setDefaultLightEnabled(!manager.defaultLightEnabled);
  }, [manager]);

  return {
    defaultLightEnabled,
    setDefaultLightEnabled,
    toggleDefaultLight
  };
};

export default useLightingControls;