// Stable facade for Lumea API client
// This provides a stable surface area for the frontend to import from

// Re-export everything from generated client for full access
export * as ApiClient from './generated';

// Re-export commonly used API services for convenience
export { AssetsApi } from './generated/api/assets-api';
export { AuthenticationApi } from './generated/api/authentication-api';
export { FlatScenesApi } from './generated/api/flat-scenes-api';
export { ProjectsApi } from './generated/api/projects-api';
export { UsersApi } from './generated/api/users-api';
export { ScenesSSEFlatRoutesApi } from './generated/api/scenes-sseflat-routes-api';
export { ScenesSSEApi } from './generated/api/scenes-sseapi';
export { SceneDownloadsApi } from './generated/api/scene-downloads-api';

// Re-export commonly used models/types for convenience
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
} from './generated/models';

// Re-export base classes and configuration
export { BaseAPI, RequiredError } from './generated/base';
export { Configuration } from './generated/configuration';
export type { ConfigurationParameters } from './generated/configuration';