import { useState, useCallback } from 'react';
import { log } from '../utils/logger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../providers/AuthProvider';
import { 
  projectsApi, 
  CreateProjectDto, 
  ProjectCreationResult, 
  ProjectApiError,
} from '../services/projectsApi';

export interface Project {
  id: number;
  name: string;
  client: string;
  stage: 'concept' | 'design' | 'feedback' | 'delivery';
  progress: number;
  dueDate: string;
  thumbnail: string;
}

// Re-export the actual project type from the API
export type { ProjectWithScenes } from '../services/projectsApi';

// Legacy hook for dashboard compatibility
export const useProjects = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleProjectClick = useCallback((project: Project) => {
    setSelectedProject(project);
  }, []);

  const handleFilterChange = useCallback((filter: string) => {
    setSelectedFilter(filter);
  }, []);

  return {
    selectedFilter,
    selectedProject,
    setSelectedFilter: handleFilterChange,
    onProjectClick: handleProjectClick,
  };
};

export interface UseCreateProjectOptions {
  onSuccess?: (data: ProjectCreationResult) => void;
  onError?: (error: ProjectApiError) => void;
}

/**
 * Hook for creating a new project
 * Returns { projectId, sceneId } for direct editor navigation
 */
export function useCreateProject(options: UseCreateProjectOptions = {}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  log('debug', '🏗️ useCreateProject: Hook initialized', { 
    hasToken: !!token, 
    tokenLength: token?.length,
    tokenPreview: token?.substring(0, 20) + '...'
  });

  return useMutation({
    mutationFn: async (dto: CreateProjectDto) => {
      if (!token) {
        throw new ProjectApiError('Authentication required');
      }
      
      return projectsApi.create(dto, token);
    },
    onSuccess: (data) => {
      // Invalidate projects list to show new project
      queryClient.invalidateQueries({
        queryKey: ['projects']
      });
      
      options.onSuccess?.(data);
    },
    onError: (error: ProjectApiError) => {
      console.error('Failed to create project:', error);
      options.onError?.(error);
    },
  });
}

export interface UseUserProjectsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook for fetching user's projects
 */
export function useUserProjects(options: UseUserProjectsOptions = {}) {
  const { token } = useAuth();
  const { enabled = true, refetchInterval } = options;

  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!token) {
        throw new ProjectApiError('Authentication required');
      }
      return projectsApi.getUserProjects(token);
    },
    enabled: enabled && !!token,
    refetchInterval,
    staleTime: 30 * 1000, // 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof ProjectApiError && error.statusCode === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export interface UseProjectOptions {
  enabled?: boolean;
}

/**
 * Hook for fetching a specific project
 */
export function useProject(projectId: string, options: UseProjectOptions = {}) {
  const { token } = useAuth();
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      if (!token) {
        throw new ProjectApiError('Authentication required');
      }
      return projectsApi.getProject(projectId, token);
    },
    enabled: enabled && !!token && !!projectId,
    staleTime: 60 * 1000, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on auth errors or not found
      if (error instanceof ProjectApiError && [401, 403, 404].includes(error.statusCode || 0)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook for fetching project scenes (project-scoped collection)
 */
export function useProjectScenes(projectId: string, options: UseProjectOptions = {}) {
  const { token } = useAuth();
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['projects', projectId, 'scenes'],
    queryFn: async () => {
      if (!token) {
        throw new ProjectApiError('Authentication required');
      }
      return projectsApi.getScenes(projectId, token);
    },
    enabled: enabled && !!token && !!projectId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for fetching project categories (project-scoped collection)
 */
export function useProjectCategories(projectId: string, options: UseProjectOptions = {}) {
  const { token } = useAuth();
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['projects', projectId, 'categories'],
    queryFn: async () => {
      if (!token) {
        throw new ProjectApiError('Authentication required');
      }
      return projectsApi.getCategories(projectId, token);
    },
    enabled: enabled && !!token && !!projectId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export interface UseCreateCategoryOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: ProjectApiError) => void;
}

/**
 * Hook for creating a new category in a project
 */
export function useCreateCategory(projectId: string, options: UseCreateCategoryOptions = {}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: any) => {
      if (!token) {
        throw new ProjectApiError('Authentication required');
      }
      return projectsApi.createCategory(projectId, category, token);
    },
    onSuccess: (data) => {
      // Invalidate categories list to show new category
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'categories']
      });
      
      options.onSuccess?.(data);
    },
    onError: (error: ProjectApiError) => {
      console.error('Failed to create category:', error);
      options.onError?.(error);
    },
  });
}