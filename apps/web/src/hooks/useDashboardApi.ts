import { useState, useEffect, useCallback } from 'react';
import { getDashboardApiService, UserProfile, DashboardProject, UserStats } from '../services/dashboardApi';
import { useAuth } from '../providers/AuthProvider';

// Create a singleton instance of the API service
const dashboardApiService = getDashboardApiService();

export interface UseDashboardDataResult {
  userProfile: UserProfile | null;
  projects: DashboardProject[];
  userStats: UserStats | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticationError: boolean;
  refetch: () => Promise<void>;
}

export const useDashboardData = (): UseDashboardDataResult => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticationError, setIsAuthenticationError] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchData = useCallback(async () => {
    // Don't fetch if auth is still loading or user is not authenticated
    if (authLoading || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsAuthenticationError(false);

      // Fetch all data in parallel
      const [profileData, projectsData, statsData] = await Promise.all([
        dashboardApiService.getUserProfile(),
        dashboardApiService.getUserProjects(),
        dashboardApiService.getUserStats(),
      ]);

      setUserProfile(profileData);
      setProjects(projectsData);
      setUserStats(statsData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);

      // Check if it's an authentication error
      const isAuthError = err instanceof Error && err.message === 'AUTHENTICATION_FAILED';
      setIsAuthenticationError(isAuthError);

      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    userProfile,
    projects,
    userStats,
    isLoading,
    error,
    isAuthenticationError,
    refetch: fetchData,
  };
};

export interface UseUserProfileResult {
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticationError: boolean;
  refetch: () => Promise<void>;
}

export const useUserProfile = (): UseUserProfileResult => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticationError, setIsAuthenticationError] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchProfile = useCallback(async () => {
    // Don't fetch if auth is still loading or user is not authenticated
    if (authLoading || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsAuthenticationError(false);
      const profileData = await dashboardApiService.getUserProfile();
      setUserProfile(profileData);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);

      // Check if it's an authentication error
      const isAuthError = err instanceof Error && err.message === 'AUTHENTICATION_FAILED';
      setIsAuthenticationError(isAuthError);

      setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    userProfile,
    isLoading,
    error,
    isAuthenticationError,
    refetch: fetchProfile,
  };
};

export interface UseUserProjectsResult {
  projects: DashboardProject[];
  isLoading: boolean;
  error: string | null;
  isAuthenticationError: boolean;
  refetch: () => Promise<void>;
}

export const useUserProjects = (): UseUserProjectsResult => {
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticationError, setIsAuthenticationError] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchProjects = useCallback(async () => {
    // Don't fetch if auth is still loading or user is not authenticated
    if (authLoading || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsAuthenticationError(false);
      const projectsData = await dashboardApiService.getUserProjects();
      setProjects(projectsData);
    } catch (err) {
      console.error('Failed to fetch user projects:', err);

      // Check if it's an authentication error
      const isAuthError = err instanceof Error && err.message === 'AUTHENTICATION_FAILED';
      setIsAuthenticationError(isAuthError);

      setError(err instanceof Error ? err.message : 'Failed to fetch user projects');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    isAuthenticationError,
    refetch: fetchProjects,
  };
};