import { useEffect } from 'react';
import { useSelection as useNewSelection } from '../../viewer/selection/useSelection';
import { TransformBridge } from '../../viewer/controls/TransformBridge';
import { useInstanceBoxHelper } from '../../viewer/bbox/InstanceBoxHelper';
import { useThree } from '@react-three/fiber';
import { useScenePersistence } from './ScenePersistenceContext';

/**
 * Bridge component that integrates the new instanced selection system
 * with the existing scene infrastructure
 */
export function InstancedSelectionBridge() {
  const { scene } = useThree();
  const { selection } = useNewSelection();
  const boxHelper = useInstanceBoxHelper(scene);
  const { actions: { updateItem } } = useScenePersistence();

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
        onTransformEnd={(transformData) => {
          console.log('🔧 Instance transform ended');
          
          // Update bounding box after transform
          boxHelper.updateForInstance(selection.assetId, selection.index);
          
          // Save transform changes to persistence system
          if (transformData && selection?.itemId) {
            console.log('💾 Saving transform data:', {
              itemId: selection.itemId,
              transform: transformData,
              selectionAssetId: selection.assetId
            });
            
            try {
              updateItem(selection.itemId, {
                transform: {
                  position: transformData.position,
                  rotation_euler: transformData.rotation,
                  scale: transformData.scale
                }
              });
              
              console.log('✅ Transform saved to persistence');
            } catch (error) {
              console.error('❌ Failed to save transform:', error);
            }
          }
        }}
        enabled={true}
      />
    </>
  );
}