import React, { useState, useRef, useEffect } from 'react';
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
  Plus
} from "lucide-react";
import { useSceneContext } from '../../contexts/SceneContext';
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
  const { sceneId, setScene, projectId } = useSceneContext();
  const [showSceneSelector, setShowSceneSelector] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Mock scene list - in real app this would come from an API
  const availableScenes = [
    { id: 'living-room-modern', name: 'Living Room (Modern)', projectId: 'project-1' },
    { id: 'bedroom-cozy', name: 'Bedroom (Cozy)', projectId: 'project-1' },
    { id: 'kitchen-industrial', name: 'Kitchen (Industrial)', projectId: 'project-2' },
    { id: 'office-minimal', name: 'Office (Minimal)', projectId: 'project-2' }
  ];

  const currentScene = availableScenes.find(scene => scene.id === sceneId);

  const handleSceneSelect = (scene: typeof availableScenes[0]) => {
    setScene(scene.projectId, scene.id);
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
      
      // Navigate to the new scene
      if (newScene && newScene.id) {
        setScene(projectId, newScene.id);
      }
    } catch (error) {
      console.error('❌ Failed to create scene:', error);
      alert('Failed to create scene. Please try again.');
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
              {currentScene ? currentScene.name : sceneId || 'Select Scene'}
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
              {availableScenes.map((scene) => (
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
                >
                  {scene.name}
                </button>
              ))}
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