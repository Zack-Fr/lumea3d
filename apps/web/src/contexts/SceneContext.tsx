import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SceneManifestV2 } from '../services/scenesApi';
import { useSceneManifestStaged } from '../hooks/scenes/useSceneManifestStaged';
import { useSceneCategories } from '../hooks/scenes/useSceneQuery';
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

  // Log authentication status for debugging
  console.log('🔐 SceneProvider Auth Status:', {
    hasToken: !!token,
    hasUser: !!user,
    sceneId,
    projectId
  });

  // Scene manifest staged loading
  const {
    manifest,
    stage,
    progress,
    isLoading,
    error,
    metrics,
    refresh: refreshManifest
  } = useSceneManifestStaged(sceneId || '', {
    enabled: !!sceneId && !!token, // Only enable when we have both sceneId and auth token
    priorityCategories,
    onStageComplete: (stageName, categories) => {
      console.log(`🎯 Scene stage completed: ${stageName}`, categories);
    },
    onComplete: (completeManifest) => {
      console.log('🎉 Scene loading complete:', completeManifest);
    },
    onError: (err) => {
      console.error('❌ Scene loading error:', err);
      const errorMessage = err?.message || String(err);
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        console.error('🔐 Authentication issue detected. Please check if user is logged in.');
      }
    }
  });

  // Scene categories
  const { 
    data: allCategories = [],
    isLoading: categoriesLoading 
  } = useSceneCategories(sceneId || '', {
    enabled: !!sceneId && !!token // Only enable when we have both sceneId and auth token
  });

  // Scene actions
  const setScene = useCallback((newProjectId: string, newSceneId: string) => {
    console.log('🎬 Loading scene:', { projectId: newProjectId, sceneId: newSceneId });
    setProjectId(newProjectId);
    setSceneId(newSceneId);
    
    // Reset enabled categories when changing scenes
    setEnabledCategories([]);
  }, []);

  const clearScene = useCallback(() => {
    console.log('🧹 Clearing scene');
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
      
      console.log(`🏷️ Category ${categoryId} ${isEnabled ? 'disabled' : 'enabled'}`, newCategories);
      return newCategories;
    });
  }, []);

  const setPriorityCategories = useCallback((categories: string[]) => {
    console.log('⚡ Priority categories updated:', categories);
    setPriorityCategoriesState(categories);
  }, []);

  const refreshScene = useCallback(() => {
    console.log('🔄 Refreshing scene');
    if (refreshManifest) {
      refreshManifest();
    }
  }, [refreshManifest]);

  // Create loading state
  const loading: SceneLoadingState = {
    stage,
    progress,
    loadedCategories: manifest ? Object.keys(manifest.categories || {}) : [],
    availableCategories: allCategories,
    isComplete: !isLoading && !!manifest,
    hasError: !!error
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
    loading,
    isLoading: isLoading || categoriesLoading,
    error,
    
    // Performance metrics
    metrics: metrics ? {
      ...metrics,
      performanceScore: calculatePerformanceScore(metrics)
    } : null,
    
    // Category filtering
    enabledCategories,
    priorityCategories,
    
    // Scene actions
    setScene,
    clearScene,
    toggleCategory,
    setPriorityCategories,
    refreshScene
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
    
    // Match /app/projects/:projectId/scenes/:sceneId/editor
    const sceneEditorMatch = path.match(/\/app\/projects\/([^/]+)\/scenes\/([^/]+)\/editor/);
    if (sceneEditorMatch) {
      return {
        projectId: decodeURIComponent(sceneEditorMatch[1]),
        sceneId: decodeURIComponent(sceneEditorMatch[2])
      };
    }
    
    // Match /app/projects/:id (could be project or scene)
    const projectMatch = path.match(/\/app\/projects\/([^/]+)$/);
    if (projectMatch) {
      const id = decodeURIComponent(projectMatch[1]);
      // For now, treat as sceneId - in real app this would be projectId
      return {
        projectId: id,
        sceneId: id
      };
    }
    
    return { projectId: null, sceneId: null };
  }, []);

  return extractSceneParams();
};