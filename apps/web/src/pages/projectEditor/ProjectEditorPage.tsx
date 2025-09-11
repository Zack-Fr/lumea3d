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
import TabbedLeftPanel from '../../components/projectEditor/TabbedLeftPanel';
import TabbedRightPanel from '../../components/projectEditor/TabbedRightPanel';
import ViewportCanvas from '../../components/projectEditor/ViewportCanvas';
import ViewportTools from '../../components/projectEditor/ViewportTools';
import ViewportSettings from '../../components/projectEditor/ViewportSettings';
import GamificationOverlay from '../../components/projectEditor/GamificationOverlay';
import Achievement from '../../components/projectEditor/Achievement';

// Asset Import Components
import { AssetImportModal } from '../../features/scenes/AssetImportModal';

// Scene Context
import { SceneProvider, useSceneContext, useSceneParams } from '../../contexts/SceneContext';

// Auth Context
import { useAuth } from '../../providers/AuthProvider';

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
  const { token } = useAuth();
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

  // Selection state for properties panel
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Camera controls state
  const [cameraMinDistance, setCameraMinDistance] = useState(0.1);
  const [cameraMaxDistance, setCameraMaxDistance] = useState(500);
  const [cameraMoveSpeed, setCameraMoveSpeed] = useState(5);
  const [enablePan, setEnablePan] = useState(true);
  const [enableZoom, setEnableZoom] = useState(true);
  const [enableRotate, setEnableRotate] = useState(true);
  
  // Clipping plane state
  const [cameraNearClip, setCameraNearClip] = useState(0.1);
  const [cameraFarClip, setCameraFarClip] = useState(1000);

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
        const rawCategory = category || 'imported_assets';
        
        // Normalize the category key to match backend validation (lowercase, alphanumeric + underscores only)
        const normalizedCategory = rawCategory.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 50);
        
        log('debug', 'ProjectEditor: Normalized import category', { rawCategory, normalizedCategory });

        // STEP 1: Create ProjectCategory3D entry first (required by backend)
        try {
          log('info', 'ProjectEditor: Creating project category', { projectId: contextProjectId, assetId, categoryKey: normalizedCategory });
          
          const API_BASE_URL = import.meta.env.VITE_API_URL || '';
          const categoryResponse = await fetch(`${API_BASE_URL}/projects/${contextProjectId}/categories`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token || ''}`,
            },
            body: JSON.stringify({
              assetId: assetId,
              categoryKey: normalizedCategory,
              draco: true,
              meshopt: true,
              ktx2: true,
            }),
          });

          if (!categoryResponse.ok) {
            const errorText = await categoryResponse.text();
            if (categoryResponse.status === 409) {
              log('info', 'ProjectEditor: Category already exists, proceeding with scene item creation');
            } else {
              throw new Error(`Failed to create project category: ${categoryResponse.status} - ${errorText}`);
            }
          } else {
            log('info', 'ProjectEditor: Project category created successfully');
          }
        } catch (categoryError) {
          log('error', 'ProjectEditor: Failed to create project category', categoryError);
          // Continue anyway - the category might already exist
        }

        // STEP 2: Create scene item with default transform using backend DTO format
        // Use the normalized category key to ensure backend validation passes
        const sceneItem: SceneItemCreateRequest = {
          categoryKey: normalizedCategory,
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

  // Camera controls handlers
  const handleZoomLimitsChange = useCallback((min: number, max: number) => {
    setCameraMinDistance(min);
    setCameraMaxDistance(max);
  }, []);

  const handleMoveSpeedChange = useCallback((speed: number) => {
    setCameraMoveSpeed(speed);
  }, []);

  const handleCameraPreset = useCallback((preset: string) => {
    // TODO: Implement camera presets using SmoothCameraTransitions
    console.log('Camera preset activated:', preset);
    triggerAchievement(`🎥 Camera preset: ${preset}`);
  }, [triggerAchievement]);

  const handleControlsToggle = useCallback((control: string, enabled: boolean) => {
    switch (control) {
      case 'pan':
        setEnablePan(enabled);
        break;
      case 'zoom':
        setEnableZoom(enabled);
        break;
      case 'rotate':
        setEnableRotate(enabled);
        break;
    }
    triggerAchievement(`🎮 ${control} ${enabled ? 'enabled' : 'disabled'}`);
  }, [triggerAchievement]);
  
  // Clipping plane change callback
  const handleClippingChange = useCallback((near: number, far: number) => {
    setCameraNearClip(near);
    setCameraFarClip(far);
    triggerAchievement(`🎥 Clipping planes: ${near.toFixed(3)} - ${far.toFixed(0)}`);
  }, [triggerAchievement]);

  // Asset drop handler for drag and drop from sidebar
  const handleAssetDrop = useCallback(async (dragData: any, position: { x: number; y: number }) => {
    if (!contextSceneId || !dragData.item) {
      console.warn('ProjectEditor: Cannot drop asset - missing scene or item data');
      return;
    }

    try {
      log('info', 'ProjectEditor: Dropping asset into scene', { dragData, position, sceneId: contextSceneId });
      
      // Normalize the category key to match backend validation requirements
      const rawCategory = dragData.categoryName || dragData.item.category || 'misc';
      const normalizedCategoryKey = typeof rawCategory === 'string' 
        ? rawCategory.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 50) 
        : 'misc';
      
      log('debug', 'ProjectEditor: Normalized category key', { rawCategory, normalizedCategoryKey });
      
      // Ensure project category exists before adding scene item (this is required for existing items)
      // Note: For existing items from manifest, the category should already exist
      // But we'll check anyway to provide better error handling
      if (!contextProjectId) {
        throw new Error('No project context available for drag and drop');
      }
      
      // Create a duplicate of the item with a new position
      const droppedItem: SceneItemCreateRequest = {
        categoryKey: normalizedCategoryKey,
        positionX: (Math.random() - 0.5) * 10, // Random position near drop point
        positionY: 0,
        positionZ: (Math.random() - 0.5) * 10,
        rotationX: 0,
        rotationY: (Math.random() - 0.5) * 360, // Random rotation between -180 and 180
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
        {/* Left Assets Panel */}
        <TabbedLeftPanel
          // Asset props
          assetCategories={assetCategories}
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          selectedAsset={selectedAsset}
          onAssetSelect={handleAssetSelect}
          onAssetAdd={handleAssetAdd}
          onImportAsset={handleImportAsset}
          
          // Properties panel props (not used but kept for compatibility)
          selectedItemId={selectedItemId}
          onItemSelect={setSelectedItemId}
          showProperties={showProperties}
          onPropertiesClose={() => setShowProperties(false)}
          
          // Camera controls props (not used but kept for compatibility)
          cameraMode={cameraMode}
          onCameraModeChange={handleCameraModeChange}
          minDistance={cameraMinDistance}
          maxDistance={cameraMaxDistance}
          moveSpeed={cameraMoveSpeed}
          onZoomLimitsChange={handleZoomLimitsChange}
          onMoveSpeedChange={handleMoveSpeedChange}
          onCameraPreset={handleCameraPreset}
          enablePan={enablePan}
          enableZoom={enableZoom}
          enableRotate={enableRotate}
          onControlsToggle={handleControlsToggle}
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
            // Camera control props
            minDistance={cameraMinDistance}
            maxDistance={cameraMaxDistance}
            moveSpeed={cameraMoveSpeed}
            enablePan={enablePan}
            enableZoom={enableZoom}
            enableRotate={enableRotate}
            // Clipping plane props
            nearClip={cameraNearClip}
            farClip={cameraFarClip}
          />

          {/* Viewport Tools */}
          <ViewportTools />

          {/* Viewport Settings */}
          <ViewportSettings
            cameraMode={cameraMode}
            renderMode="realistic"
          />
        </main>

        {/* Right Tabbed Panel (Properties + Camera) */}
        {showProperties && (
          <TabbedRightPanel
            show={showProperties}
            onClose={() => setShowProperties(false)}
            
            // Properties panel props
            sceneId={contextSceneId || undefined}
            selectedItemId={selectedItemId || undefined}
            
            // Camera controls props
            cameraMode={cameraMode}
            onCameraModeChange={handleCameraModeChange}
            minDistance={cameraMinDistance}
            maxDistance={cameraMaxDistance}
            moveSpeed={cameraMoveSpeed}
            onZoomLimitsChange={handleZoomLimitsChange}
            onMoveSpeedChange={handleMoveSpeedChange}
            onCameraPreset={handleCameraPreset}
            enablePan={enablePan}
            enableZoom={enableZoom}
            enableRotate={enableRotate}
            onControlsToggle={handleControlsToggle}
            // Clipping plane props
            nearClip={cameraNearClip}
            farClip={cameraFarClip}
            onClippingChange={handleClippingChange}
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
