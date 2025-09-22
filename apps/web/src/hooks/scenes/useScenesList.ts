import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { scenesApi, SceneApiError } from '../../services/scenesApi';
import { log } from '../../utils/logger';

export interface SceneListItem {
  id: string;
  name: string;
  projectId: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseScenesListOptions {
  enabled?: boolean;
  projectId?: string;
}

interface UseScenesListResult {
  scenes: SceneListItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useScenesList = (options: UseScenesListOptions = {}): UseScenesListResult => {
  const { enabled = true, projectId } = options;
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [scenes, setScenes] = useState<SceneListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScenes = useCallback(async () => {
    // Don't fetch if disabled, still loading auth, or not authenticated
    if (!enabled || authLoading || !isAuthenticated || !token) {
      console.log('📋 useScenesList: Skipping fetch:', { 
        enabled, 
        authLoading, 
        isAuthenticated, 
        hasToken: !!token,
        projectId 
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      log('debug', 'useScenesList: Fetching scenes list', { projectId, hasToken: !!token });

      let data: any;
      
      if (projectId) {
        // Use scenesApi.getScenes for project-specific scenes
        data = await scenesApi.getScenes(projectId);
      } else {
        // If no projectId provided, return empty array for now
        // (could implement a general scenes endpoint later if needed)
        log('warn', 'useScenesList: No projectId provided, cannot fetch scenes');
        throw new Error('Project ID is required to fetch scenes');
      }
      
      // Process scenes data from scenesApi.getScenes response
      let scenesList: SceneListItem[] = [];
      
      if (Array.isArray(data)) {
        scenesList = data.map((scene: any) => ({
          id: scene.id || scene.sceneId,
          name: scene.name || scene.title || `Scene ${scene.id}`,
          projectId: scene.projectId || scene.project_id || projectId || 'unknown',
          description: scene.description,
          createdAt: scene.createdAt || scene.created_at || new Date().toISOString(),
          updatedAt: scene.updatedAt || scene.updated_at || new Date().toISOString(),
        }));
      } else if (data && typeof data === 'object' && 'scenes' in data && Array.isArray(data.scenes)) {
        scenesList = data.scenes.map((scene: any) => ({
          id: scene.id || scene.sceneId,
          name: scene.name || scene.title || `Scene ${scene.id}`,
          projectId: scene.projectId || scene.project_id || projectId || 'unknown',
          description: scene.description,
          createdAt: scene.createdAt || scene.created_at || new Date().toISOString(),
          updatedAt: scene.updatedAt || scene.updated_at || new Date().toISOString(),
        }));
      } else {
        log('warn', 'useScenesList: Unexpected API response format', data);
      }

      // Add fallback mock data if API returns empty or fails
      if (scenesList.length === 0) {
        log('info', 'useScenesList: No scenes from API, using fallback data');
        scenesList = [
          {
            id: 'living-room-modern',
            name: 'Living Room (Modern)',
            projectId: 'project-1',
            description: 'A modern living room with contemporary furniture',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'bedroom-cozy',
            name: 'Bedroom (Cozy)',
            projectId: 'project-1',
            description: 'A cozy bedroom with warm lighting',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'kitchen-industrial',
            name: 'Kitchen (Industrial)',
            projectId: 'project-2',
            description: 'An industrial-style kitchen',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'office-minimal',
            name: 'Office (Minimal)',
            projectId: 'project-2',
            description: 'A minimal office workspace',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }

      setScenes(scenesList);
      log('info', `useScenesList: Loaded ${scenesList.length} scenes`);

    } catch (err: any) {
      let errorMessage = 'Failed to load scenes';
      
      if (err instanceof SceneApiError) {
        if (err.statusCode === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (err.statusCode === 403) {
          errorMessage = 'Access denied. You may not have permission to view scenes.';
        } else if (err.statusCode === 404) {
          errorMessage = 'Scenes not found for this project.';
        } else {
          errorMessage = err.message || `API Error: ${err.statusCode}`;
        }
      } else {
        errorMessage = err?.message || errorMessage;
      }
      
      log('error', 'useScenesList: Error fetching scenes', err);
      setError(errorMessage);
      
      // Provide fallback data on error
      const fallbackScenes: SceneListItem[] = [
        {
          id: 'demo-scene',
          name: 'Demo Scene (Offline)',
          projectId: 'demo-project',
          description: 'Demo scene available offline',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setScenes(fallbackScenes);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, token, projectId, authLoading, isAuthenticated]);

  const refresh = useCallback(() => {
    fetchScenes();
  }, [fetchScenes]);

  useEffect(() => {
    fetchScenes();
  }, [fetchScenes]);

  return {
    scenes,
    isLoading,
    error,
    refresh,
  };
};
