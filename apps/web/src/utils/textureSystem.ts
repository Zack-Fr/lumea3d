import * as THREE from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

/**
 * KTX2 Texture System for Lumea
 * Handles optimized texture loading with KTX2 format and fallback to PNG/JPG
 */

// Global KTX2 loader instance
let ktx2Loader: KTX2Loader | null = null;

/**
 * Initialize KTX2 loader with proper transcoder configuration
 */
export function initKTX2Loader(renderer: THREE.WebGLRenderer): KTX2Loader {
  if (ktx2Loader) {
    return ktx2Loader;
  }

  ktx2Loader = new KTX2Loader();
  
  // Set transcoder path - using CDN for reliability
  // In production, you might want to host these files locally
  ktx2Loader.setTranscoderPath('https://unpkg.com/three@0.155.0/examples/jsm/libs/basis/');
  ktx2Loader.detectSupport(renderer);

  console.log('🎨 KTX2Loader initialized with transcoder support');
  return ktx2Loader;
}

/**
 * Load texture with KTX2 support and PNG fallback
 */
export async function loadTexture(
  textureUrl: string,
  loader?: KTX2Loader
): Promise<THREE.Texture> {
  const isKTX2 = textureUrl.toLowerCase().includes('.ktx2');
  
  if (isKTX2 && loader) {
    try {
      console.log('📦 Loading KTX2 texture:', textureUrl);
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
          textureUrl,
          resolve,
          undefined,
          reject
        );
      });
      
      console.log('✅ KTX2 texture loaded successfully:', textureUrl);
      return texture;
    } catch (error) {
      console.warn('⚠️ KTX2 loading failed, falling back to PNG:', error);
      // Fall through to standard loader
    }
  }

  // Fallback to standard texture loader for PNG/JPG or if KTX2 fails
  console.log('📦 Loading standard texture:', textureUrl);
  const standardLoader = new THREE.TextureLoader();
  const texture = await new Promise<THREE.Texture>((resolve, reject) => {
    standardLoader.load(
      textureUrl,
      resolve,
      undefined,
      reject
    );
  });
  
  console.log('✅ Standard texture loaded successfully:', textureUrl);
  return texture;
}

/**
 * PBR Material parameters interface matching the backend format
 */
export interface PBRMaterialOverride {
  pbr?: {
    metallicFactor?: number;
    roughnessFactor?: number;
    emissiveFactor?: [number, number, number];
    baseColorFactor?: [number, number, number, number];
  };
  maps?: {
    baseColor?: string;
    normal?: string;
    metallicRoughness?: string;
    emissive?: string;
    occlusion?: string;
  };
  // Legacy format support
  metallic?: number;
  roughness?: number;
  emissive?: number;
  baseColor?: string;
}

/**
 * Apply material overrides to a Three.js material
 */
export async function applyMaterialOverride(
  material: THREE.Material,
  override: PBRMaterialOverride,
  ktx2Loader?: KTX2Loader
): Promise<void> {
  if (!(material instanceof THREE.MeshStandardMaterial) && 
      !(material instanceof THREE.MeshPhysicalMaterial)) {
    console.warn('⚠️ Material override only supports MeshStandardMaterial/MeshPhysicalMaterial');
    return;
  }

  const stdMaterial = material as THREE.MeshStandardMaterial;

  console.log('🎨 Applying material override:', {
    materialName: material.name,
    override,
    materialType: material.type
  });

  // Apply PBR parameters
  const pbr = override.pbr || {};
  
  if (pbr.metallicFactor !== undefined) {
    stdMaterial.metalness = pbr.metallicFactor;
  }
  
  if (pbr.roughnessFactor !== undefined) {
    stdMaterial.roughness = pbr.roughnessFactor;
  }
  
  if (pbr.baseColorFactor) {
    stdMaterial.color.setRGB(
      pbr.baseColorFactor[0],
      pbr.baseColorFactor[1],
      pbr.baseColorFactor[2]
    );
  }
  
  if (pbr.emissiveFactor) {
    stdMaterial.emissive.setRGB(
      pbr.emissiveFactor[0],
      pbr.emissiveFactor[1],
      pbr.emissiveFactor[2]
    );
  }

  // Legacy format support
  if (override.metallic !== undefined) {
    stdMaterial.metalness = override.metallic;
  }
  
  if (override.roughness !== undefined) {
    stdMaterial.roughness = override.roughness;
  }
  
  if (override.emissive !== undefined) {
    stdMaterial.emissive.setScalar(override.emissive);
  }
  
  if (override.baseColor) {
    stdMaterial.color.set(override.baseColor);
  }

  // Apply texture maps
  const maps = override.maps || {};
  
  if (maps.baseColor) {
    try {
      const texture = await loadTexture(maps.baseColor, ktx2Loader);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false; // GLTF textures don't need Y-flip
      stdMaterial.map = texture;
    } catch (error) {
      console.error('Failed to load baseColor texture:', error);
    }
  }
  
  if (maps.normal) {
    try {
      const texture = await loadTexture(maps.normal, ktx2Loader);
      texture.flipY = false;
      stdMaterial.normalMap = texture;
    } catch (error) {
      console.error('Failed to load normal texture:', error);
    }
  }
  
  if (maps.metallicRoughness) {
    try {
      const texture = await loadTexture(maps.metallicRoughness, ktx2Loader);
      texture.flipY = false;
      stdMaterial.metalnessMap = texture;
      stdMaterial.roughnessMap = texture;
    } catch (error) {
      console.error('Failed to load metallicRoughness texture:', error);
    }
  }
  
  if (maps.emissive) {
    try {
      const texture = await loadTexture(maps.emissive, ktx2Loader);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      stdMaterial.emissiveMap = texture;
    } catch (error) {
      console.error('Failed to load emissive texture:', error);
    }
  }
  
  if (maps.occlusion) {
    try {
      const texture = await loadTexture(maps.occlusion, ktx2Loader);
      texture.flipY = false;
      stdMaterial.aoMap = texture;
    } catch (error) {
      console.error('Failed to load occlusion texture:', error);
    }
  }

  // Mark material for update
  material.needsUpdate = true;
  
  console.log('✅ Material override applied successfully to:', material.name);
}

/**
 * Apply material overrides to all materials in an Object3D hierarchy
 */
export async function applyMaterialOverridesToObject(
  object: THREE.Object3D,
  materialOverrides: Record<string, PBRMaterialOverride>,
  ktx2Loader?: KTX2Loader
): Promise<void> {
  console.log('🎨 Applying material overrides to object:', {
    objectName: object.name,
    overrideCount: Object.keys(materialOverrides).length
  });

  const promises: Promise<void>[] = [];

  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      
      materials.forEach((material) => {
        const materialName = material.name;
        if (materialName && materialOverrides[materialName]) {
          console.log('🎯 Found material override for:', materialName);
          promises.push(applyMaterialOverride(material, materialOverrides[materialName], ktx2Loader));
        }
      });
    }
  });

  await Promise.all(promises);
  
  console.log('✅ All material overrides applied to object:', object.name);
}

export default {
  initKTX2Loader,
  loadTexture,
  applyMaterialOverride,
  applyMaterialOverridesToObject
};