import { useEffect } from 'react';
import { useSelection as useNewSelection } from '../../viewer/selection/useSelection';
import { TransformBridge } from '../../viewer/controls/TransformBridge';
import { useInstanceBoxHelper } from '../../viewer/bbox/InstanceBoxHelper';
import { useThree } from '@react-three/fiber';

/**
 * Bridge component that integrates the new instanced selection system
 * with the existing scene infrastructure
 */
export function InstancedSelectionBridge() {
  const { scene } = useThree();
  const { selection } = useNewSelection();
  const boxHelper = useInstanceBoxHelper(scene);

  // Show/hide bounding box based on selection
  useEffect(() => {
    if (selection) {
      boxHelper.showForInstance(selection.assetId, selection.index);
    } else {
      boxHelper.hide();
    }
  }, [selection, boxHelper]);

  // Render transform controls for instanced selection
  if (!selection) {
    return null;
  }

  return (
    <>
      {/* Transform controls for instanced objects */}
      <TransformBridge
        selection={selection}
        transformMode="translate" // TODO: Make this configurable
        onTransformStart={() => {
          console.log('🔧 Instance transform started');
        }}
        onTransformEnd={() => {
          console.log('🔧 Instance transform ended');
          // Update bounding box after transform
          boxHelper.updateForInstance(selection.assetId, selection.index);
        }}
        enabled={true}
      />
    </>
  );
}