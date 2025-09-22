import { useMemo, useEffect, useCallback } from 'react';
import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useInstancingPool } from '../instancing/useInstancingPool';

interface TransformBridgeProps {
  selection: {
    assetId: string;
    index: number;
    itemId: string;
  } | null;
  transformMode: 'translate' | 'rotate' | 'scale';
  onTransformStart?: () => void;
  onTransformEnd?: (transform?: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }) => void;
  enabled?: boolean;
}

export function TransformBridge({ 
  selection, 
  transformMode, 
  onTransformStart, 
  onTransformEnd,
  enabled = true 
}: TransformBridgeProps) {
  const { camera } = useThree();
  const { getPool } = useInstancingPool();
  
  // Create proxy object once
  const proxy = useMemo(() => {
    const proxyObject = new THREE.Object3D();
    proxyObject.name = 'transform-proxy';
    return proxyObject;
  }, []);
  
  // Load proxy from instance when selection changes
  const loadProxyFromInstance = useCallback((assetId: string, index: number) => {
    const pool = getPool(assetId);
    if (!pool || pool.parts.length === 0) return;
    
    const local = new THREE.Matrix4();
    const world = new THREE.Matrix4();
    
    // Get matrix from first part (all parts should have same matrix)
    pool.parts[0].mesh.getMatrixAt(index, local);
    world.multiplyMatrices(pool.root.matrixWorld, local);
    
    // Decompose world matrix to proxy transform
    world.decompose(proxy.position, proxy.quaternion, proxy.scale);
    proxy.updateMatrix();
    
    console.log(`🔧 Loaded proxy from instance ${index} in ${assetId}:`, {
      position: proxy.position.toArray(),
      rotation: proxy.rotation.toArray(),
      scale: proxy.scale.toArray()
    });
  }, [proxy, getPool]);
  
  // Write proxy transform back to instance
  const writeBackToInstance = useCallback((assetId: string, index: number) => {
    const pool = getPool(assetId);
    if (!pool) return;
    
    // Update proxy matrix
    proxy.updateMatrix();
    
    // Convert from world space to local space
    const invRoot = new THREE.Matrix4().copy(pool.root.matrixWorld).invert();
    const local = new THREE.Matrix4().multiplyMatrices(invRoot, proxy.matrix);
    
    // CRITICAL: Set matrix for ALL parts at this index and mark for update
    pool.parts.forEach(part => {
      part.mesh.setMatrixAt(index, local);
      part.mesh.instanceMatrix.needsUpdate = true;
    });
    
    console.log(`🔧 Wrote back proxy to ${pool.parts.length} parts at instance ${index} in ${assetId}:`, {
      position: proxy.position.toArray(),
      rotation: proxy.rotation.toArray(),
      scale: proxy.scale.toArray(),
      partsUpdated: pool.parts.length
    });
  }, [proxy, getPool]);
  
  // Load proxy when selection changes
  useEffect(() => {
    if (selection) {
      loadProxyFromInstance(selection.assetId, selection.index);
    }
  }, [selection, loadProxyFromInstance]);
  
  // Event handlers
  const handleDragStart = useCallback(() => {
    console.log('🔧 Transform drag started');
    onTransformStart?.();
  }, [onTransformStart]);
  
  const handleDragEnd = useCallback(() => {
    console.log('🔧 Transform drag ended');
    if (selection) {
      writeBackToInstance(selection.assetId, selection.index);
      
      // Extract current transform data to pass to callback
      const transformData = {
        position: [proxy.position.x, proxy.position.y, proxy.position.z] as [number, number, number],
        rotation: [proxy.rotation.x, proxy.rotation.y, proxy.rotation.z] as [number, number, number],
        scale: [proxy.scale.x, proxy.scale.y, proxy.scale.z] as [number, number, number]
      };
      
      onTransformEnd?.(transformData);
    } else {
      onTransformEnd?.();
    }
  }, [selection, writeBackToInstance, onTransformEnd, proxy]);
  
  const handleObjectChange = useCallback(() => {
    // Real-time updates during dragging
    if (selection) {
      writeBackToInstance(selection.assetId, selection.index);
    }
  }, [selection, writeBackToInstance]);
  
  if (!enabled || !selection) {
    return null;
  }
  
  return (
    <TransformControls
      object={proxy}
      camera={camera}
      mode={transformMode}
      size={0.8}
      showX={true}
      showY={true}
      showZ={true}
      space="world"
      onObjectChange={handleObjectChange}
      // @ts-ignore - drei types might not have these events
      onMouseDown={handleDragStart}
      onMouseUp={handleDragEnd}
    />
  );
}