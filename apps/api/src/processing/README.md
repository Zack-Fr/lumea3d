# 3D Asset Processing Pipeline

This module provides comprehensive 3D asset optimization and processing capabilities for the Lumea platform.

## Overview

The processing pipeline takes uploaded GLB files and generates optimized variants suitable for different use cases:

- **Optimized variants**: Compressed using Draco or Meshopt
- **LOD variants**: Level-of-detail versions for performance scaling
- **Texture variants**: KTX2 format for GPU-optimized loading

## Dependencies

### Node.js Packages
- `@gltf-transform/core`: Core glTF processing library
- `@gltf-transform/extensions`: Support for glTF extensions
- `@gltf-transform/functions`: Optimization functions (Draco, Meshopt, etc.)
- `@gltf-transform/cli`: Command-line interface utilities
- `sharp`: High-performance image processing

### Native Tools
- `toktx`: KTX2 texture conversion tool from KTX-Software
- System dependencies: cmake, build-essential, GL libraries

## Processing Options

```typescript
interface ProcessingOptions {
  enableDraco?: boolean;        // Enable Draco mesh compression
  enableMeshopt?: boolean;      // Enable Meshopt compression
  generateLODs?: boolean;       // Generate Level-of-Detail variants
  textureFormat?: 'ktx2' | 'webp' | 'avif';  // Target texture format
  textureQuality?: number;      // Texture compression quality (0-100)
  maxTextureSize?: number;      // Maximum texture resolution
}
```

## Generated Variants

### Optimized Variant
- Mesh compression (Draco/Meshopt)
- Duplicate removal and pruning
- Object key: `assets/{userId}/{category}/{assetId}/processed/optimized/optimized.glb`

### LOD Variants
- 75%, 50%, 25% detail levels
- Progressive mesh simplification
- Object keys: `assets/{userId}/{category}/{assetId}/processed/lod_1/lod_1.glb`

### Texture Variants
- KTX2 compressed textures
- GPU-optimized format
- Object key: `assets/{userId}/{category}/{assetId}/processed/ktx2/ktx2_textures.glb`

## Usage

```typescript
const result = await processingService.processAsset(
  userId,
  category,
  assetId,
  originalObjectKey,
  {
    enableDraco: true,
    generateLODs: true,
    textureFormat: 'ktx2',
    textureQuality: 85,
    maxTextureSize: 2048,
  }
);

console.log(`Compression ratio: ${result.compressionRatio}`);
console.log(`Generated ${result.variants.length} variants`);
```

## Docker Integration

The processing tools are automatically installed in the API Docker container:

- KTX-Software v4.3.2 with `toktx` binary
- System dependencies for mesh processing
- Node.js packages for glTF manipulation

## Performance Considerations

- Processing is CPU-intensive and runs in background
- Temporary files are created and cleaned up automatically
- Original assets are preserved alongside processed variants
- Storage usage scales with number of variants generated

## Future Enhancements

- GPU-accelerated processing for faster compression
- Additional texture formats (AVIF, WebP)
- Advanced mesh simplification algorithms
- Batch processing for multiple assets
- Processing progress tracking and notifications