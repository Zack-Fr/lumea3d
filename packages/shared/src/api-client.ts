import { Configuration, ConfigurationParameters } from './client/configuration';
import { 
  AssetsApi, 
  AuthenticationApi, 
  FlatScenesApi, 
  ProjectsApi, 
  UsersApi,
  ScenesSSEFlatRoutesApi 
} from './client';

/**
 * Configuration parameters for the Lumea API client
 */
export interface LumeaApiConfig {
  /** Base URL for the API (defaults to http://localhost:3001) */
  baseURL?: string;
  /** JWT access token for authentication */
  accessToken?: string;
  /** Custom axios configuration */
  axiosConfig?: any;
}

/**
 * Creates a configured Lumea API client with all endpoints
 */
export class LumeaApiClient {
  private config: Configuration;
  
  // API endpoint groups
  public readonly assets: AssetsApi;
  public readonly auth: AuthenticationApi;
  public readonly scenes: FlatScenesApi;
  public readonly projects: ProjectsApi;
  public readonly users: UsersApi;
  public readonly sse: ScenesSSEFlatRoutesApi;

  constructor(config: LumeaApiConfig = {}) {
    const configParams: ConfigurationParameters = {
      basePath: config.baseURL || 'http://localhost:3001',
      accessToken: config.accessToken,
      ...config.axiosConfig,
    };

    this.config = new Configuration(configParams);

    // Initialize all API endpoints
    this.assets = new AssetsApi(this.config);
    this.auth = new AuthenticationApi(this.config);
    this.scenes = new FlatScenesApi(this.config);
    this.projects = new ProjectsApi(this.config);
    this.users = new UsersApi(this.config);
    this.sse = new ScenesSSEFlatRoutesApi(this.config);
  }

  /**
   * Update the access token for authentication
   */
  setAccessToken(token: string) {
    const newConfig = new Configuration({
      ...this.config,
      accessToken: token,
    });

    // Update all API instances with new configuration
    Object.assign(this.assets, new AssetsApi(newConfig));
    Object.assign(this.auth, new AuthenticationApi(newConfig));
    Object.assign(this.scenes, new FlatScenesApi(newConfig));
    Object.assign(this.projects, new ProjectsApi(newConfig));
    Object.assign(this.users, new UsersApi(newConfig));
    Object.assign(this.sse, new ScenesSSEFlatRoutesApi(newConfig));
  }

  /**
   * Clear the access token
   */
  clearAccessToken() {
    this.setAccessToken('');
  }

  /**
   * Get the current configuration
   */
  getConfig(): Configuration {
    return this.config;
  }
}

/**
 * Factory function to create a new Lumea API client
 */
export function createLumeaApiClient(config?: LumeaApiConfig): LumeaApiClient {
  return new LumeaApiClient(config);
}

/**
 * Type helper for extracting response types from API calls
 */
export type ApiResponse<T> = T extends Promise<infer U> ? U : never;