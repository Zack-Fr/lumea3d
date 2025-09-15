import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "../ui/Button";
import { Separator } from "../ui/Separator";
import { Badge } from "../ui/Badge";
import { 
  ArrowLeft,
  Eye,
  Gamepad2,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Settings,
  Sparkles,
  ChevronDown,
  Folder,
  Plus,
  Save
} from "lucide-react";
import { useSceneContext } from '../../contexts/SceneContext';
import { useScenes } from '../../hooks/scenes/useSceneQuery';
import { useScenesList } from '../../hooks/scenes/useScenesList';
import { useAuth } from '../../providers/AuthProvider';
import { useSaveQueueStore } from '../../stores/saveQueueStore';
import { captureAndUploadScreenshot } from '../../utils/canvasScreenshot';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface TopBarProps {
  onNavigate: (page: string) => void;
  cameraMode: string;
  onCameraModeChange: (mode: string) => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  lightingMode: string;
  onLightingModeToggle: () => void;
  showProperties: boolean;
  onPropertiesToggle: () => void;
  onAIAssist: () => void;
}

const TopBar: React.FC<TopBarProps> = React.memo(({
  onNavigate,
  cameraMode,
  onCameraModeChange,
  soundEnabled,
  onSoundToggle,
  lightingMode,
  onLightingModeToggle,
//   showProperties,
  onPropertiesToggle,
  onAIAssist
}) => {
  const navigate = useNavigate();
  const { sceneId, projectId } = useSceneContext();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const { saveState, createSnapshot, setSceneId, queue } = useSaveQueueStore();
  const [showSceneSelector, setShowSceneSelector] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debug logging for auth state
  useEffect(() => {
    console.log('🔐 TopBar auth state:', {
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'NULL',
      isAuthenticated,
      authLoading,
      projectId,
      sceneId
    });
  }, [token, isAuthenticated, authLoading, projectId, sceneId]);

  // Initialize save queue with scene ID and fetch current version
  useEffect(() => {
    const initializeSaveQueue = async () => {
      if (sceneId) {
        try {
          // Store current auth token for the save queue to use
          if (token) {
            localStorage.setItem('authToken', token);
          }
          
          // Fetch current scene version
          const response = await fetch(`http://localhost:3001/scenes/${sceneId}/version`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const { version } = await response.json();
            setSceneId(sceneId, version);
            console.log(`🔄 Initialized save queue with scene version: ${version}`);
          } else {
            console.warn(`⚠️ Failed to fetch scene version, using default version 1`);
            setSceneId(sceneId, 1);
          }
        } catch (error) {
          console.error(`❌ Error fetching scene version:`, error);
          setSceneId(sceneId, 1);
        }
      }
    };
    
    initializeSaveQueue();
  }, [sceneId, setSceneId, token]);

  // Fetch scenes for the current project
  const { data: availableScenes = [], isLoading: scenesLoading, error: scenesError } = useScenes(projectId || '', {
    enabled: !!projectId
  });
  
  // Fallback scene list if primary scenes query fails
  const { scenes: fallbackScenes = [], isLoading: fallbackLoading, error: fallbackError } = useScenesList({
    enabled: !!projectId && (!!scenesError || availableScenes.length === 0),
    projectId: projectId || undefined
  });
  
  // Use primary scenes if available, otherwise use fallback
  const finalScenes = availableScenes.length > 0 ? availableScenes : fallbackScenes;
  const finalLoading = scenesLoading || fallbackLoading;
  const finalError = scenesError && fallbackError;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSceneSelector(false);
      }
    };

    if (showSceneSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSceneSelector]);

  const currentScene = finalScenes.find(scene => scene.id === sceneId);

  const handleSceneSelect = (scene: any) => {
    console.log('🎯 TopBar: Scene selected:', { scene, projectId });
    
    if (!projectId) {
      console.error('❌ TopBar: No projectId available for scene selection');
      return;
    }
    
    // Navigate to the scene URL which will trigger the context update
    const sceneUrl = `/app/projects/${projectId}/scenes/${scene.id}/editor`;
    console.log('📦 TopBar: Navigating to:', sceneUrl);
    
    navigate(sceneUrl);
    setShowSceneSelector(false);
  };

  const handleCreateScene = async () => {
    if (!projectId) {
      console.error('❌ No project ID available for scene creation');
      alert('No project selected. Please select a project first.');
      return;
    }

    console.log('🎨 Creating scene in project:', projectId);

    try {
      // Import scenesApi dynamically to avoid circular dependencies
      const { scenesApi } = await import('../../services/scenesApi');
      
      const sceneName = prompt('Enter scene name:');
      if (!sceneName || !sceneName.trim()) {
        return;
      }

      console.log('🎨 Calling scenesApi.createScene with:', { 
        name: sceneName.trim(),
        projectId: projectId
      });

      const newScene = await scenesApi.createScene({ 
        name: sceneName.trim(),
        projectId: projectId
      });
      
      console.log('✅ Scene created successfully:', newScene);
      
      // Navigate to the new scene URL
      if (newScene && newScene.id) {
        const newSceneUrl = `/app/projects/${projectId}/scenes/${newScene.id}/editor`;
        console.log('🚀 TopBar: Navigating to new scene:', newSceneUrl);
        navigate(newSceneUrl);
      }
    } catch (error) {
      console.error('❌ Failed to create scene:', error);
      alert('Failed to create scene. Please try again.');
    }
  };

  const handleSave = async () => {
    try {
      // Store current auth token for the save queue to use
      if (token) {
        localStorage.setItem('authToken', token);
      }
      
      const timestamp = new Date().toLocaleString();
      
      // Capture and upload canvas screenshot as thumbnail
      if (projectId) {
        try {
          console.log('📷 Capturing canvas screenshot...');
          const result = await captureAndUploadScreenshot(projectId);
          console.log('📷 Canvas screenshot uploaded:', result.thumbnailUrl);
        } catch (screenshotError) {
          console.warn('⚠️ Failed to capture canvas screenshot:', screenshotError);
          // Continue with save even if screenshot fails
        }
      }
      
      await createSnapshot(`Manual Save - ${timestamp}`);
      console.log('💾 Manual save completed');
    } catch (error) {
      console.error('❌ Manual save failed:', error);
      console.error('Auth token available:', !!token);
      alert('Save failed. Please try again.');
    }
  };
  return (
    <header className={styles.topBar}>
      <div className={styles.topBarLeft}>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onNavigate("dashboard")}
          className={styles.backButton}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        <Separator orientation="vertical" className={styles.topBarSeparator} />
        
        {/* Scene Selector */}
        <div ref={dropdownRef} className={styles.sceneSelector} style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowSceneSelector(!showSceneSelector)}
              className={styles.sceneSelectorButton}
            >
              <Folder className="w-4 h-4 mr-2" />
              {finalLoading ? 'Loading...' : currentScene ? (currentScene.name || currentScene.id) : (sceneId || 'Select Scene')}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
            
            {/* Plus Button for Creating New Scene */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateScene}
              className={styles.sceneSelectorButton}
              style={{ padding: '0.5rem', minWidth: 'auto' }}
              title="Create New Scene"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {showSceneSelector && (
            <div className={styles.sceneSelectorDropdown} style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 50,
              minWidth: '200px',
              padding: '4px'
            }}>
              {finalLoading ? (
                <div style={{ padding: '8px 12px', color: 'var(--muted-foreground)', fontSize: '14px' }}>
                  Loading scenes...
                </div>
              ) : finalError ? (
                <div style={{ padding: '8px 12px', color: 'var(--destructive)', fontSize: '14px' }}>
                  Failed to load scenes
                </div>
              ) : finalScenes.length === 0 ? (
                <div style={{ padding: '8px 12px', color: 'var(--muted-foreground)', fontSize: '14px' }}>
                  No scenes found
                </div>
              ) : (
                finalScenes.map((scene) => (
                  <button
                    key={scene.id}
                    onClick={() => handleSceneSelect(scene)}
                    className={styles.sceneOption}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: scene.id === sceneId ? 'var(--accent)' : 'transparent',
                      color: scene.id === sceneId ? 'var(--accent-foreground)' : 'var(--foreground)',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    title={scene.description}
                  >
                    <div style={{ fontWeight: '500' }}>{scene.name || scene.id}</div>
                    {scene.description && (
                      <div style={{ 
                        fontSize: '12px', 
                        opacity: 0.7,
                        marginTop: '2px'
                      }}>
                        {scene.description.substring(0, 50)}...
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        
        <h1 className={styles.topBarTitle}>3D Scene Editor</h1>
        <Badge className={styles.liveBadge}>Live</Badge>
      </div>

      <div className={styles.topBarRight}>
        {/* Perspective Controls */}
        <div className={styles.cameraControls}>
          <Button 
            variant={cameraMode === "orbit" ? "default" : "ghost"} 
            size="sm"
            onClick={() => onCameraModeChange("orbit")}
            className={cameraMode === "orbit" ? styles.cameraButtonActive : styles.cameraButton}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button 
            variant={cameraMode === "fps" ? "default" : "ghost"} 
            size="sm"
            onClick={() => onCameraModeChange("fps")}
            className={cameraMode === "fps" ? styles.cameraButtonActive : styles.cameraButton}
          >
            <Gamepad2 className="w-4 h-4" />
          </Button>
        </div>

        <div className={styles.controlButtons}>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onSoundToggle}
            className={styles.controlButton}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onLightingModeToggle}
            className={styles.controlButton}
          >
            {lightingMode === "day" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Button 
            variant={queue.length > 0 ? "default" : "ghost"} 
            size="sm"
            onClick={handleSave}
            disabled={saveState.isSaving || !sceneId}
            className={`${styles.controlButton} ${queue.length > 0 ? 'bg-blue-500 text-white' : ''}`}
            title={`Save scene (${saveState.isSaving ? 'Saving...' : queue.length > 0 ? `${queue.length} unsaved changes` : 'All saved'})`}
          >
            <Save className={`w-4 h-4 ${saveState.isSaving ? 'animate-pulse' : queue.length > 0 ? 'animate-bounce' : ''}`} />
            {queue.length > 0 && (
              <span className="ml-1 text-xs">{queue.length}</span>
            )}
          </Button>

          <Button 
            variant="ghost"
            size="sm"
            onClick={onPropertiesToggle}
            className={styles.controlButton}
          >
            <Settings className="w-4 h-4" />
          </Button>

          <Button 
            size="sm"
            className={styles.aiAssistButton}
            onClick={onAIAssist}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Assist
          </Button>
        </div>
      </div>
    </header>
  );
});

TopBar.displayName = 'TopBar';

export default TopBar;