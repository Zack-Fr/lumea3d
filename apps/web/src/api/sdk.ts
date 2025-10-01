/**
 * Stable API SDK facade for Lumea frontend
 * 
 * This file provides a stable import surface that re-exports from @lumea/api-client.
 * It shields the frontend from changes in the generated OpenAPI client structure.
 * 
 * Usage: import { FlatScenesApi, AssetsApi, SceneManifestV2 } from '@/api/sdk';
 */

// Re-export everything from the OpenAPI client package
export * from '@lumea/api-client';

// Explicitly re-export commonly used APIs for better IDE support
export { 
  FlatScenesApi,
  AssetsApi, 
  ProjectsApi,
  UsersApi,
  AuthenticationApi,
  ScenesSSEFlatRoutesApi,
  ScenesSSEApi,
  SceneDownloadsApi
} from '@lumea/api-client';

// Re-export commonly used types
export type {
  SceneManifestV2,
  SceneDelta,
  CreateSceneDto,
  UpdateSceneDto,
  CreateSceneItemDto,
  UpdateSceneItemDto,
  CreateAssetDto,
  CreateProjectDto,
  CreateProjectSceneDto,
  ConfigurationParameters
} from '@lumea/api-client';

// Re-export shared types that are still in @lumea/shared
export { AssetStatus, AssetLicense } from '@lumea/shared';
export type { Vec3, DeltaOp } from '@lumea/shared';

// Re-export Configuration as both type and value
export { Configuration } from '@lumea/api-client';

// Re-export base classes that may be needed
export { BaseAPI, RequiredError } from '@lumea/api-client';