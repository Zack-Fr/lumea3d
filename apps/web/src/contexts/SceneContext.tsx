import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { SceneManifestV2 } from '../services/scenesApi';
import { useSceneCategories } from '../hooks/scenes/useSceneQuery';
import { useSceneManifestStaged } from '../hooks/scenes/useSceneManifestStaged';
import { useAuth } from '../providers/AuthProvider';

// Helper function to calculate performance score
const calculatePerformanceScore = (metrics: { totalLoadTime: number; categoryCount: number }): 'excellent' | 'good' | 'fair' | 'poor' => {
  const avgTimePerCategory = metrics.totalLoadTime / (metrics.categoryCount || 1);
  
  if (avgTimePerCategory < 100) return 'excellent';
  if (avgTimePerCategory < 300) return 'good';
  if (avgTimePerCategory < 800) return 'fair';
  return 'poor';
};

// Simple loading state for the context
export interface SceneLoadingState {
  stage: string;
  progress: number;
  loadedCategories: string[];
  availableCategories: string[];
  isComplete: boolean;
  hasError: boolean;
}

// Scene Context Types
export interface SceneContextState {
  // Current scene
  sceneId: string | null;
  projectId: string | null;
  
  // Scene data
  manifest: SceneManifestV2 | null;
  categories: string[];
  
  // Loading state
  loading: SceneLoadingState;
  isLoading: boolean;
  error: string | null;
  
  // Performance metrics
  metrics: {
    stageTimings: Record<string, number>;
    totalLoadTime: number;
    categoryCount: number;
    itemCount: number;
    performanceScore: 'excellent' | 'good' | 'fair' | 'poor';
  } | null;
  
  // Category filtering
  enabledCategories: string[];
  priorityCategories: string[];
  
  // Scene actions
  setScene: (projectId: string, sceneId: string) => void;
  clearScene: () => void;
  toggleCategory: (categoryId: string) => void;
  setPriorityCategories: (categories: string[]) => void;
  refreshScene: () => void;
  updateManifest: (newManifest: SceneManifestV2 | null, newMetrics?: any, newError?: string | null) => void;
}

// Scene Context
const SceneContext = createContext<SceneContextState | null>(null);

// Scene Provider Props
interface SceneProviderProps {
  children: ReactNode;
  defaultSceneId?: string;
  defaultProjectId?: string;
}

export const SceneProvider: React.FC<SceneProviderProps> = ({
  children,
  defaultSceneId,
  defaultProjectId
}) => {
  const { token, user } = useAuth();
  
  // Scene state
  const [sceneId, setSceneId] = useState<string | null>(defaultSceneId || null);
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId || null);
  const [enabledCategories, setEnabledCategories] = useState<string[]>([]);
  const [priorityCategories, setPriorityCategoriesState] = useState<string[]>([
    'shell', 'lighting', 'environment'
  ]);

  // Add state for manifest data
  const [manifest, setManifest] = useState<SceneManifestV2 | null>(null);
  const [loading, setLoading] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [sceneMetrics, setSceneMetrics] = useState(null);

  // Add method to update manifest
  const updateManifest = useCallback((newManifest: SceneManifestV2 | null, newMetrics?: any, newError?: string | null) => {
    setManifest(newManifest);
    if (newMetrics !== undefined) {
      setSceneMetrics(newMetrics);
    }
    if (newError !== undefined) {
      setSceneError(newError);
    }
    setLoading(false);
  }, []);

  // Log authentication status for debugging
  console.log('🔐 SceneProvider Auth Status:', {
    hasToken: !!token,
    hasUser: !!user,
    sceneId,
    projectId,
    mode: sceneId ? 'SCENE_MODE' : projectId ? 'PROJECT_MODE' : 'NO_MODE'
  });

  // Scene manifest loading - use the staged loader for progressive loading
  const {
    manifest: loadedManifest,
    isLoading: manifestLoading,
    error: manifestError,
    refresh: refreshManifest
  } = useSceneManifestStaged(sceneId || '', {
    enabled: !!sceneId && !!token && !!user,
    priorityCategories,
    onStageComplete: (stageName: string, manifest: SceneManifestV2) => {
      console.log(`Scene stage completed: ${stageName}`, manifest?.items?.length || 0, 'items');
    },
    onComplete: (manifest: SceneManifestV2) => {
      console.log('Scene loading complete:', manifest?.items?.length || 0, 'items');
      updateManifest(manifest, null, null);
    },
    onError: (err: Error) => {
      console.error('Scene loading error:', err);
      const errorMessage = err?.message || String(err);
      updateManifest(null, null, errorMessage);
    },
  });

  // Update manifest when loaded
  useEffect(() => {
    if (loadedManifest) {
      updateManifest(loadedManifest, null, null);
    }
  }, [loadedManifest, updateManifest]);

  // Scene categories - only load if we have a sceneId
  const { 
    data: allCategories = [],
    isLoading: categoriesLoading 
  } = useSceneCategories(sceneId || '', {
    enabled: !!sceneId && !!token && !!user // Only load if we have a sceneId
  });

  console.log('🎯 SceneContext: Categories data', {
    sceneId,
    allCategoriesCount: allCategories.length,
    allCategories: allCategories,
    categoriesLoading
  });

  // Scene actions
  const setScene = useCallback((newProjectId: string, newSceneId: string) => {
    console.log('🎯 setScene called with:', { projectId: newProjectId, sceneId: newSceneId });
    setProjectId(newProjectId);
    setSceneId(newSceneId);
    
    // Reset enabled categories when changing scenes
    setEnabledCategories([]);
  }, []);

  const clearScene = useCallback(() => {
    console.log('Clearing scene');
    setProjectId(null);
    setSceneId(null);
    setEnabledCategories([]);
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    setEnabledCategories(prev => {
      const isEnabled = prev.includes(categoryId);
      const newCategories = isEnabled 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      
      console.log(`Category ${categoryId} ${isEnabled ? 'disabled' : 'enabled'}`, newCategories);
      return newCategories;
    });
  }, []);

  const setPriorityCategories = useCallback((categories: string[]) => {
    console.log('Priority categories updated:', categories);
    setPriorityCategoriesState(categories);
  }, []);

  const refreshScene = useCallback(() => {
    console.log('Refreshing scene');
    if (refreshManifest) {
      refreshManifest();
    }
  }, [refreshManifest]);

  // Create loading state
  const sceneLoadingState: SceneLoadingState = {
    stage: 'complete', // Default to complete since StagedSceneLoader handles loading
    progress: 1,
    loadedCategories: manifest ? Object.keys(manifest.categories || {}) : [],
    availableCategories: allCategories,
    isComplete: !!manifest,
    hasError: !!sceneError || !!manifestError
  };

  // Context value
  const contextValue: SceneContextState = {
    // Current scene
    sceneId,
    projectId,
    
    // Scene data
    manifest,
    categories: allCategories,
    
    // Loading state
    loading: sceneLoadingState,
    isLoading: loading || categoriesLoading || manifestLoading,
    error: sceneError || manifestError,
    
    // Performance metrics
    metrics: sceneMetrics && typeof sceneMetrics === 'object' ? {
      ...(sceneMetrics as any),
      performanceScore: calculatePerformanceScore(sceneMetrics as any)
    } : null,
    
    // Category filtering
    enabledCategories,
    priorityCategories,
    
    // Scene actions
    setScene,
    clearScene,
    toggleCategory,
    setPriorityCategories,
    refreshScene,
    updateManifest
  };

  return (
    <SceneContext.Provider value={contextValue}>
      {children}
    </SceneContext.Provider>
  );
};

// Scene Context Hook
export const useSceneContext = (): SceneContextState => {
  const context = useContext(SceneContext);
  
  if (!context) {
    throw new Error('useSceneContext must be used within a SceneProvider');
  }
  
  return context;
};

// Hook for scene ID extraction from URL params
export const useSceneParams = () => {
  // This would typically use useParams from react-router-dom
  // For now, we'll create a simple version
  const extractSceneParams = useCallback(() => {
    const path = window.location.pathname;

    console.log('🔍 useSceneParams: Parsing URL path:', path);

    // Match /app/projects/:projectId/scenes/:sceneId/editor
    const sceneEditorMatch = path.match(/\/app\/projects\/([^/]+)\/scenes\/([^/]+)\/editor/);
    if (sceneEditorMatch) {
      const projectId = decodeURIComponent(sceneEditorMatch[1]);
      const sceneId = decodeURIComponent(sceneEditorMatch[2]);
      console.log('✅ useSceneParams: Found scene editor URL:', { projectId, sceneId });
      return {
        projectId,
        sceneId
      };
    }

    // Match /app/projects/:projectId/scenes/:sceneId
    const sceneMatch = path.match(/\/app\/projects\/([^/]+)\/scenes\/([^/]+)$/);
    if (sceneMatch) {
      const projectId = decodeURIComponent(sceneMatch[1]);
      const sceneId = decodeURIComponent(sceneMatch[2]);
      console.log('✅ useSceneParams: Found scene URL:', { projectId, sceneId });
      return {
        projectId,
        sceneId
      };
    }

    // Match /app/projects/:id (this is a project, not a scene)
    const projectMatch = path.match(/\/app\/projects\/([^/]+)$/);
    if (projectMatch) {
      const projectId = decodeURIComponent(projectMatch[1]);
      console.log('📁 useSceneParams: Found project URL (no scene):', { projectId, sceneId: null });
      return {
        projectId,
        sceneId: null  // Don't set sceneId for project URLs
      };
    }

    // No scene ID found in URL
    console.log('❌ useSceneParams: No scene/project found in URL path:', path);
    return { projectId: null, sceneId: null };
  }, []);

  return extractSceneParams();
};