import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSelection } from './SelectionContext';
import * as THREE from 'three';
import { log } from '../../utils/logger';

interface SelectionHighlightProps {
  enabled?: boolean;
  color?: string;
  intensity?: number;
  pulseSpeed?: number;
}

export function SelectionHighlight({ 
  enabled = true, 
  color = '#00aaff',
  intensity = 1.0,
  pulseSpeed = 2.0
}: SelectionHighlightProps) {
  const { scene } = useThree();
  const { selection } = useSelection();
  const outlineRef = useRef<THREE.Group>(new THREE.Group());
  const timeRef = useRef(0);

  // Create outline material
  const outlineMaterial = useRef(new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.3,
  }));

  // Create wireframe material for edges
  const wireframeMaterial = useRef(new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.8,
    linewidth: 2,
  }));

  // Cleanup function
  const clearHighlight = () => {
    outlineRef.current.clear();
    if (outlineRef.current.parent) {
      outlineRef.current.parent.remove(outlineRef.current);
    }
  };

  // Create highlight for selected object
  useEffect(() => {
    if (!enabled || !selection.selectedObject) {
      clearHighlight();
      return;
    }

    const selectedObj = selection.selectedObject.object;
    
    // Clear previous highlight
    clearHighlight();
    
    // Add outline group to scene
    scene.add(outlineRef.current);

    // Create outline geometry
    if (selectedObj.type === 'Mesh' && (selectedObj as THREE.Mesh).geometry) {
      const mesh = selectedObj as THREE.Mesh;
      const geometry = mesh.geometry;

      // Create enlarged outline mesh
      const outlineMesh = new THREE.Mesh(geometry, outlineMaterial.current);
      outlineMesh.scale.multiplyScalar(1.02); // Slightly larger than original
      outlineMesh.position.copy(selectedObj.position);
      outlineMesh.rotation.copy(selectedObj.rotation);
      outlineMesh.quaternion.copy(selectedObj.quaternion);
      
      // Apply the same world matrix as the original object
      outlineMesh.matrix.copy(selectedObj.matrix);
      outlineMesh.matrixAutoUpdate = false;
      
      outlineRef.current.add(outlineMesh);

      // Create wireframe edges
      const edges = new THREE.EdgesGeometry(geometry);
      const wireframe = new THREE.LineSegments(edges, wireframeMaterial.current);
      wireframe.position.copy(selectedObj.position);
      wireframe.rotation.copy(selectedObj.rotation);
      wireframe.quaternion.copy(selectedObj.quaternion);
      wireframe.matrix.copy(selectedObj.matrix);
      wireframe.matrixAutoUpdate = false;
      
      outlineRef.current.add(wireframe);

  log('debug', `✨ Added selection highlight for object: ${selectedObj.name || selectedObj.id}`);
    }

    return clearHighlight;
  }, [enabled, selection.selectedObject, scene]);

  // Animate pulsing effect
  useFrame((_state, delta) => {
    if (!enabled || !selection.selectedObject) return;

    timeRef.current += delta * pulseSpeed;
    const pulse = (Math.sin(timeRef.current) + 1) * 0.5; // 0 to 1
    
    // Update opacity based on pulse
    const baseOpacity = 0.3;
    const pulseOpacity = baseOpacity + (pulse * 0.4);
    
    outlineMaterial.current.opacity = pulseOpacity * intensity;
    wireframeMaterial.current.opacity = (0.8 + pulse * 0.2) * intensity;
  });

  // Update colors when props change
  useEffect(() => {
    const colorObj = new THREE.Color(color);
    outlineMaterial.current.color = colorObj;
    wireframeMaterial.current.color = colorObj;
  }, [color]);

  return null;
}

// Selection box component for non-mesh objects or additional highlighting
export function SelectionBox({ 
  enabled = true,
  color = '#00aaff',
  lineWidth = 2
}: {
  enabled?: boolean;
  color?: string;
  lineWidth?: number;
}) {
  const { scene } = useThree();
  const { selection } = useSelection();
  const boxHelperRef = useRef<THREE.BoxHelper | null>(null);

  useEffect(() => {
    // Remove previous box helper
    if (boxHelperRef.current) {
      scene.remove(boxHelperRef.current);
      boxHelperRef.current.dispose();
      boxHelperRef.current = null;
    }

    if (!enabled || !selection.selectedObject) {
      return;
    }

    const selectedObj = selection.selectedObject.object;
    
    // Create bounding box helper with proper world matrix update
    const boxHelper = new THREE.BoxHelper(selectedObj, new THREE.Color(color));
    boxHelper.material.linewidth = lineWidth;
    boxHelper.material.transparent = true;
    boxHelper.material.opacity = 0.5;
    
    // Ensure the object's world matrix is up to date before creating the box
    selectedObj.updateWorldMatrix(true, false);
    
    // Update the box helper to reflect current transforms
    boxHelper.update();
    
    scene.add(boxHelper);
    boxHelperRef.current = boxHelper;

  log('debug', `📦 Added selection box for object: ${selectedObj.name || selectedObj.id}`);

    return () => {
      if (boxHelperRef.current) {
        scene.remove(boxHelperRef.current);
        boxHelperRef.current.dispose();
        boxHelperRef.current = null;
      }
    };
  }, [enabled, selection.selectedObject, scene, color, lineWidth]);

  return null;
}

// Combined selection highlighting system
export function SelectionHighlightSystem({
  enabled = true,
  highlightColor = '#00aaff',
  boxColor = '#ffaa00',
  showOutline = true,
  showBox = false,
  intensity = 1.0,
  pulseSpeed = 2.0
}: {
  enabled?: boolean;
  highlightColor?: string;
  boxColor?: string;
  showOutline?: boolean;
  showBox?: boolean;
  intensity?: number;
  pulseSpeed?: number;
} = {}) {
  return (
    <>
      {showOutline && (
        <SelectionHighlight 
          enabled={enabled}
          color={highlightColor}
          intensity={intensity}
          pulseSpeed={pulseSpeed}
        />
      )}
      {showBox && (
        <SelectionBox 
          enabled={enabled}
          color={boxColor}
          lineWidth={2}
        />
      )}
    </>
  );
}

export default SelectionHighlightSystem;