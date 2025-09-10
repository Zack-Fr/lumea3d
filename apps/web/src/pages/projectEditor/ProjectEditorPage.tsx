import React, { useCallback, useState, useEffect } from 'react';
import { once as logOnce, log } from '../../utils/logger';
import { useNavigate } from 'react-router-dom';
import styles from './ProjectEditor.module.css';

// Custom Hooks
import { useViewportControls } from '../../hooks/projectEditor/useViewportControls';
import { useGamificationSystem } from '../../hooks/projectEditor/useGamificationSystem';
import { useAssetManagement } from '../../hooks/projectEditor/useAssetManagement';
import { useProjectEditorSettings } from '../../hooks/projectEditor/useProjectEditorSettings';

// Atomic Components
import TopBar from '../../components/projectEditor/TopBar';
import LeftSidebar from '../../components/projectEditor/LeftSidebar';
import ViewportCanvas from '../../components/projectEditor/ViewportCanvas';
import ViewportTools from '../../components/projectEditor/ViewportTools';
import ViewportSettings from '../../components/projectEditor/ViewportSettings';
import PropertiesPanel from '../../components/projectEditor/PropertiesPanel';
import GamificationOverlay from '../../components/projectEditor/GamificationOverlay';
import Achievement from '../../components/projectEditor/Achievement';

// Asset Import Components
import { AssetImportModal } from '../../features/scenes/AssetImportModal';

// Scene Context
import { SceneProvider, useSceneContext, useSceneParams } from '../../contexts/SceneContext';

// Services
import { scenesApi, SceneItemCreateRequest } from '../../services/scenesApi';

// Data Layer (fallback for when no scene is loaded)
import { assetCategories } from '../../data/projectEditorData';

const ProjectEditorPage: React.FC = () => {
  // Extract scene parameters from URL
  const { projectId, sceneId } = useSceneParams();

  // Informational load log (logged once)
  logOnce('projecteditor:loaded', 'info', 'ProjectEditorPage loaded (logged once)');
  log('debug', 'ProjectEditorPage params', { projectId, sceneId });

  return (
    <SceneProvider 
      defaultProjectId={projectId || undefined} 
      defaultSceneId={sceneId || undefined}
    >
      <ProjectEditorContent />
    </SceneProvider>
  );
};

const ProjectEditorContent: React.FC = () => {
  const navigate = useNavigate();
  const { projectId: urlProjectId, sceneId: urlSceneId } = useSceneParams();
  const { 
    setScene, 
    sceneId: contextSceneId, 
    projectId: contextProjectId, 
    refreshScene,
    manifest
  } = useSceneContext();
  
  // Load scene when URL parameters change
  useEffect(() => {
    if (urlProjectId && urlSceneId && (urlProjectId !== contextProjectId || urlSceneId !== contextSceneId)) {
      log('info', 'ProjectEditor: Loading scene from URL', { urlProjectId, urlSceneId });
      setScene(urlProjectId, urlSceneId);
    } else if (urlProjectId && !urlSceneId && !contextSceneId) {
      // If we have a projectId but no sceneId, try to load the most recent scene
      log('info', 'ProjectEditor: No sceneId in URL, attempting to load most recent scene', { urlProjectId });
      loadMostRecentScene(urlProjectId);
    }
  }, [urlProjectId, urlSceneId, contextProjectId, contextSceneId, setScene]);

  // Function to load the most recent scene for a project
  const loadMostRecentScene = useCallback(async (projectId: string) => {
    try {
      log('info', 'ProjectEditor: Fetching scenes for project', projectId);
      const scenes = await scenesApi.getScenes(projectId);
      
      if (scenes && scenes.length > 0) {
        // Sort scenes by creation date (assuming newer scenes have higher IDs or we can sort by createdAt)
        const mostRecentScene = scenes[scenes.length - 1]; // Get the last scene (assuming it's the most recent)
        log('info', 'ProjectEditor: Loading most recent scene', { sceneId: mostRecentScene.id, sceneName: mostRecentScene.name });
        
        // Navigate to the scene URL to update the browser URL
        navigate(`/app/projects/${projectId}/scenes/${mostRecentScene.id}/editor`, { replace: true });
        
        // Set the scene in context
        setScene(projectId, mostRecentScene.id);
      } else {
        log('warn', 'ProjectEditor: No scenes found for project, user needs to create one', projectId);
        // Could show a message or redirect to create scene
      }
    } catch (error) {
      log('error', 'ProjectEditor: Failed to load most recent scene', error);
    }
  }, [navigate, setScene]);

  // Asset Import Modal State
  const [isAssetImportModalOpen, setIsAssetImportModalOpen] = useState(false);

  // Custom Hooks
  const {
    isWASDActive,
    cameraMode,
    setCameraMode,
    movement,
    viewportRef,
    handleViewportClick
  } = useViewportControls();

  const {
    gamificationData,
    showGamification,
    setShowGamification,
    showAchievement,
    achievementMessage,
    triggerAchievement
  } = useGamificationSystem();

  const {
    selectedTool,
    setSelectedTool,
    selectedAsset,
    setSelectedAsset
  } = useAssetManagement(assetCategories);

  const {
    showProperties,
    setShowProperties,
    soundEnabled,
    setSoundEnabled,
    lightingMode,
    setLightingMode
  } = useProjectEditorSettings();

  // Navigation callback
  const handleNavigate = useCallback((page: string) => {
    if (page === 'dashboard') {
      navigate('/app/dashboard');
    }
  }, [navigate]);

  // Camera mode change callback
  const handleCameraModeChange = useCallback((mode: string) => {
    setCameraMode(mode);
    triggerAchievement(`Camera switched to ${mode} mode!`);
  }, [setCameraMode, triggerAchievement]);

  // Sound toggle callback
  const handleSoundToggle = useCallback(() => {
    setSoundEnabled(!soundEnabled);
    triggerAchievement(soundEnabled ? 'Sound disabled' : 'Sound enabled');
  }, [soundEnabled, setSoundEnabled, triggerAchievement]);

  // Lighting mode toggle callback
  const handleLightingModeToggle = useCallback(() => {
    const newMode = lightingMode === 'day' ? 'night' : 'day';
    setLightingMode(newMode);
    triggerAchievement(`Lighting changed to ${newMode} mode!`);
  }, [lightingMode, setLightingMode, triggerAchievement]);

  // Properties toggle callback
  const handlePropertiesToggle = useCallback(() => {
    setShowProperties(!showProperties);
  }, [showProperties, setShowProperties]);

  // AI Assist callback
  const handleAIAssist = useCallback(() => {
    setShowGamification(true);
    triggerAchievement('🤖 AI Assistant activated!');
  }, [setShowGamification, triggerAchievement]);

  // Asset selection callback
  const handleAssetSelect = useCallback((assetId: number) => {
    setSelectedAsset(assetId);
    triggerAchievement('✨ +15 XP - Asset selected!');
  }, [setSelectedAsset, triggerAchievement]);

  // Asset add callback
  const handleAssetAdd = useCallback((assetName: string) => {
    triggerAchievement(`✨ +15 XP - Added ${assetName} to scene!`);
  }, [triggerAchievement]);

  // Asset import callback
  const handleImportAsset = useCallback(() => {
    setIsAssetImportModalOpen(true);
  }, []);

  const handleAssetImportComplete = useCallback(async (assetId: string, assetName: string, category: string) => {
    logOnce('projecteditor:asset-imported', 'info', '✅ ProjectEditor: Asset imported');
    log('debug', 'ProjectEditor: Asset imported id', assetId);
    triggerAchievement('🎯 +20 XP - New 3D asset imported!');

    // Add the imported asset to the current scene if we have a sceneId
    if (contextSceneId && contextProjectId) {
      try {
        log('info', 'ProjectEditor: Adding imported asset to scene', { sceneId: contextSceneId, assetId, assetName, category });

        // Use provided name/category from import modal, or fallbacks if undefined
        const finalAssetName = assetName || 'Imported Asset';
        const finalCategory = category || 'misc';

        // Create scene item with default transform using backend DTO format
        // Use the category directly since we can't create project categories via API
        const sceneItem: SceneItemCreateRequest = {
          categoryKey: finalCategory, // Use the category from the import form
          positionX: (Math.random() - 0.5) * 10, // Random position for demo
          positionY: 0,
          positionZ: (Math.random() - 0.5) * 10,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1,
          selectable: true,
          locked: false,
          meta: {
            assetName: finalAssetName,
            assetId: assetId,
            uploadedAt: new Date().toISOString(),
            isImported: true
          }
        };

        // Add item to scene
        log('info', 'ProjectEditor: Adding scene item', { sceneItem, sceneId: contextSceneId });
        const currentVersion = manifest?.scene?.version?.toString();
        await scenesApi.addItem(contextSceneId, sceneItem, currentVersion);

        log('info', 'ProjectEditor: Asset successfully added to scene');
        triggerAchievement(`✨ +15 XP - "${finalAssetName}" added to scene!`);

        // Refresh the scene manifest to show the new item
        // This will trigger a re-render of the LeftSidebar with the new asset
        refreshScene();

      } catch (error) {
        log('error', 'ProjectEditor: Failed to add asset to scene', error);
        // Still close the modal even if adding to scene fails
      }
    } else {
      log('warn', 'ProjectEditor: No sceneId or projectId available, asset not added to scene');
    }

    setIsAssetImportModalOpen(false);
  }, [contextSceneId, contextProjectId, triggerAchievement, refreshScene, manifest]);

  // Viewport click callback with achievement
  const handleViewportClickWithAchievement = useCallback(() => {
    handleViewportClick();
    if (!isWASDActive) {
      triggerAchievement('🎮 Viewport Activated! Use WASD to navigate');
    }
  }, [handleViewportClick, isWASDActive, triggerAchievement]);

  // Asset drop handler for drag and drop from sidebar
  const handleAssetDrop = useCallback(async (dragData: any, position: { x: number; y: number }) => {
    if (!contextSceneId || !dragData.item) {
      console.warn('ProjectEditor: Cannot drop asset - missing scene or item data');
      return;
    }

    try {
      log('info', 'ProjectEditor: Dropping asset into scene', { dragData, position, sceneId: contextSceneId });
      
      // Create a duplicate of the item with a new position
      const droppedItem: SceneItemCreateRequest = {
        categoryKey: dragData.categoryName || dragData.item.category || 'misc',
        positionX: (Math.random() - 0.5) * 10, // Random position near drop point
        positionY: 0,
        positionZ: (Math.random() - 0.5) * 10,
        rotationX: 0,
        rotationY: Math.random() * 360, // Random rotation for variety
        rotationZ: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        selectable: true,
        locked: false,
        meta: {
          ...dragData.item.meta,
          droppedAt: new Date().toISOString(),
          dropPosition: position
        }
      };

      // Add the dropped item to the scene
      const currentVersion = manifest?.scene?.version?.toString();
      await scenesApi.addItem(contextSceneId, droppedItem, currentVersion);

      log('info', 'ProjectEditor: Asset successfully dropped into scene');
      triggerAchievement(`✨ +10 XP - Asset placed in scene!`);

      // Refresh the scene to show the new item
      refreshScene();

    } catch (error) {
      log('error', 'ProjectEditor: Failed to drop asset into scene', error);
      triggerAchievement(`❌ Failed to place asset`);
    }
  }, [contextSceneId, manifest, scenesApi, refreshScene, triggerAchievement]);

  return (
    <div className={styles.projectEditorRoot}>
      {/* Achievement Notification */}
      {showAchievement && (
        <Achievement 
          message={achievementMessage}
          show={showAchievement}
        />
      )}

      {/* Gamification Overlay */}
      {showGamification && (
        <GamificationOverlay
          gamificationData={gamificationData}
          show={showGamification}
          onClose={() => setShowGamification(false)}
        />
      )}

      {/* Top Bar */}
      <TopBar
        onNavigate={handleNavigate}
        cameraMode={cameraMode}
        onCameraModeChange={handleCameraModeChange}
        soundEnabled={soundEnabled}
        onSoundToggle={handleSoundToggle}
        lightingMode={lightingMode}
        onLightingModeToggle={handleLightingModeToggle}
        showProperties={showProperties}
        onPropertiesToggle={handlePropertiesToggle}
        onAIAssist={handleAIAssist}
      />

      {/* Main Layout */}
      <div className={styles.projectEditorLayout}>
        {/* Left Sidebar */}
        <LeftSidebar
          assetCategories={assetCategories}
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          selectedAsset={selectedAsset}
          onAssetSelect={handleAssetSelect}
          onAssetAdd={handleAssetAdd}
          onImportAsset={handleImportAsset}
        />

        {/* Main Viewport Area */}
        <main className={styles.mainViewportArea}>
          {/* Viewport Canvas */}
          <ViewportCanvas
            viewportRef={viewportRef}
            isWASDActive={isWASDActive}
            movement={movement}
            onViewportClick={handleViewportClickWithAchievement}
            cameraMode={cameraMode}
            onAssetDrop={handleAssetDrop}
          />

          {/* Viewport Tools */}
          <ViewportTools />

          {/* Viewport Settings */}
          <ViewportSettings
            cameraMode={cameraMode}
            renderMode="realistic"
          />
        </main>

        {/* Right Properties Panel */}
        {showProperties && (
          <PropertiesPanel
            show={showProperties}
            onClose={() => setShowProperties(false)}
          />
        )}
      </div>

      {/* Asset Import Modal */}
      <AssetImportModal
        isOpen={isAssetImportModalOpen}
        onClose={() => setIsAssetImportModalOpen(false)}
        onImportComplete={handleAssetImportComplete}
      />
    </div>
  );
};

export default ProjectEditorPage;
