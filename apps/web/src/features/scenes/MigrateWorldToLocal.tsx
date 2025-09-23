// src/features/scenes/MigrateWorldToLocal.tsx
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneItem } from '../../services/scenesApi';
import { useSaveQueueStore } from '../../stores/saveQueueStore';

interface Props {
  sceneId: string;
  items: SceneItem[];
}

function toDeg(r: number) { return (r * 180) / Math.PI; }

function nearlyEqual(a: number, b: number, eps = 1e-3) { return Math.abs(a - b) <= eps; }

function isRadiansArray(eulerDegLike?: [number, number, number] | undefined) {
  if (!eulerDegLike) return false;
  const maxAbs = Math.max(Math.abs(eulerDegLike[0] ?? 0), Math.abs(eulerDegLike[1] ?? 0), Math.abs(eulerDegLike[2] ?? 0));
  // Heuristic: values <= 2*pi likely radians; > ~6.4 means degrees
  return maxAbs > 0 && maxAbs <= 6.4;
}

export function MigrateWorldToLocal({ sceneId, items }: Props) {
  const { scene } = useThree();
  const { stage } = useSaveQueueStore();

  useEffect(() => {
    const key = `lumea-migrated-scene-${sceneId}-trs-v1`;
    if (localStorage.getItem(key) === 'done') return;

    // Delay a tick to ensure scene is mounted
    const timer = window.setTimeout(() => {
      try {
        const containers = new Map<string, THREE.Object3D>();

        const getContainerFor = (obj: THREE.Object3D): THREE.Object3D => {
          const itemId = (obj as any).userData?.itemId as string | undefined;
          if (!itemId) return obj;
          let cur: THREE.Object3D = obj;
          while (cur.parent && (cur.parent as any).userData && (cur.parent as any).userData.itemId === itemId) {
            cur = cur.parent as THREE.Object3D;
          }
          return cur;
        };

        scene.traverse((child) => {
          const ud = (child as any).userData;
          if (ud && ud.itemId && ud.selectable) {
            const container = getContainerFor(child);
            containers.set(ud.itemId as string, container);
          }
        });

        let staged = 0;
        for (const item of items) {
          const container = containers.get(item.id);
          if (!container) continue;

          const pos = container.position;
          const rot = container.rotation; // radians
          const scl = container.scale;

          // Values from manifest (may be radians or degrees)
          const mPos = item.transform?.position ?? [0, 0, 0];
          const mRot = item.transform?.rotation_euler ?? [0, 0, 0];
          const mScale = item.transform?.scale ?? [1, 1, 1];

          // Normalize manifest rotation to degrees for comparison
          const mRotDeg = isRadiansArray(mRot)
            ? [toDeg(mRot[0] || 0), toDeg(mRot[1] || 0), toDeg(mRot[2] || 0)] as [number, number, number]
            : mRot;

          const curDeg: [number, number, number] = [toDeg(rot.x), toDeg(rot.y), toDeg(rot.z)];

          const positionDiff = !(nearlyEqual(pos.x, mPos[0]) && nearlyEqual(pos.y, mPos[1]) && nearlyEqual(pos.z, mPos[2]));
          const rotationDiff = !(nearlyEqual(curDeg[0], mRotDeg[0] || 0) && nearlyEqual(curDeg[1], mRotDeg[1] || 0) && nearlyEqual(curDeg[2], mRotDeg[2] || 0));
          const scaleDiff = !(nearlyEqual(scl.x, mScale[0] || 1) && nearlyEqual(scl.y, mScale[1] || 1) && nearlyEqual(scl.z, mScale[2] || 1));

          if (positionDiff || rotationDiff || scaleDiff) {
            stage({
              op: 'update_item',
              id: item.id,
              transform: {
                position: [pos.x, pos.y, pos.z],
                rotation_euler: curDeg,
                scale: [scl.x, scl.y, scl.z],
              },
            });
            staged++;
          }
        }

        if (staged > 0) {
          console.log(`🧭 Migration queued ${staged} item transform updates (world→local/deg normalization)`);
          // Mark as done so we don't run again immediately; save queue will persist
          localStorage.setItem(key, 'done');
        } else {
          // Nothing to migrate
          localStorage.setItem(key, 'done');
        }
      } catch (err) {
        console.warn('Migration check failed:', err);
      }
    }, 800); // run shortly after mount

    return () => clearTimeout(timer);
  }, [scene, items, sceneId, stage]);

  return null;
}