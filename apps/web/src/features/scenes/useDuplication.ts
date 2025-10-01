import { useCallback } from 'react';
import { useInstancingPoolStore, generateAssetId, type InstanceData } from '../../stores/instancingPoolStore';
import { scenesApi } from '../../services/scenesApi';
import { log } from '../../utils/logger';

export interface DuplicationRequest {
  sceneId: string;
  sourceItemId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  categoryKey: string;
  glbUrl: string;
  model?: string;
  version?: string;
}

export interface DuplicationResult {
  success: boolean;
  instanceId?: string;
  realItemId?: string;
  error?: string;
}

export function useDuplication() {
  const { getOrCreatePool, addInstance, updateInstance } = useInstancingPoolStore();

  const duplicateItem = useCallback(async ({
    sceneId,
    sourceItemId,
    position,
    rotation,
    scale,
    categoryKey,
    glbUrl,
    model,
    version
  }: DuplicationRequest): Promise<DuplicationResult> => {
    
    try {
      // Generate temporary ID for optimistic update
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const assetId = generateAssetId(categoryKey, glbUrl, model);
      
      log('info', `🔄 Duplication: Starting optimistic duplicate for source ${sourceItemId}`);
      
      // Step 1: OPTIMISTIC UPDATE - Add instance to pool immediately
      const pool = getOrCreatePool(assetId, categoryKey, glbUrl);
      
      const instanceData: InstanceData = {
        itemId: tempId, // Use temporary ID initially
        position,
        rotation,
        scale,
        visible: true
      };
      
      addInstance(assetId, instanceData);
      
      log('info', `🏊 Duplication: Added optimistic instance ${tempId} to pool ${assetId}`);
      
      // Step 2: POST TO BACKEND - Call API to create real item
      try {
        const createItemRequest = {
          categoryKey: categoryKey,
          model: model || undefined,
          transform: {
            position,
            rotation_euler: rotation,
            scale
          },
          selectable: true,
          locked: false,
          visible: true,
          meta: {
            duplicatedFrom: sourceItemId,
            isInstance: true,
            assetId
          }
        };
        
        log('info', `📦 Duplication: Calling POST /items for ${tempId}`, createItemRequest);
        
        const response = await scenesApi.addItem(sceneId, createItemRequest, version);
        
        if (response && response.itemId) {
          const realItemId = response.itemId;
          
          log('info', `✅ Duplication: Backend returned real itemId ${realItemId} for temp ${tempId}`);
          
          // Step 3: MAP REAL ID BACK - Update pool with real itemId
          if (pool.instances.has(tempId)) {
            const tempInstance = pool.instances.get(tempId)!;
            const tempIndex = pool.indexOf.get(tempId);
            
            if (tempIndex !== undefined) {
              // Update pool mapping
              pool.instances.delete(tempId);
              pool.indexOf.delete(tempId);
              pool.ids[tempIndex] = realItemId;
              pool.instances.set(realItemId, { ...tempInstance, itemId: realItemId });
              pool.indexOf.set(realItemId, tempIndex);
              
              log('info', `🔄 Duplication: Mapped temp ID ${tempId} -> real ID ${realItemId} at index ${tempIndex}`);
              
              return {
                success: true,
                instanceId: tempId,
                realItemId: realItemId
              };
            }
          }
          
          log('error', `❌ Duplication: Failed to find temp instance ${tempId} in pool after backend success`);
          
          return {
            success: false,
            error: `Temp instance ${tempId} not found in pool`
          };
        } else {
          throw new Error('Backend response missing itemId');
        }
        
      } catch (apiError: any) {
        log('error', '❌ Duplication: Backend API call failed', apiError);
        
        // Rollback optimistic update
        if (pool.instances.has(tempId)) {
          const tempIndex = pool.indexOf.get(tempId);
          if (tempIndex !== undefined) {
            // Use swap-remove to maintain pool integrity
            const lastIndex = pool.ids.length - 1;
            if (tempIndex < lastIndex) {
              const lastItemId = pool.ids[lastIndex];
              pool.ids[tempIndex] = lastItemId;
              pool.indexOf.set(lastItemId, tempIndex);
            }
            
            pool.ids.pop();
            pool.instances.delete(tempId);
            pool.indexOf.delete(tempId);
            
            // Update mesh count for all parts
            pool.parts.forEach(part => {
              part.mesh.count = pool.ids.length;
              part.mesh.instanceMatrix.needsUpdate = true;
            });
            
            log('info', `🔄 Duplication: Rolled back optimistic instance ${tempId}`);
          }
        }
        
        return {
          success: false,
          error: `API Error: ${apiError.message || apiError}`
        };
      }
      
    } catch (error: any) {
      log('error', '❌ Duplication: Unexpected error during duplication', error);
      
      return {
        success: false,
        error: `Unexpected error: ${error.message || error}`
      };
    }
    
  }, [getOrCreatePool, addInstance, updateInstance]);

  const deleteInstance = useCallback(async (
    assetId: string, 
    itemId: string,
    sceneId: string,
    version?: string
  ): Promise<boolean> => {
    const { removeInstance } = useInstancingPoolStore.getState();
    
    try {
      log('info', `🗑️ Deletion: Removing instance ${itemId} from pool ${assetId}`);
      
      // Step 1: Remove from pool (optimistic)
      const removed = removeInstance(assetId, itemId);
      
      if (!removed) {
        log('warn', `⚠️ Deletion: Instance ${itemId} not found in pool ${assetId}`);
        return false;
      }
      
      // Step 2: Delete from backend
      try {
        await scenesApi.removeItem(sceneId, itemId, version);
        log('info', `✅ Deletion: Successfully deleted ${itemId} from backend`);
        return true;
      } catch (apiError: any) {
        log('error', `❌ Deletion: Failed to delete ${itemId} from backend`, apiError);
        
        // Don't rollback - the frontend state is already updated
        // This prevents UI inconsistencies when backend has stale data
        return false;
      }
      
    } catch (error: any) {
      log('error', '❌ Deletion: Unexpected error during deletion', error);
      return false;
    }
    
  }, []);

  return {
    duplicateItem,
    deleteInstance
  };
}

// Hook for keyboard shortcut integration (Ctrl+D to duplicate)
export function useDuplicationShortcut(
  selectedObject: any,
  sceneId: string,
  version?: string
) {
  const { duplicateItem } = useDuplication();
  
  const handleDuplicate = useCallback(async () => {
    if (!selectedObject || !selectedObject.itemId) {
      log('warn', '⚠️ Duplication shortcut: No object selected');
      return;
    }
    
    // Extract position with slight offset
    const currentPos = selectedObject.object?.position || [0, 0, 0];
    const newPosition: [number, number, number] = [
      currentPos[0] + 1, // Offset by 1 unit on X axis
      currentPos[1],
      currentPos[2]
    ];
    
    const rotation = selectedObject.object?.rotation || [0, 0, 0];
    const scale = selectedObject.object?.scale || [1, 1, 1];
    
    // Extract category and model info from userData
    const category = selectedObject.object?.userData?.category || 'unknown';
    const meta = selectedObject.object?.userData?.meta;
    const model = meta?.model;
    
    // Construct GLB URL (this might need adjustment based on your URL structure)
    const glbUrl = meta?.glbUrl || `/${category}.glb`;
    
    const result = await duplicateItem({
      sceneId,
      sourceItemId: selectedObject.itemId,
      position: newPosition,
      rotation: rotation,
      scale: scale,
      categoryKey: category,
      glbUrl,
      model,
      version
    });
    
    if (result.success) {
      log('info', `✅ Duplication shortcut: Successfully duplicated ${selectedObject.itemId} -> ${result.realItemId}`);
    } else {
      log('error', `❌ Duplication shortcut: Failed to duplicate ${selectedObject.itemId}: ${result.error}`);
    }
    
    return result;
  }, [selectedObject, sceneId, version, duplicateItem]);
  
  return { handleDuplicate };
}