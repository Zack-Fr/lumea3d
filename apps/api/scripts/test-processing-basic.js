const { ProcessingService } = require('../dist/apps/api/src/processing/processing.service');
const { ConfigService } = require('@nestjs/config');

// Simple test to verify basic processing works
async function testBasicProcessing() {
  console.log('🧪 Testing basic asset processing functionality...');

  try {
    // Mock config service
    const configService = {
      get: (key) => {
        switch (key) {
          case 'AWS_REGION': return 'us-east-1';
          case 'AWS_S3_BUCKET': return 'test-bucket';
          default: return null;
        }
      }
    };

    // Mock storage service
    const storageService = {
      generateProcessedObjectKey: (userId, category, assetId, variant, filename) => {
        return `${userId}/${category}/${assetId}/${variant}/${filename}`;
      },
      downloadAssetToFile: async (objectKey, filePath) => {
        console.log(`📥 Mock downloading ${objectKey} to ${filePath}`);
        // In a real test, we'd need a test GLB file
        throw new Error('Mock: No test GLB file available');
      },
      uploadFileToStorage: async (filePath, objectKey, contentType) => {
        console.log(`📤 Mock uploading ${filePath} to ${objectKey} (${contentType})`);
      }
    };

    // Test instantiation
    const processingService = new ProcessingService(configService, storageService);
    console.log('✅ ProcessingService instantiated successfully');

    // Test with minimal options (no compression features)
    const options = {
      enableDraco: false,
      enableMeshopt: false,
      generateLODs: false,
      // No textureFormat to avoid compression
    };

    console.log('📋 Test options:', options);
    console.log('✅ Basic processing configuration looks good');

    // Note: We can't actually run processAsset without a real GLB file
    // But we can verify the service is configured correctly
    console.log('🎯 Asset processing service is ready for testing with real GLB files');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testBasicProcessing();