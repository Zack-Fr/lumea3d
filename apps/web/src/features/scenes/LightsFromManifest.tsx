import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { SceneItem } from '../../services/scenesApi';
import { addLightToScene } from '../../components/projectEditor/LightsContainer';

interface LightsFromManifestProps {
  items: SceneItem[];
}

function buildLightFromItem(item: SceneItem): THREE.Light | null {
  const meta = (item as any)?.meta || {};
  const lightType: string = meta.lightType || meta.type || 'point';
  const colorHex = meta?.lightProperties?.color || '#ffffff';
  const intensity = meta?.lightProperties?.intensity ?? 2.0;
  const distance = meta?.lightProperties?.distance ?? 50;
  const decay = meta?.lightProperties?.decay ?? 1;
  const angle = meta?.lightProperties?.angle ?? Math.PI / 3;

  const position = item.transform?.position || [0, 5, 0];

  let light: THREE.Light;
  switch (lightType) {
    case 'directional':
      light = new THREE.DirectionalLight(colorHex, intensity);
      light.position.set(position[0], position[1], position[2]);
      (light as THREE.DirectionalLight).castShadow = true;
      break;
    case 'spot':
      light = new THREE.SpotLight(colorHex, intensity, distance, angle, 0.1, decay);
      light.position.set(position[0], position[1], position[2]);
      (light as THREE.SpotLight).castShadow = true;
      break;
    case 'point':
    default:
      light = new THREE.PointLight(colorHex, intensity, distance, decay);
      light.position.set(position[0], position[1], position[2]);
      light.castShadow = true;
      break;
  }

  // User-friendly name; keep id in userData
  const friendlyName = lightType === 'directional' ? 'Directional Light' : lightType === 'spot' ? 'Spot Light' : 'Point Light';
  light.name = friendlyName;
  light.userData = {
    itemId: item.id,
    category: typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey || 'lighting',
    selectable: item.selectable ?? true,
    locked: item.locked ?? false,
    meta: {
      ...(item as any).meta,
      isLight: true,
      lightType,
    },
  };

  return light;
}

export function LightsFromManifest({ items }: LightsFromManifestProps) {
  const createdRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const lights = (items || []).filter(it => (it as any)?.meta?.isLight === true);
    if (!lights.length) return;

    const seen = new Set<string>();
    for (const item of lights) {
      const id = item.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);

      // Avoid duplicate creation across renders
      if (createdRef.current.has(id)) continue;

      const light = buildLightFromItem(item);
      if (light) {
        addLightToScene(light);
        createdRef.current.add(id);
      }
    }
  }, [items]);

  // This component renders nothing; it just ensures lights are in the scene
  return null;
}
