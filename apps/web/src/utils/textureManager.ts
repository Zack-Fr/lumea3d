import * as THREE from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { loadTexture } from './textureSystem';

/**
 * Comprehensive Texture Management System for Lumea
 * Handles texture loading, caching, validation, and format detection
 * Supports both KTX2 and standard formats from CDN/S3 URLs
 */

export interface TextureMetadata {
  id: string;
  name: string;
  url: string;
  format: 'ktx2' | 'png' | 'jpg' | 'webp' | 'avif' | 'unknown';
  type: TextureMapType;
  size?: { width: number; height: number };
  fileSize?: number;
  colorSpace?: 'srgb' | 'linear';
  tags?: string[];
  category?: string;
  previewUrl?: string;
}

export type TextureMapType = 
  | 'baseColor' 
  | 'normal' 
  | 'metallicRoughness' 
  | 'metallic'
  | 'roughness'
  | 'emissive' 
  | 'occlusion'
  | 'opacity'
  | 'height'
  | 'displacement';

export interface TextureCollection {
  id: string;
  name: string;
  description?: string;
  textures: TextureMetadata[];
  tags?: string[];
}

export interface TextureLoadResult {
  texture: THREE.Texture;
  metadata: TextureMetadata;
  loadTime: number;
  wasCached: boolean;
}

export interface TextureValidationResult {
  isValid: boolean;
  format: string;
  errors: string[];
  warnings: string[];
  dimensions?: { width: number; height: number };
  fileSize?: number;
}

class TextureManager {
  private cache = new Map<string, THREE.Texture>();
  private metadataCache = new Map<string, TextureMetadata>();
  private loadingPromises = new Map<string, Promise<TextureLoadResult>>();
  private ktx2Loader: KTX2Loader | null = null;
  
  // Texture validation rules
  private readonly SUPPORTED_FORMATS = ['ktx2', 'png', 'jpg', 'jpeg', 'webp', 'avif'];

  /**
   * Initialize the texture manager with KTX2 loader
   */
  initialize(ktx2Loader: KTX2Loader) {
    this.ktx2Loader = ktx2Loader;
    console.log('🎨 TextureManager initialized with KTX2 support');
  }

  /**
   * Load a texture with caching and metadata tracking
   */
  async loadTextureWithMetadata(
    url: string, 
    metadata?: Partial<TextureMetadata>
  ): Promise<TextureLoadResult> {
    const startTime = performance.now();
    const textureId = this.generateTextureId(url);
    
    // Check if already loading
    if (this.loadingPromises.has(textureId)) {
      return this.loadingPromises.get(textureId)!;
    }
    
    // Check cache first
    const cachedTexture = this.cache.get(textureId);
    if (cachedTexture) {
      const cachedMetadata = this.metadataCache.get(textureId)!;
      return {
        texture: cachedTexture.clone(),
        metadata: cachedMetadata,
        loadTime: performance.now() - startTime,
        wasCached: true
      };
    }

    // Create loading promise
    const loadingPromise = this.performTextureLoad(url, metadata, textureId, startTime);
    this.loadingPromises.set(textureId, loadingPromise);
    
    try {
      const result = await loadingPromise;
      return result;
    } finally {
      this.loadingPromises.delete(textureId);
    }
  }

  /**
   * Perform the actual texture loading
   */
  private async performTextureLoad(
    url: string,
    metadata: Partial<TextureMetadata> | undefined,
    textureId: string,
    startTime: number
  ): Promise<TextureLoadResult> {
    try {
      console.log('🖼️ Loading texture:', url);

      // Validate URL and detect format
      const validation = await this.validateTextureUrl(url);
      if (!validation.isValid) {
        throw new Error(`Texture validation failed: ${validation.errors.join(', ')}`);
      }

      // Load texture using existing system
      const texture = await loadTexture(url, this.ktx2Loader || undefined);
      
      // Create metadata
      const fullMetadata: TextureMetadata = {
        id: textureId,
        name: metadata?.name || this.extractNameFromUrl(url),
        url,
        format: this.detectFormatFromUrl(url),
        type: metadata?.type || 'baseColor',
        size: validation.dimensions,
        fileSize: validation.fileSize,
        colorSpace: this.determineColorSpace(metadata?.type || 'baseColor'),
        tags: metadata?.tags || [],
        category: metadata?.category,
        previewUrl: metadata?.previewUrl
      };

      // Cache the texture and metadata
      this.cache.set(textureId, texture);
      this.metadataCache.set(textureId, fullMetadata);

      const loadTime = performance.now() - startTime;
      console.log(`✅ Texture loaded successfully: ${url} (${loadTime.toFixed(2)}ms)`);

      return {
        texture: texture.clone(),
        metadata: fullMetadata,
        loadTime,
        wasCached: false
      };

    } catch (error) {
      console.error('❌ Failed to load texture:', url, error);
      throw error;
    }
  }

  /**
   * Validate texture URL and detect properties
   */
  async validateTextureUrl(url: string): Promise<TextureValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic URL validation
    try {
      new URL(url);
    } catch {
      errors.push('Invalid URL format');
    }
    
    // Format validation
    const format = this.detectFormatFromUrl(url);
    if (!this.SUPPORTED_FORMATS.includes(format)) {
      errors.push(`Unsupported format: ${format}`);
    }
    
    // For now, we'll skip network validation to avoid CORS issues
    // In a production environment, you might want to add:
    // - HEAD request to check file exists and get dimensions
    // - File size checking
    // - Image format verification
    
    return {
      isValid: errors.length === 0,
      format,
      errors,
      warnings,
      // dimensions and fileSize would be populated via network check
    };
  }

  /**
   * Detect texture format from URL
   */
  private detectFormatFromUrl(url: string): TextureMetadata['format'] {
    const extension = url.toLowerCase().split('.').pop() || '';
    
    switch (extension) {
      case 'ktx2': return 'ktx2';
      case 'png': return 'png';
      case 'jpg':
      case 'jpeg': return 'jpg';
      case 'webp': return 'webp';
      case 'avif': return 'avif';
      default: return 'unknown';
    }
  }

  /**
   * Determine appropriate color space for texture type
   */
  private determineColorSpace(type: TextureMapType): 'srgb' | 'linear' {
    // sRGB textures (for display)
    if (type === 'baseColor' || type === 'emissive') {
      return 'srgb';
    }
    
    // Linear textures (for data)
    return 'linear';
  }

  /**
   * Extract readable name from URL
   */
  private extractNameFromUrl(url: string): string {
    const filename = url.split('/').pop() || 'unknown';
    return filename.replace(/\.[^/.]+$/, ''); // Remove extension
  }

  /**
   * Generate unique texture ID from URL
   */
  private generateTextureId(url: string): string {
    // Simple hash function for URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `texture_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Swap texture on a material
   */
  async swapMaterialTexture(
    material: THREE.Material,
    textureType: TextureMapType,
    newTextureUrl: string,
    metadata?: Partial<TextureMetadata>
  ): Promise<void> {
    if (!(material instanceof THREE.MeshStandardMaterial) && 
        !(material instanceof THREE.MeshPhysicalMaterial)) {
      throw new Error('Material must be MeshStandardMaterial or MeshPhysicalMaterial');
    }

    const stdMaterial = material as THREE.MeshStandardMaterial;
    
    try {
      const result = await this.loadTextureWithMetadata(newTextureUrl, {
        ...metadata,
        type: textureType
      });

      const texture = result.texture;
      
      // Configure texture properties based on type
      this.configureTextureProperties(texture, textureType);
      
      // Apply texture to appropriate material property
      this.applyTextureToMaterial(stdMaterial, textureType, texture);
      
      // Mark material for update
      material.needsUpdate = true;
      
      console.log(`🔄 Texture swapped on material: ${textureType} -> ${newTextureUrl}`);
      
    } catch (error) {
      console.error(`❌ Failed to swap texture: ${textureType} -> ${newTextureUrl}`, error);
      throw error;
    }
  }

  /**
   * Configure texture properties based on its type
   */
  private configureTextureProperties(texture: THREE.Texture, type: TextureMapType): void {
    // Common settings
    texture.flipY = false; // GLTF textures don't need Y-flip
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    // Type-specific settings
    switch (type) {
      case 'baseColor':
      case 'emissive':
        texture.colorSpace = THREE.SRGBColorSpace;
        break;
      case 'normal':
      case 'metallicRoughness':
      case 'metallic':
      case 'roughness':
      case 'occlusion':
      case 'opacity':
      case 'height':
      case 'displacement':
        texture.colorSpace = THREE.LinearSRGBColorSpace;
        break;
    }
  }

  /**
   * Apply texture to the correct material property
   */
  private applyTextureToMaterial(
    material: THREE.MeshStandardMaterial,
    type: TextureMapType,
    texture: THREE.Texture
  ): void {
    // Dispose old texture if it exists
    const oldTexture = this.getCurrentTexture(material, type);
    if (oldTexture) {
      oldTexture.dispose();
    }

    switch (type) {
      case 'baseColor':
        material.map = texture;
        break;
      case 'normal':
        material.normalMap = texture;
        break;
      case 'metallicRoughness':
        material.metalnessMap = texture;
        material.roughnessMap = texture;
        break;
      case 'metallic':
        material.metalnessMap = texture;
        break;
      case 'roughness':
        material.roughnessMap = texture;
        break;
      case 'emissive':
        material.emissiveMap = texture;
        break;
      case 'occlusion':
        material.aoMap = texture;
        break;
      case 'opacity':
        material.alphaMap = texture;
        material.transparent = true;
        break;
      case 'height':
      case 'displacement':
        if (material instanceof THREE.MeshPhysicalMaterial) {
          // Height maps would need additional setup for displacement
          console.warn('Height/displacement maps require additional shader setup');
        }
        break;
    }
  }

  /**
   * Get current texture from material property
   */
  private getCurrentTexture(material: THREE.MeshStandardMaterial, type: TextureMapType): THREE.Texture | null {
    switch (type) {
      case 'baseColor': return material.map;
      case 'normal': return material.normalMap;
      case 'metallicRoughness': return material.metalnessMap || material.roughnessMap;
      case 'metallic': return material.metalnessMap;
      case 'roughness': return material.roughnessMap;
      case 'emissive': return material.emissiveMap;
      case 'occlusion': return material.aoMap;
      case 'opacity': return material.alphaMap;
      default: return null;
    }
  }

  /**
   * Get cached texture metadata
   */
  getTextureMetadata(url: string): TextureMetadata | null {
    const textureId = this.generateTextureId(url);
    return this.metadataCache.get(textureId) || null;
  }

  /**
   * Clear texture cache
   */
  clearCache(): void {
    // Dispose all cached textures
    for (const texture of this.cache.values()) {
      texture.dispose();
    }
    
    this.cache.clear();
    this.metadataCache.clear();
    this.loadingPromises.clear();
    
    console.log('🗑️ Texture cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedTextures: this.cache.size,
      loadingTextures: this.loadingPromises.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage of cached textures
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const [id, texture] of this.cache) {
      const metadata = this.metadataCache.get(id);
      if (metadata?.size && texture.image) {
        // Rough estimation: width * height * 4 bytes per pixel
        totalSize += metadata.size.width * metadata.size.height * 4;
      }
    }
    return totalSize;
  }

  /**
   * Generate texture preview URL (for thumbnails)
   */
  generatePreviewUrl(originalUrl: string): string {
    // In a real implementation, this might generate thumbnail URLs
    // For now, we'll just return the original URL
    return originalUrl;
  }
}

// Export singleton instance
export const textureManager = new TextureManager();

// Export types and interfaces
export { TextureManager };

// Default export
export default textureManager;