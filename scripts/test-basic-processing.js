const { ProcessingService } = require('../dist/apps/api/src/processing/processing.service');
const { ConfigService } = require('@nestjs/config');
const { StorageService } = require('../dist/apps/api/src/storage/storage.service');

async function testBasicProcessing() {
  console.log('🧪 Testing basic asset processing without compression...');

  try {
    // Mock services for testing
    const configService = {
      get: (key) => {
        if (key === 'AWS_REGION') return 'us-east-1';
        if (key === 'AWS_S3_BUCKET') return 'test-bucket';
        return null;
      }
    };

    const storageService = {
      generateProcessedObjectKey: (userId, category, assetId, variant, filename) => {
        return `${userId}/${category}/${assetId}/${variant}/${filename}`;
      },
      downloadAssetToFile: async (objectKey, filePath) => {
        console.log(`📥 Mock downloading ${objectKey} to ${filePath}`);
        // In a real test, we'd copy a test GLB file here
      },
      uploadFileToStorage: async (filePath, objectKey, contentType) => {
        console.log(`📤 Mock uploading ${filePath} to ${objectKey} (${contentType})`);
      }
    };

    const processingService = new ProcessingService(configService, storageService);

    // Test with minimal options (no compression)
    const result = await processingService.processAsset(
      'test-user',
      'test-category',
      'test-asset-123',
      'test-original-key.glb',
      {
        enableDraco: false,
        enableMeshopt: false,
        generateLODs: false,
        // No textureFormat to avoid compression
      }
    );

    console.log('✅ Basic processing test completed');
    console.log('Result:', {
      success: result.success,
      error: result.error,
      variantsCount: result.variants?.length || 0
    });

    if (result.success) {
      console.log('🎉 Basic asset processing is working!');
    } else {
      console.log('❌ Basic processing failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  }
}

testBasicProcessing();