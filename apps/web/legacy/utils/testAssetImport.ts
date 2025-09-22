/**
 * Test utility to verify asset import and scene integration
 * 
 * This file can be used to test the complete asset import workflow:
 * 1. Import an asset through AssetImportModal
 * 2. Add it to the scene via scenesApi.addItem
 * 3. Verify it appears in LeftSidebar with correct name
 * 4. Confirm it renders in the 3D viewport
 */

import { scenesApi, SceneItemCreateRequest } from '../services/scenesApi';

export interface TestAssetData {
  name: string;
  url: string;
  category: string;
}

/**
 * Test adding an asset to a scene
 */
export async function testAddAssetToScene(
  sceneId: string,
  asset: TestAssetData,
  currentVersion?: string
): Promise<boolean> {
  try {
    console.log('🧪 TEST: Starting asset import test', { sceneId, asset, currentVersion });
    
    // Create a scene item request that matches the backend DTO structure
    const sceneItem: SceneItemCreateRequest = {
      categoryKey: asset.category || 'imported_assets',
      positionX: Math.random() * 10 - 5, // Random position for testing
      positionY: 0,
      positionZ: Math.random() * 10 - 5,
      rotationX: 0,
      rotationY: Math.random() * 360, // Random rotation
      rotationZ: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      selectable: true,
      locked: false,
      meta: {
        assetName: asset.name,
        assetUrl: asset.url,
        testImport: true,
        importedAt: new Date().toISOString()
      }
    };
    
    console.log('🧪 TEST: Created scene item payload:', JSON.stringify(sceneItem, null, 2));
    
    // Add the item to the scene
    const result = await scenesApi.addItem(sceneId, sceneItem, currentVersion);
    
    console.log('🧪 TEST: Add item result:', result);
    
    // Verify the result has expected structure
    if (!result || !result.id) {
      throw new Error('Expected result to contain an id field');
    }
    
    console.log('✅ TEST: Asset successfully added to scene with id:', result.id);
    return true;
    
  } catch (error) {
    console.error('❌ TEST: Asset import test failed:', error);
    
    // Log additional details if it's a SceneApiError
    if (error instanceof Error && 'statusCode' in error) {
      console.error('❌ TEST: HTTP Status:', (error as any).statusCode);
      console.error('❌ TEST: Error details:', (error as any).error);
    }
    
    return false;
  }
}

/**
 * Test the complete workflow with mock data
 */
export async function runCompleteAssetImportTest(sceneId: string, currentVersion?: string): Promise<void> {
  console.log('🧪 TEST: Running complete asset import test workflow');
  
  const testAssets: TestAssetData[] = [
    {
      name: 'Test Chair',
      url: 'https://example.com/chair.glb',
      category: 'furniture'
    },
    {
      name: 'Test Table', 
      url: 'https://example.com/table.glb',
      category: 'furniture'
    },
    {
      name: 'Test Lamp',
      url: 'https://example.com/lamp.glb',
      category: 'lighting'
    }
  ];
  
  const results: boolean[] = [];
  
  for (const asset of testAssets) {
    console.log(`🧪 TEST: Testing asset: ${asset.name}`);
    const success = await testAddAssetToScene(sceneId, asset, currentVersion);
    results.push(success);
    
    if (success) {
      console.log(`✅ TEST: ${asset.name} - SUCCESS`);
    } else {
      console.log(`❌ TEST: ${asset.name} - FAILED`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const successCount = results.filter(Boolean).length;
  const totalCount = results.length;
  
  console.log(`🧪 TEST: Complete workflow results: ${successCount}/${totalCount} successful`);
  
  if (successCount === totalCount) {
    console.log('🎉 TEST: All asset import tests passed!');
  } else {
    console.log('⚠️ TEST: Some asset import tests failed. Check logs above for details.');
  }
}

/**
 * Validate scene item structure matches expected format
 */
export function validateSceneItemStructure(item: any): boolean {
  const requiredFields = ['id', 'name', 'category'];
  
  console.log('🧪 TEST: Validating scene item structure:', item);
  
  // Check required fields
  for (const field of requiredFields) {
    if (!(field in item)) {
      console.error(`❌ TEST: Missing required field: ${field}`);
      return false;
    }
  }
  
  // Check transform structure if present
  if (item.transform) {
    const requiredTransformFields = ['position', 'rotation_euler', 'scale'];
    for (const field of requiredTransformFields) {
      if (!(field in item.transform)) {
        console.error(`❌ TEST: Missing transform field: ${field}`);
        return false;
      }
      if (!Array.isArray(item.transform[field]) || item.transform[field].length !== 3) {
        console.error(`❌ TEST: Invalid transform field format: ${field} should be array of 3 numbers`);
        return false;
      }
    }
  }
  
  console.log('✅ TEST: Scene item structure validation passed');
  return true;
}

// Export for console testing
(window as any).testAssetImport = {
  testAddAssetToScene,
  runCompleteAssetImportTest,
  validateSceneItemStructure
};

export default {
  testAddAssetToScene,
  runCompleteAssetImportTest, 
  validateSceneItemStructure
};
