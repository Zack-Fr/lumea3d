import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Object3D, Vector3, Euler } from 'three';
import { log } from '../../utils/logger';

export interface SelectedObject {
  id: string;
  object: Object3D;
  itemId: string;
  category: string;
  originalPosition: Vector3;
  originalRotation: Euler;
  originalScale: Vector3;
}

export interface SelectionState {
  selectedObject: SelectedObject | null;
  transformMode: 'translate' | 'rotate' | 'scale';
  isTransforming: boolean;
}

export interface SelectionContextType {
  selection: SelectionState;
  selectObject: (object: Object3D) => void;
  deselectObject: () => void;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  setIsTransforming: (transforming: boolean) => void;
  updateObjectTransform: (position?: Vector3, rotation?: Euler, scale?: Vector3) => void;
}

const SelectionContext = createContext<SelectionContextType | null>(null);

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  return context;
}

interface SelectionProviderProps {
  children: ReactNode;
}

export function SelectionProvider({ children }: SelectionProviderProps) {
  const [selection, setSelection] = useState<SelectionState>({
    selectedObject: null,
    transformMode: 'translate',
    isTransforming: false,
  });

  const selectObject = useCallback((object: Object3D) => {
    // Check if object has the required userData for selection
    const userData = object.userData;
    if (!userData || !userData.itemId || !userData.selectable) {
      log('warn', '⚠️ Object is not selectable:', object.name);
      return;
    }

    if (userData.locked) {
      log('warn', '🔒 Object is locked:', userData.itemId);
      return;
    }

    log('info', '🎯 Object selected:', userData.itemId);

    const selectedObject: SelectedObject = {
      id: object.uuid,
      object,
      itemId: userData.itemId,
      category: userData.category,
      originalPosition: object.position.clone(),
      originalRotation: object.rotation.clone(),
      originalScale: object.scale.clone(),
    };

    setSelection(prev => ({
      ...prev,
      selectedObject,
      isTransforming: false,
    }));
  }, []);

  const deselectObject = useCallback(() => {
  log('info', '🎯 Object deselected');
    setSelection(prev => ({
      ...prev,
      selectedObject: null,
      isTransforming: false,
    }));
  }, []);

  const setTransformMode = useCallback((mode: 'translate' | 'rotate' | 'scale') => {
  log('debug', '🔧 Transform mode changed to:', mode);
    setSelection(prev => ({
      ...prev,
      transformMode: mode,
    }));
  }, []);

  const setIsTransforming = useCallback((transforming: boolean) => {
    setSelection(prev => ({
      ...prev,
      isTransforming: transforming,
    }));
  }, []);

  const updateObjectTransform = useCallback((
    position?: Vector3,
    rotation?: Euler,
    scale?: Vector3
  ) => {
    setSelection(prev => {
      if (!prev.selectedObject) return prev;
      
      const { object } = prev.selectedObject;

      if (position) {
        object.position.copy(position);
      }
      if (rotation) {
        object.rotation.copy(rotation);
      }
      if (scale) {
        object.scale.copy(scale);
      }

      log('debug', '🔄 Object transform updated:', {
        itemId: prev.selectedObject.itemId,
        position: object.position.toArray(),
        rotation: object.rotation.toArray(),
        scale: object.scale.toArray(),
      });
      
      return prev;
    });
  }, []);

  return (
    <SelectionContext.Provider
      value={{
        selection,
        selectObject,
        deselectObject,
        setTransformMode,
        setIsTransforming,
        updateObjectTransform,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}