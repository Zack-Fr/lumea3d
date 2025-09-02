import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface SceneConstraints {
  maxItems: number;
  maxItemsPerCategory: number;
  maxSceneSize: number; // in cubic meters
  maxFileSize: number; // in bytes
  allowedAssetTypes: string[];
  maxTextureResolution: number; // pixels
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class ValidationService {
  private readonly defaultConstraints: SceneConstraints = {
    maxItems: 1000,
    maxItemsPerCategory: 100,
    maxSceneSize: 10000, // 100x100x1 meter space
    maxFileSize: 500 * 1024 * 1024, // 500MB
    allowedAssetTypes: [
      'model/gltf-binary',
      'model/gltf+json',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/ktx2'
    ],
    maxTextureResolution: 4096,
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Validate 3D transform values
   */
  validateTransform(transform: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (transform.position) {
      const { x, y, z } = transform.position;
      
      // Check for valid numbers
      if (!this.isValidNumber(x) || !this.isValidNumber(y) || !this.isValidNumber(z)) {
        errors.push('Position coordinates must be valid finite numbers');
      }
      
      // Check reasonable bounds (-1000 to 1000 meters)
      if (Math.abs(x) > 1000 || Math.abs(y) > 1000 || Math.abs(z) > 1000) {
        errors.push('Position coordinates must be within ±1000 meters');
      }
      
      // Warning for extreme positions
      if (Math.abs(x) > 500 || Math.abs(y) > 500 || Math.abs(z) > 500) {
        warnings.push('Position is quite far from origin, consider if this is intentional');
      }
    }

    if (transform.rotation) {
      const { x, y, z } = transform.rotation;
      
      if (!this.isValidNumber(x) || !this.isValidNumber(y) || !this.isValidNumber(z)) {
        errors.push('Rotation angles must be valid finite numbers');
      }
      
      // Normalize to ±180 degrees
      if (Math.abs(x) > 180 || Math.abs(y) > 180 || Math.abs(z) > 180) {
        warnings.push('Rotation angles greater than ±180° will be normalized');
      }
    }

    if (transform.scale) {
      const { x, y, z } = transform.scale;
      
      if (!this.isValidNumber(x) || !this.isValidNumber(y) || !this.isValidNumber(z)) {
        errors.push('Scale factors must be valid finite numbers');
      }
      
      if (x <= 0 || y <= 0 || z <= 0) {
        errors.push('Scale factors must be positive');
      }
      
      if (x < 0.01 || y < 0.01 || z < 0.01) {
        errors.push('Scale factors must be at least 0.01 (minimum 1% size)');
      }
      
      if (x > 100 || y > 100 || z > 100) {
        errors.push('Scale factors must not exceed 100 (maximum 10000% size)');
      }
      
      // Warning for extreme scales
      if (x > 10 || y > 10 || z > 10 || x < 0.1 || y < 0.1 || z < 0.1) {
        warnings.push('Extreme scale factors may cause rendering issues');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate scene constraints (item limits, complexity, etc.)
   */
  async validateSceneConstraints(
    sceneId: string,
    constraints: Partial<SceneConstraints> = {},
  ): Promise<ValidationResult> {
    const activeConstraints = { ...this.defaultConstraints, ...constraints };
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get scene with items
      const scene = await this.prisma.scene3D.findUnique({
        where: { id: sceneId },
        include: {
          items: {
            include: {
              scene: {
                include: {
                  project: {
                    include: {
                      categories3D: {
                        include: {
                          asset: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!scene) {
        errors.push('Scene not found');
        return { isValid: false, errors, warnings };
      }

      // Check total item count
      if (scene.items.length > activeConstraints.maxItems) {
        errors.push(`Scene exceeds maximum item limit of ${activeConstraints.maxItems}`);
      }

      // Check items per category
      const categoryCount = new Map<string, number>();
      scene.items.forEach(item => {
        const count = categoryCount.get(item.categoryKey) || 0;
        categoryCount.set(item.categoryKey, count + 1);
      });

      for (const [category, count] of categoryCount.entries()) {
        if (count > activeConstraints.maxItemsPerCategory) {
          errors.push(
            `Category '${category}' exceeds maximum item limit of ${activeConstraints.maxItemsPerCategory}`
          );
        }
      }

      // Calculate scene bounding box and complexity
      const bounds = this.calculateSceneBounds(scene.items);
      const sceneVolume = bounds.width * bounds.height * bounds.depth;
      
      if (sceneVolume > activeConstraints.maxSceneSize) {
        errors.push(`Scene size (${sceneVolume.toFixed(1)}m³) exceeds maximum of ${activeConstraints.maxSceneSize}m³`);
      }

      // Warning for large scenes
      if (sceneVolume > activeConstraints.maxSceneSize * 0.8) {
        warnings.push('Scene is approaching maximum size limit');
      }

      // Check for performance-impacting patterns
      if (scene.items.length > 500) {
        warnings.push('Large number of items may impact performance');
      }

      // Check for overlapping items (potential collision issues)
      const overlaps = this.detectOverlappingItems(scene.items);
      if (overlaps.length > 0) {
        warnings.push(`Found ${overlaps.length} potentially overlapping items`);
      }

    } catch (error) {
      errors.push('Failed to validate scene constraints');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate asset file format and constraints
   */
  validateAssetFile(
    mimeType: string,
    fileSize: number,
    fileName: string,
    constraints: Partial<SceneConstraints> = {},
  ): ValidationResult {
    const activeConstraints = { ...this.defaultConstraints, ...constraints };
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check MIME type
    if (!activeConstraints.allowedAssetTypes.includes(mimeType)) {
      errors.push(`Unsupported file type: ${mimeType}`);
    }

    // Check file size
    if (fileSize > activeConstraints.maxFileSize) {
      errors.push(
        `File size (${this.formatBytes(fileSize)}) exceeds maximum of ${this.formatBytes(activeConstraints.maxFileSize)}`
      );
    }

    // Warning for large files
    if (fileSize > activeConstraints.maxFileSize * 0.8) {
      warnings.push('File size is approaching the maximum limit');
    }

    // Check file extension matches MIME type
    const extension = fileName.toLowerCase().split('.').pop();
    const mimeTypeValidation = this.validateMimeTypeExtension(mimeType, extension);
    if (!mimeTypeValidation.isValid) {
      errors.push(mimeTypeValidation.error!);
    }

    // Specific GLB validation
    if (mimeType === 'model/gltf-binary') {
      if (fileSize < 100) {
        errors.push('GLB file appears to be too small to be valid');
      }
      
      if (fileSize > 100 * 1024 * 1024) { // 100MB
        warnings.push('Large GLB files may take longer to process and load');
      }
    }

    // Texture-specific validation
    if (mimeType.startsWith('image/')) {
      if (fileSize > 10 * 1024 * 1024) { // 10MB
        warnings.push('Large texture files may impact performance');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate material properties
   */
  validateMaterialProperties(properties: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validProperties = [
      'baseColor',
      'metallic',
      'roughness',
      'normalTexture',
      'emissive',
      'alpha',
      'alphaMode',
      'doubleSided',
    ];

    for (const [key, value] of Object.entries(properties)) {
      if (!validProperties.includes(key)) {
        warnings.push(`Unknown material property: ${key}`);
        continue;
      }

      switch (key) {
        case 'baseColor':
          if (!this.isValidColor(value)) {
            errors.push('baseColor must be a valid hex color or RGB/RGBA value');
          }
          break;
        case 'metallic':
        case 'roughness':
        case 'alpha':
          if (typeof value !== 'number' || value < 0 || value > 1) {
            errors.push(`${key} must be a number between 0 and 1`);
          }
          break;
        case 'emissive':
          if (!this.isValidColor(value)) {
            errors.push('emissive must be a valid hex color or RGB value');
          }
          break;
        case 'alphaMode':
          if (!['OPAQUE', 'MASK', 'BLEND'].includes(value)) {
            errors.push('alphaMode must be OPAQUE, MASK, or BLEND');
          }
          break;
        case 'doubleSided':
          if (typeof value !== 'boolean') {
            errors.push('doubleSided must be a boolean value');
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Helper methods

  private isValidNumber(value: any): boolean {
    return typeof value === 'number' && isFinite(value) && !isNaN(value);
  }

  private isValidColor(value: any): boolean {
    if (typeof value !== 'string') return false;
    
    // Hex color validation
    const hexPattern = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    if (hexPattern.test(value)) return true;
    
    // RGB/RGBA validation
    const rgbPattern = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*([01]?(\.\d+)?))?\s*\)$/;
    return rgbPattern.test(value);
  }

  private calculateSceneBounds(items: any[]) {
    let minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;

    items.forEach(item => {
      // Approximate item bounds using position + scale
      const halfX = item.scale_x * 0.5;
      const halfY = item.scale_y * 0.5;
      const halfZ = item.scale_z * 0.5;

      minX = Math.min(minX, item.position_x - halfX);
      maxX = Math.max(maxX, item.position_x + halfX);
      minY = Math.min(minY, item.position_y - halfY);
      maxY = Math.max(maxY, item.position_y + halfY);
      minZ = Math.min(minZ, item.position_z - halfZ);
      maxZ = Math.max(maxZ, item.position_z + halfZ);
    });

    return {
      width: maxX - minX,
      height: maxY - minY,
      depth: maxZ - minZ,
      minX, maxX, minY, maxY, minZ, maxZ,
    };
  }

  private detectOverlappingItems(items: any[]): Array<{ item1: string; item2: string }> {
    const overlaps: Array<{ item1: string; item2: string }> = [];
    
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const item1 = items[i];
        const item2 = items[j];
        
        // Simple overlap detection using bounding spheres
        const distance = Math.sqrt(
          Math.pow(item1.position_x - item2.position_x, 2) +
          Math.pow(item1.position_y - item2.position_y, 2) +
          Math.pow(item1.position_z - item2.position_z, 2)
        );
        
        const radius1 = Math.max(item1.scale_x, item1.scale_y, item1.scale_z) * 0.5;
        const radius2 = Math.max(item2.scale_x, item2.scale_y, item2.scale_z) * 0.5;
        
        if (distance < (radius1 + radius2) * 0.8) { // 80% overlap threshold
          overlaps.push({ item1: item1.id, item2: item2.id });
        }
      }
    }
    
    return overlaps;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private validateMimeTypeExtension(mimeType: string, extension?: string): { isValid: boolean; error?: string } {
    if (!extension) {
      return { isValid: false, error: 'File must have a valid extension' };
    }

    const validCombinations: Record<string, string[]> = {
      'model/gltf-binary': ['glb'],
      'model/gltf+json': ['gltf'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/webp': ['webp'],
      'image/ktx2': ['ktx2'],
      'application/octet-stream': ['glb', 'bin'], // Binary files
    };

    const validExtensions = validCombinations[mimeType];
    if (!validExtensions || !validExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `File extension '.${extension}' does not match MIME type '${mimeType}'`,
      };
    }

    return { isValid: true };
  }
}