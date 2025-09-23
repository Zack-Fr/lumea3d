// src/utils/transformCompat.ts
import * as THREE from 'three';
import type { ItemTransform, LegacyItemTransform } from '../types/transform';

// Apply a transform (legacy or new) to an Object3D in LOCAL space
export function applyCompatTransform(obj: THREE.Object3D, t: LegacyItemTransform | ItemTransform | undefined) {
  if (!t) return;

  // Position
  if ('position' in t && Array.isArray(t.position)) {
    const [x, y, z] = t.position as [number, number, number];
    obj.position.set(x ?? 0, y ?? 0, z ?? 0);
  }

  // Rotation precedence: quaternion -> rotation_euler (deg)
  if ('quaternion' in t && Array.isArray((t as any).quaternion)) {
    const [qx, qy, qz, qw] = (t as any).quaternion as [number, number, number, number];
    if ([qx, qy, qz, qw].every((n) => Number.isFinite(n))) {
      obj.quaternion.set(qx, qy, qz, qw);
    }
  } else if ('rotation_euler' in t && Array.isArray((t as any).rotation_euler)) {
    const [rx, ry, rz] = (t as any).rotation_euler as [number, number, number];
    // degrees -> radians
    obj.rotation.set(
      THREE.MathUtils.degToRad(rx ?? 0),
      THREE.MathUtils.degToRad(ry ?? 0),
      THREE.MathUtils.degToRad(rz ?? 0)
    );
  }

  // Scale
  if ('scale' in t && Array.isArray(t.scale)) {
    const [sx, sy, sz] = t.scale as [number, number, number];
    obj.scale.set(sx ?? 1, sy ?? 1, sz ?? 1);
  }

  obj.updateMatrix();
}

// Serialize an Object3D to the new ItemTransform contract (LOCAL TRS)
export function serializeLocalTRS(obj: THREE.Object3D): ItemTransform {
  return {
    position: obj.position.toArray() as [number, number, number],
    quaternion: obj.quaternion.toArray() as [number, number, number, number],
    scale: obj.scale.toArray() as [number, number, number],
  };
}