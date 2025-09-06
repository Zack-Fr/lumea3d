// Existing schemas
export * from './schemas';

// Generated OpenAPI types
export * from './types/api';

// Generated client SDK
export * from './client';

// Convenient API client
export * from './api-client';

// Re-export commonly used client APIs for convenience
export { AssetsApi } from './client/api/assets-api';
export { AuthenticationApi } from './client/api/authentication-api';
export { FlatScenesApi } from './client/api/flat-scenes-api';
export { ProjectsApi } from './client/api/projects-api';
export { UsersApi } from './client/api/users-api';
export { ScenesSSEFlatRoutesApi } from './client/api/scenes-sseflat-routes-api';

// Re-export commonly used models for convenience
export type { 
  SceneManifestV2,
  SceneDelta,
  CreateSceneDto,
  UpdateSceneDto,
  CreateSceneItemDto,
  UpdateSceneItemDto,
  CreateAssetDto,
  CreateProjectDto,
  CreateProjectSceneDto
} from './client';

// Re-export configuration for easy client setup
export { Configuration, ConfigurationParameters } from './client/configuration';