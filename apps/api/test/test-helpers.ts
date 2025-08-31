import { User, Project, Asset, Scene3D } from '@prisma/client';
import { prisma } from './setup';
import * as argon2 from '@node-rs/argon2';

export interface TestUser {
  user: User;
  token: string;
}

export interface TestProject {
  project: Project;
  user: User;
}

export interface TestAsset {
  asset: Asset;
  user: User;
}

export interface TestScene {
  scene: Scene3D;
  project: Project;
  user: User;
}

/**
 * Create a test user with authentication token
 */
export const createTestUser = async (overrides: Partial<User> = {}): Promise<TestUser> => {
  const passwordHash = await argon2.hash('testPassword123');
  
  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      passwordHash,
      displayName: 'Test User',
      role: 'DESIGNER',
      ...overrides,
    },
  });

  // For testing, we'll create a simple token (in real app this would be JWT)
  const token = `test-token-${user.id}`;

  return { user, token };
};

/**
 * Create a test project for a user
 */
export const createTestProject = async (user?: User): Promise<TestProject> => {
  if (!user) {
    const testUser = await createTestUser();
    user = testUser.user;
  }

  const project = await prisma.project.create({
    data: {
      name: `Test Project ${Date.now()}`,
      user_id: user.id,
    },
  });

  return { project, user };
};

/**
 * Create a test asset for a user
 */
export const createTestAsset = async (user?: User, overrides: Partial<Asset> = {}): Promise<TestAsset> => {
  if (!user) {
    const testUser = await createTestUser();
    user = testUser.user;
  }

  const asset = await prisma.asset.create({
    data: {
      uploader_id: user.id,
      original_name: 'test-model.glb',
      mime_type: 'model/gltf-binary',
      file_size: 1024 * 1024, // 1MB
      status: 'UPLOADED',
      original_url: 'https://test-bucket/test-model.glb',
      license: 'CC0',
      ...overrides,
    },
  });

  return { asset, user };
};

/**
 * Create a test 3D scene with project
 */
export const createTestScene = async (project?: Project, user?: User, overrides: Partial<Scene3D> = {}): Promise<TestScene> => {
  if (!project) {
    const testProject = await createTestProject(user);
    project = testProject.project;
    user = testProject.user;
  }

  const scene = await prisma.scene3D.create({
    data: {
      name: `Test Scene ${Date.now()}`,
      project_id: project.id,
      version: 1,
      scale: 1.0,
      exposure: 1.0,
      env_intensity: 1.0,
      spawn_position_x: 0,
      spawn_position_y: 1.7,
      spawn_position_z: 5,
      spawn_yaw_deg: 0,
      ...overrides,
    },
  });

  return { scene, project, user: user! };
};

/**
 * Create test category for a project with asset
 */
export const createTestCategory = async (project: Project, asset: Asset, categoryKey = 'test_furniture') => {
  return await prisma.projectCategory3D.create({
    data: {
      project_id: project.id,
      asset_id: asset.id,
      category_key: categoryKey,
      instancing: false,
      draco: true,
      meshopt: true,
      ktx2: true,
    },
  });
};

/**
 * Create test scene item
 */
export const createTestSceneItem = async (scene: Scene3D, categoryKey: string, overrides = {}) => {
  return await prisma.sceneItem3D.create({
    data: {
      scene_id: scene.id,
      category_key: categoryKey,
      model: 'default',
      position_x: 0,
      position_y: 1.7,
      position_z: 0,
      rotation_x: 0,
      rotation_y: 0,
      rotation_z: 0,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
      material_variant: 'default',
      selectable: true,
      locked: false,
      ...overrides,
    },
  });
};

/**
 * Mock file buffer for testing file uploads
 */
export const createMockGLBFile = (): Buffer => {
  // Create a minimal GLB file structure
  // GLB header: magic (4 bytes) + version (4 bytes) + length (4 bytes)
  const header = Buffer.alloc(12);
  header.write('glTF', 0); // Magic
  header.writeUInt32LE(2, 4); // Version
  header.writeUInt32LE(12, 8); // Length (header only for this mock)
  
  return header;
};

/**
 * Create mock texture file
 */
export const createMockTextureFile = (): Buffer => {
  // Create a minimal PNG file
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return pngSignature;
};

/**
 * Wait for async operations to complete
 */
export const waitForAsync = (ms: number = 100): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};