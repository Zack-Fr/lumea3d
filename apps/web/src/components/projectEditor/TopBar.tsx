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
  Save,
  Users,
  PanelLeft
} from "lucide-react";
import { useSceneContext } from '../../contexts/SceneContext';
import { useScenes } from '../../hooks/scenes/useSceneQuery';
import { useScenesList } from '../../hooks/scenes/useScenesList';
import { useAuth } from '../../providers/AuthProvider';
import { useSaveQueueStore } from '../../stores/saveQueueStore';
import { useInvitations } from '../../hooks/useInvitations';
import { captureAndUploadScreenshot } from '../../utils/canvasScreenshot';
import CreateSceneModal from '../ui/CreateSceneModal';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';
import { toast } from 'react-toastify';

interface TopBarProps {
  onNavigate: (page: string) => void;
  cameraMode: string;
  onCameraModeChange: (mode: string) => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  lightingMode: string;
  onLightingModeToggle: () => void;
  showLeftPanel: boolean;
  onLeftPanelToggle: () => void;
  showProperties: boolean;
  onPropertiesToggle: () => void;
  showCollaboration: boolean;
  onCollaborationToggle: () => void;
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
  showLeftPanel,
  onLeftPanelToggle,
//   showProperties,
  onPropertiesToggle,
  showCollaboration,
  onCollaborationToggle,
  onAIAssist
}) => {
  const navigate = useNavigate();
  const { sceneId, projectId } = useSceneContext();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const { saveState, createSnapshot, setSceneId, queue } = useSaveQueueStore();
  const { activeSessions, currentSession, receivedInvitations, sentInvitations } = useInvitations();
  const [showSceneSelector, setShowSceneSelector] = useState(false);
  const [showCreateSceneModal, setShowCreateSceneModal] = useState(false);
  const [isCreatingScene, setIsCreatingScene] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debug logging for auth state
  useEffect(() => {
    // Removed console.log for auth state
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
          const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://192.168.1.10:3000';
          const response = await fetch(`${apiBaseUrl}/scenes/${sceneId}/version`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const { version } = await response.json();
            setSceneId(sceneId, version);
            // Removed console.log for initialized save queue
          } else {
            // Removed console.warn for failed to fetch scene version
            setSceneId(sceneId, 1);
          }
        } catch (error) {
          // Removed console.error for error fetching scene version
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
    // Removed console.log for scene selection
    
    if (!projectId) {
      // Removed console.error for no projectId
      return;
    }
    
    // Navigate to the scene URL which will trigger the context update
    const sceneUrl = `/app/projects/${projectId}/scenes/${scene.id}/editor`;
    // Removed console.log for navigation
    
    navigate(sceneUrl);
    setShowSceneSelector(false);
  };

  const handleCreateScene = () => {
    if (!projectId) {
      toast.error('No project selected. Please select a project first.');
      return;
    }
    setShowCreateSceneModal(true);
  };

  const handleConfirmCreateScene = async (sceneName: string) => {
    if (!projectId) {
      toast.error('No project selected. Please select a project first.');
      return;
    }

    setIsCreatingScene(true);

    try {
      // Import scenesApi dynamically to avoid circular dependencies
      const { scenesApi } = await import('../../services/scenesApi');

      const newScene = await scenesApi.createScene({ 
        name: sceneName.trim(),
        projectId: projectId
      });
      
      toast.success('Scene created successfully', { autoClose: 3000 });
      
      // Navigate to the new scene URL
      if (newScene && newScene.id) {
        const newSceneUrl = `/app/projects/${projectId}/scenes/${newScene.id}/editor`;
        navigate(newSceneUrl);
      }
      
      setShowCreateSceneModal(false);
    } catch (error) {
      toast.error('Failed to create scene. Please try again.');
    } finally {
      setIsCreatingScene(false);
    }
  };

  const handleCancelCreateScene = () => {
    setShowCreateSceneModal(false);
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
          // Removed console.log for capturing canvas screenshot
          void await captureAndUploadScreenshot(projectId);
          // Removed console.log for canvas screenshot uploaded
        } catch (screenshotError) {
          // Removed console.warn for failed to capture screenshot
          // Continue with save even if screenshot fails
        }
      }
      
      // show a persistent toast while saving
      const savingToastId = toast.info('Saving scene...', { autoClose: false, closeButton: false });

      await createSnapshot(`Manual Save - ${timestamp}`);
      // Removed console.log for manual save completed

      // replace the saving toast with success
      toast.dismiss(savingToastId);
      toast.success('Scene saved', { autoClose: 2500 });
    } catch (error) {
      // Removed console.error for manual save failed
      // Removed console.error for auth token available
      toast.error('Save failed. Please try again.');
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
        {/* Dynamic Live Badge */}
        {currentSession ? (
          <Badge className={`${styles.liveBadge} bg-green-500 text-white animate-pulse`}>
            Live • {currentSession.participants.length} users
          </Badge>
        ) : (
          receivedInvitations.some(inv => inv.projectId === projectId && inv.status === 'pending') || 
          sentInvitations.some(inv => inv.projectId === projectId && inv.status === 'pending')
        ) ? (
          <Badge className={`${styles.liveBadge} bg-blue-500 text-white`}>
            Pending Invites
          </Badge>
        ) : activeSessions.length > 0 ? (
          <Badge className={`${styles.liveBadge} bg-orange-500 text-white`}>
            Active Sessions
          </Badge>
        ) : (
          <Badge className={`${styles.liveBadge} bg-gray-500 text-white`}>
            Offline
          </Badge>
        )}
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
            variant={showLeftPanel ? "default" : "ghost"}
            size="sm"
            onClick={onLeftPanelToggle}
            className={`${styles.controlButton} ${showLeftPanel ? 'bg-blue-500 text-white' : ''}`}
            title="Toggle Assets Panel"
          >
            <PanelLeft className="w-4 h-4" />
          </Button>

          <Button 
            variant={showCollaboration ? "default" : "ghost"}
            size="sm"
            onClick={onCollaborationToggle}
            className={`${styles.controlButton} ${showCollaboration ? 'bg-blue-500 text-white' : ''}`}
            title="Real-time Collaboration"
          >
            <Users className="w-4 h-4" />
          </Button>

          <Button 
            variant="ghost"
            size="sm"
            onClick={onPropertiesToggle}
            className={styles.controlButton}
            title="Properties Panel"
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
      
      {/* Create Scene Modal */}
      <CreateSceneModal
        isOpen={showCreateSceneModal}
        onClose={handleCancelCreateScene}
        onConfirm={handleConfirmCreateScene}
        isLoading={isCreatingScene}
      />
    </header>
  );
});

TopBar.displayName = 'TopBar';

export default TopBar;