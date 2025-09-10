import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../providers/AuthProvider';
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
  const { token } = useAuth();
  const [scenes, setScenes] = useState<SceneListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScenes = useCallback(async () => {
    if (!enabled || !token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      log('debug', 'useScenesList: Fetching scenes list', { projectId, hasToken: !!token });

      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      let url = `${API_BASE_URL}/scenes`;
      
      // Add project filter if specified
      if (projectId) {
        url += `?projectId=${encodeURIComponent(projectId)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You may not have permission to view scenes.');
        } else if (response.status === 404) {
          throw new Error('Scenes API not found. Please check the server configuration.');
        } else {
          throw new Error(`Failed to fetch scenes: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      // Handle different response formats
      let scenesList: SceneListItem[] = [];
      
      if (Array.isArray(data)) {
        scenesList = data.map((scene: any) => ({
          id: scene.id || scene.sceneId,
          name: scene.name || scene.title || `Scene ${scene.id}`,
          projectId: scene.projectId || scene.project_id || 'unknown',
          description: scene.description,
          createdAt: scene.createdAt || scene.created_at || new Date().toISOString(),
          updatedAt: scene.updatedAt || scene.updated_at || new Date().toISOString(),
        }));
      } else if (data.scenes && Array.isArray(data.scenes)) {
        scenesList = data.scenes.map((scene: any) => ({
          id: scene.id || scene.sceneId,
          name: scene.name || scene.title || `Scene ${scene.id}`,
          projectId: scene.projectId || scene.project_id || 'unknown',
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
      const errorMessage = err?.message || 'Failed to load scenes';
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
  }, [enabled, token, projectId]);

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
