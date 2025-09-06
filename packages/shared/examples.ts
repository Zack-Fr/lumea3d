/**
 * Example usage of the Lumea API Client
 * 
 * This file demonstrates common usage patterns for the generated API client,
 * including authentication, scene management, and asset processing.
 */

import { 
  createLumeaApiClient, 
  LumeaApiClient,
  type CreateSceneItemDto 
} from './src';

// Example 1: Authentication and Setup
async function authenticateAndSetup(): Promise<LumeaApiClient> {
  const api = createLumeaApiClient({
    baseURL: 'http://localhost:3001' // Use production URL in real apps
  });

  try {
    // Login with credentials
    const loginResponse = await api.auth.authControllerLogin({
      email: 'user@example.com',
      password: 'secure-password'
    });

    console.log('✅ Authentication successful');
    // Note: Access token handling depends on your API response structure
    // api.setAccessToken(loginResponse.data.access_token);
    
    return api;
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    throw error;
  }
}

// Example 2: Project Management
async function createAndManageProject(api: LumeaApiClient) {
  try {
    // Create a new project with optional scene
    const projectResponse = await api.projects.projectsControllerCreate({
      name: 'Modern Living Room',
      scene: {
        name: 'Main Layout'
      }
    });

    const response = projectResponse.data;
    console.log('✅ Created project:', response.projectId);
    console.log('✅ Created scene:', response.sceneId);

    // Get all projects
    const allProjects = await api.projects.projectsControllerFindAll();
    console.log('📋 Total projects:', allProjects.data.length);

    // Get specific project details
    if (response.projectId) {
      const projectDetails = await api.projects.projectsControllerFindOne(response.projectId);
      console.log('📄 Project details loaded');
    }

    return { 
      projectId: response.projectId, 
      sceneId: response.sceneId,
      project: response.project,
      scene: response.scene 
    };
  } catch (error) {
    console.error('❌ Project creation failed:', error);
    throw error;
  }
}

// Example 3: Scene Operations
async function performSceneOperations(api: LumeaApiClient, sceneId: string) {
  try {
    // Get scene details
    const scene = await api.scenes.flatScenesControllerFindOne(sceneId);
    console.log('✅ Scene loaded');

    // Get current version (returns a number)
    const versionInfo = await api.scenes.flatScenesControllerGetVersion(sceneId);
    console.log('📊 Current scene version info:', versionInfo);

    // Get scene categories
    const categoriesResponse = await api.scenes.flatScenesControllerGetSceneCategories(sceneId);
    console.log('📦 Available categories:', categoriesResponse.data);

    // Generate scene manifest
    const manifest = await api.scenes.flatScenesControllerGenerateManifest(sceneId);
    console.log('📄 Scene manifest generated');

    // Generate filtered manifest with specific categories
    const filteredManifest = await api.scenes.flatScenesControllerGenerateManifest(
      sceneId,
      'furniture,lighting', // categories filter
      true // include metadata
    );
    console.log('🔍 Filtered manifest generated');

    return { scene: scene.data, categories: categoriesResponse.data };
  } catch (error) {
    console.error('❌ Scene operations failed:', error);
    throw error;
  }
}

// Example 4: Scene Item Management with Optimistic Locking
async function manageSceneItems(api: LumeaApiClient, sceneId: string) {
  try {
    // For optimistic locking, we need to track versions
    // Note: The exact structure depends on your API implementation
    const currentVersion = '1'; // This would come from scene data or version endpoint

    // Add a furniture item
    const newItem: CreateSceneItemDto = {
      categoryKey: 'furniture.sofa',
      model: 'modern-sofa',
      positionX: 100,
      positionY: 0,
      positionZ: 150,
      rotationX: 0,
      rotationY: 45,
      rotationZ: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      scaleZ: 1.0,
      selectable: true,
      locked: false,
      materialVariant: 'fabric-blue'
    };

    console.log('🪑 Adding furniture item...');
    const addedItem = await api.scenes.flatScenesControllerAddItem(
      sceneId,
      currentVersion, // If-Match header
      currentVersion, // If-Match2 header (for some APIs)
      newItem
    );
    console.log('✅ Item added successfully');

    // Update scene metadata (with version control)
    console.log('📝 Updating scene...');
    await api.scenes.flatScenesControllerUpdate(
      sceneId,
      currentVersion,
      currentVersion,
      {
        name: 'Updated Living Room Design'
      }
    );
    console.log('✅ Scene updated successfully');

    return addedItem.data;
  } catch (error: any) {
    if (error.response?.status === 412) {
      console.error('⚠️ Version conflict: Scene was modified by another user');
      // In real apps, fetch latest version and retry
    } else {
      console.error('❌ Item management failed:', error);
    }
    throw error;
  }
}

// Example 5: User Management
async function getUserInformation(api: LumeaApiClient) {
  try {
    // Get current user profile
    const profile = await api.auth.authControllerGetProfile();
    console.log('👤 Current user profile retrieved');

    // Get current user details via users endpoint
    const currentUser = await api.users.usersControllerGetCurrentUser();
    console.log('👥 Current user details:', currentUser.data);

    // Get user statistics
    const userStats = await api.users.usersControllerGetUserStats();
    console.log('� User statistics:', userStats.data);

    return { profile: profile.data, userDetails: currentUser.data, stats: userStats.data };
  } catch (error) {
    console.error('❌ User information retrieval failed:', error);
    throw error;
  }
}

// Example 6: Error Handling Patterns
async function demonstrateErrorHandling(api: LumeaApiClient) {
  try {
    // Attempt to access a non-existent scene
    await api.scenes.flatScenesControllerFindOne('non-existent-scene-id');
  } catch (error: any) {
    console.log('✅ Error handling demonstration:');
    
    if (error.response) {
      // API responded with error status
      switch (error.response.status) {
        case 401:
          console.log('🔒 Authentication required - token expired or invalid');
          break;
        case 403:
          console.log('⛔ Access denied - insufficient permissions');
          break;
        case 404:
          console.log('🔍 Resource not found (expected for this demo)');
          break;
        case 412:
          console.log('⚠️ Precondition failed - version conflict');
          break;
        case 429:
          console.log('🚦 Rate limit exceeded - please slow down');
          break;
        default:
          console.log(`❌ API error ${error.response.status}:`, error.response.data);
      }
    } else if (error.request) {
      // Network error
      console.log('🌐 Network error - check your connection');
    } else {
      // Other error
      console.log('❌ Unexpected error:', error.message);
    }
  }
}

// Example 7: Delta Generation
async function generateSceneDelta(api: LumeaApiClient, sceneId: string) {
  try {
    // Generate delta between two versions
    // Note: This assumes you have multiple versions
    const deltaResponse = await api.scenes.flatScenesControllerGenerateDelta(
      sceneId,
      1, // from version
      2  // to version
    );

    console.log('📋 Scene delta generated');
    return deltaResponse.data;
  } catch (error) {
    console.log('ℹ️ Delta generation failed (may not have multiple versions yet)');
    return null;
  }
}

// Complete workflow example
async function completeWorkflowExample() {
  console.log('🚀 Starting Lumea API Client Example\n');

  try {
    // 1. Authenticate
    const api = await authenticateAndSetup();
    
    // 2. Create project and scene
    const { projectId, sceneId } = await createAndManageProject(api);
    
    if (sceneId) {
      // 3. Perform scene operations
      await performSceneOperations(api, sceneId);
      
      // 4. Manage scene items
      await manageSceneItems(api, sceneId);
      
      // 5. Generate delta (if applicable)
      await generateSceneDelta(api, sceneId);
    }
    
    // 6. Get user information
    await getUserInformation(api);
    
    // 7. Demonstrate error handling
    await demonstrateErrorHandling(api);
    
    console.log('\n✅ All examples completed successfully!');
    console.log('\n📚 API Usage Summary:');
    console.log('  - Authentication with login/logout');
    console.log('  - Project creation and management'); 
    console.log('  - Scene operations and versioning');
    console.log('  - Item management with optimistic locking');
    console.log('  - User profile and statistics');
    console.log('  - Error handling patterns');
    console.log('  - Scene deltas and manifests');
    
  } catch (error) {
    console.error('\n❌ Example workflow failed:', error);
  }
}

// Export examples for use in other files
export {
  authenticateAndSetup,
  createAndManageProject,
  performSceneOperations,
  manageSceneItems,
  getUserInformation,
  generateSceneDelta,
  demonstrateErrorHandling,
  completeWorkflowExample
};

// Run example if this file is executed directly
if (require.main === module) {
  completeWorkflowExample().catch(console.error);
}