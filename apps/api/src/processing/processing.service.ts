import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';
import { Document, NodeIO, WebIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { 
  draco, 
  meshopt, 
  textureCompress, 
  resample, 
  dedup, 
  prune,
  metalRough,
  unlit
} from '@gltf-transform/functions';
import * as sharp from 'sharp';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ProcessingOptions {
  enableDraco?: boolean;
  enableMeshopt?: boolean;
  generateLODs?: boolean;
  textureFormat?: 'ktx2' | 'webp' | 'avif';
  textureQuality?: number;
  maxTextureSize?: number;
}

export interface ProcessingResult {
  success: boolean;
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  variants: ProcessedVariant[];
  error?: string;
}

export interface ProcessedVariant {
  name: string;
  objectKey: string;
  size: number;
  format: string;
  metadata: Record<string, any>;
}

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);
  private readonly io: NodeIO;

  constructor(
    private configService: ConfigService,
    private storageService: StorageService,
  ) {
    this.io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  }

  /**
   * Process an uploaded GLB asset with optimization and variant generation
   */
  async processAsset(
    userId: string,
    category: string,
    assetId: string,
    originalObjectKey: string,
    options: ProcessingOptions = {},
  ): Promise<ProcessingResult> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lumea-processing-'));
    
    try {
      this.logger.log(`Starting processing for asset ${assetId}`);
      
      // Download original asset to temp directory
      const originalPath = path.join(tempDir, 'original.glb');
      await this.downloadAssetToFile(originalObjectKey, originalPath);
      
      const originalStats = await fs.stat(originalPath);
      const originalSize = originalStats.size;
      
      // Load GLB document
      const document = await this.io.read(originalPath);
      
      // Generate processed variants
      const variants: ProcessedVariant[] = [];
      
      // 1. Optimized version with compression
      if (options.enableDraco || options.enableMeshopt) {
        const optimizedVariant = await this.createOptimizedVariant(
          document,
          tempDir,
          userId,
          category,
          assetId,
          options,
        );
        variants.push(optimizedVariant);
      }
      
      // 2. LOD variants if requested
      if (options.generateLODs) {
        const lodVariants = await this.createLODVariants(
          document,
          tempDir,
          userId,
          category,
          assetId,
          options,
        );
        variants.push(...lodVariants);
      }
      
      // 3. Texture variants with different formats
      if (options.textureFormat) {
        const textureVariants = await this.createTextureVariants(
          document,
          tempDir,
          userId,
          category,
          assetId,
          options,
        );
        variants.push(...textureVariants);
      }
      
      const totalProcessedSize = variants.reduce((sum, v) => sum + v.size, 0);
      const compressionRatio = originalSize / (totalProcessedSize || originalSize);
      
      this.logger.log(`Processing completed for asset ${assetId}. Compression ratio: ${compressionRatio.toFixed(2)}`);
      
      return {
        success: true,
        originalSize,
        processedSize: totalProcessedSize,
        compressionRatio,
        variants,
      };
      
    } catch (error) {
      this.logger.error(`Processing failed for asset ${assetId}:`, error);
      
      return {
        success: false,
        originalSize: 0,
        processedSize: 0,
        compressionRatio: 0,
        variants: [],
        error: error.message,
      };
      
    } finally {
      // Clean up temp directory
      await fs.rmdir(tempDir, { recursive: true }).catch(err => 
        this.logger.warn(`Failed to clean up temp directory: ${err.message}`)
      );
    }
  }

  /**
   * Create optimized variant with compression
   */
  private async createOptimizedVariant(
    document: Document,
    tempDir: string,
    userId: string,
    category: string,
    assetId: string,
    options: ProcessingOptions,
  ): Promise<ProcessedVariant> {
    // Create a new document with the same content
    const optimizedPath = path.join(tempDir, 'temp_original.glb');
    await this.io.write(optimizedPath, document);
    const optimizedDoc = await this.io.read(optimizedPath);
    
    // Apply optimizations
    await optimizedDoc.transform(
      dedup(),
      prune(),
    );
    
    // Apply compression based on options
    if (options.enableDraco) {
      await optimizedDoc.transform(
        draco({
          quantizePosition: 14,
          quantizeNormal: 10,
          quantizeColor: 8,
          quantizeTexcoord: 12,
        })
      );
    }
    
    if (options.enableMeshopt) {
      await optimizedDoc.transform(
        meshopt({
          encoder: 'meshoptEncoder',
          level: 'medium',
        })
      );
    }
    
    // Write optimized GLB
    const finalOptimizedPath = path.join(tempDir, 'optimized.glb');
    await this.io.write(finalOptimizedPath, optimizedDoc);
    
    // Upload to storage
    const filename = `optimized.glb`;
    const objectKey = this.storageService.generateProcessedObjectKey(
      userId,
      category,
      assetId,
      'optimized',
      filename,
    );
    
    await this.uploadFileToStorage(finalOptimizedPath, objectKey);
    
    const stats = await fs.stat(finalOptimizedPath);
    
    return {
      name: 'optimized',
      objectKey,
      size: stats.size,
      format: 'glb',
      metadata: {
        compressionType: options.enableDraco ? 'draco' : options.enableMeshopt ? 'meshopt' : 'none',
        meshes: optimizedDoc.getRoot().listMeshes().length,
        materials: optimizedDoc.getRoot().listMaterials().length,
        textures: optimizedDoc.getRoot().listTextures().length,
      },
    };
  }

  /**
   * Create LOD (Level of Detail) variants
   */
  private async createLODVariants(
    document: Document,
    tempDir: string,
    userId: string,
    category: string,
    assetId: string,
    options: ProcessingOptions,
  ): Promise<ProcessedVariant[]> {
    const variants: ProcessedVariant[] = [];
    const lodLevels = [0.75, 0.5, 0.25]; // 75%, 50%, 25% detail
    
    for (let i = 0; i < lodLevels.length; i++) {
      const simplificationRatio = lodLevels[i];
      
      // Create a copy of the document for LOD processing
      const tempPath = path.join(tempDir, `temp_lod_${i}.glb`);
      await this.io.write(tempPath, document);
      const lodDoc = await this.io.read(tempPath);
      
      // Apply simplification (using resample for texture optimization and basic cleanup)
      await lodDoc.transform(
        resample(),
        dedup(),
        prune(),
      );
      
      const lodPath = path.join(tempDir, `lod_${i + 1}.glb`);
      await this.io.write(lodPath, lodDoc);
      
      const filename = `lod_${i + 1}.glb`;
      const objectKey = this.storageService.generateProcessedObjectKey(
        userId,
        category,
        assetId,
        `lod_${i + 1}`,
        filename,
      );
      
      await this.uploadFileToStorage(lodPath, objectKey);
      
      const stats = await fs.stat(lodPath);
      
      variants.push({
        name: `lod_${i + 1}`,
        objectKey,
        size: stats.size,
        format: 'glb',
        metadata: {
          lodLevel: i + 1,
          simplificationRatio,
          meshes: lodDoc.getRoot().listMeshes().length,
        },
      });
    }
    
    return variants;
  }

  /**
   * Create texture variants with different formats
   */
  private async createTextureVariants(
    document: Document,
    tempDir: string,
    userId: string,
    category: string,
    assetId: string,
    options: ProcessingOptions,
  ): Promise<ProcessedVariant[]> {
    const variants: ProcessedVariant[] = [];
    
    // Process textures for KTX2 format
    if (options.textureFormat === 'ktx2') {
      // Create a copy of the document for texture processing
      const tempPath = path.join(tempDir, 'temp_ktx2.glb');
      await this.io.write(tempPath, document);
      const ktx2Doc = await this.io.read(tempPath);
      
      // Convert textures to KTX2 using toktx
      const textures = ktx2Doc.getRoot().listTextures();
      
      for (let i = 0; i < textures.length; i++) {
        const texture = textures[i];
        const image = texture.getImage();
        
        if (image) {
          const texturePath = path.join(tempDir, `texture_${i}.png`);
          const ktx2Path = path.join(tempDir, `texture_${i}.ktx2`);
          
          // Write original texture
          await fs.writeFile(texturePath, image);
          
          // Convert to KTX2 using toktx
          await this.convertToKTX2(texturePath, ktx2Path, options);
          
          // Read converted texture and update document
          const ktx2Data = await fs.readFile(ktx2Path);
          texture.setImage(ktx2Data);
          texture.setMimeType('image/ktx2');
        }
      }
      
      const ktx2Path = path.join(tempDir, 'ktx2_textures.glb');
      await this.io.write(ktx2Path, ktx2Doc);
      
      const filename = 'ktx2_textures.glb';
      const objectKey = this.storageService.generateProcessedObjectKey(
        userId,
        category,
        assetId,
        'ktx2',
        filename,
      );
      
      await this.uploadFileToStorage(ktx2Path, objectKey);
      
      const stats = await fs.stat(ktx2Path);
      
      variants.push({
        name: 'ktx2_textures',
        objectKey,
        size: stats.size,
        format: 'glb',
        metadata: {
          textureFormat: 'ktx2',
          textureCount: textures.length,
        },
      });
    }
    
    return variants;
  }

  /**
   * Convert texture to KTX2 format using toktx
   */
  private async convertToKTX2(
    inputPath: string,
    outputPath: string,
    options: ProcessingOptions,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '--genmipmap',
        '--encode', 'uastc',
        '--zcmp', '19',
        outputPath,
        inputPath,
      ];
      
      const toktx = spawn('toktx', args);
      
      toktx.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`toktx failed with code ${code}`));
        }
      });
      
      toktx.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Download asset from storage to local file
   */
  private async downloadAssetToFile(objectKey: string, filePath: string): Promise<void> {
    // This would be implemented using the storage service to download the file
    // For now, this is a placeholder
    this.logger.log(`Downloading ${objectKey} to ${filePath}`);
    // TODO: Implement actual download logic using StorageService
  }

  /**
   * Upload file to storage
   */
  private async uploadFileToStorage(filePath: string, objectKey: string): Promise<void> {
    // This would be implemented using the storage service to upload the file
    // For now, this is a placeholder
    this.logger.log(`Uploading ${filePath} to ${objectKey}`);
    // TODO: Implement actual upload logic using StorageService
  }
}