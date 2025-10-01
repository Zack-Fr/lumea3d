import React, { useCallback, useState, useEffect } from 'react';
import { once as logOnce, log } from '../../utils/logger';
import { useNavigate } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
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
// Gamification UI temporarily disabled — comment out imports so the HUD does not render
// import GamificationOverlay from '../../components/projectEditor/GamificationOverlay';
// import Achievement from '../../components/projectEditor/Achievement';
// import RealtimeChat from '../../features/realtime/components/RealtimeChat';
import CollaborationPanel from '../../components/collaboration/CollaborationPanel';

// Asset Import Components
import { AssetImportModal } from '../../features/scenes/AssetImportModal';

// Scene Context
import { SceneProvider, useSceneContext, useSceneParams } from '../../contexts/SceneContext';

// Selection Context  
import { SelectionProvider } from '../../features/scenes/SelectionContext';

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
      <SelectionProvider>
        <ProjectEditorContent />
      </SelectionProvider>
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
  
  // Update selectedItemId when selection changes in the SelectionContext
  // This will be handled by the SelectionProvider wrapper

  // Camera controls state
  const [cameraMinDistance, setCameraMinDistance] = useState(0.1);
  const [cameraMaxDistance, setCameraMaxDistance] = useState(500);
  const [cameraMoveSpeed, setCameraMoveSpeed] = useState(5);
  const [enablePan, setEnablePan] = useState(true);
  const [enableZoom, setEnableZoom] = useState(true);
  const [enableRotate, setEnableRotate] = useState(true);
  
  // Clipping plane state
  const [cameraNearClip, setCameraNearClip] = useState(0.01);
  const [cameraFarClip, setCameraFarClip] = useState(2000);

  // Custom Hooks
  const {
    isWASDActive,
    cameraMode,
    setCameraMode,
    movement,
    viewportRef,
    handleViewportClick
  } = useViewportControls();

  // Keep gamification hook for side-effects, only extract what we actively use
  const { setShowGamification, triggerAchievement } = useGamificationSystem();

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

  // Panel states
  const [showLeftPanel, setShowLeftPanel] = useState(true); // Left panel (assets) - default open
  const [showCollaboration, setShowCollaboration] = useState(false);
  
  // Responsive panel visibility - close panels on mobile
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile && showLeftPanel) {
        log('info', 'ProjectEditor: Closing left panel for mobile view');
        setShowLeftPanel(false);
      }
      if (isMobile && (showProperties || showCollaboration)) {
        log('info', 'ProjectEditor: Closing right panels for mobile view');
        setShowProperties(false);
        setShowCollaboration(false);
      }
    };
    
    // Check on mount
    handleResize();
    
    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showLeftPanel, showProperties, showCollaboration, setShowProperties]);

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

  // Left panel toggle callback
  const handleLeftPanelToggle = useCallback(() => {
    setShowLeftPanel(!showLeftPanel);
  }, [showLeftPanel]);
  // NOTE: handleLeftPanelToggle is referenced by UI controls elsewhere; keep it to avoid regressions

  // Properties toggle callback
  const handlePropertiesToggle = useCallback(() => {
    setShowProperties(!showProperties);
    // Close collaboration panel when opening properties
    if (!showProperties) {
      setShowCollaboration(false);
    }
  }, [showProperties, setShowProperties, showCollaboration]);

  // Collaboration toggle callback
  const handleCollaborationToggle = useCallback(() => {
    setShowCollaboration(!showCollaboration);
    // Close properties panel when opening collaboration
    if (!showCollaboration) {
      setShowProperties(false);
    }
  }, [showCollaboration, setShowCollaboration, showProperties]);


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
    console.log('🔍 DEBUG: handleAssetImportComplete called with:', { assetId, assetName, category });
    
    // Check if this is a local fallback asset
    const isLocalAsset = assetId.startsWith('local-');
    console.log('🔍 DEBUG: Asset type:', isLocalAsset ? 'LOCAL FALLBACK (blob URL)' : 'NORMAL API ASSET');
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
        console.log('🔍 DEBUG: Scene item being added:', JSON.stringify(sceneItem, null, 2));
        const currentVersion = manifest?.scene?.version?.toString();
        console.log('🔍 DEBUG: Adding to scene via scenesApi.addItem...');
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
    console.log('🎯 ProjectEditor: handleAssetDrop called with:', { dragData, position });
    
    if (!dragData || !dragData.item) {
      console.warn('ProjectEditor: Cannot drop asset - missing item data', { dragData });
      triggerAchievement(`❌ Invalid asset data`);
      return;
    }

    try {
      log('info', 'ProjectEditor: Processing asset drop', { 
        dragData, 
        position, 
        sceneId: contextSceneId,
        hasSceneContext: !!contextSceneId 
      });
      
      // First, try to add the asset locally to avoid API dependency
      const assetItem = dragData.item;
      const categoryName = dragData.categoryName || assetItem.category || 'imported';
      
      // Create a unique ID for the new local asset
      const localAssetId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Convert screen position to 3D world position (simplified)
      const worldPosition = {
        x: (Math.random() - 0.5) * 10, // Random position for now
        y: 0.5, // Slightly above ground
        z: (Math.random() - 0.5) * 10
      };
      
      // Extract the proper GLB URL from the asset or manifest
      let assetUrl = null;
      
      // First try to get URL directly from asset
      if (assetItem.url) {
        assetUrl = assetItem.url;
      } else if (assetItem.originalUrl) {
        assetUrl = assetItem.originalUrl;
      } else if (assetItem.dracoUrl) {
        assetUrl = assetItem.dracoUrl;
      } else if (assetItem.meshoptUrl) {
        assetUrl = assetItem.meshoptUrl;
      } else {
        // Try to find URL from the manifest categories
        try {
          if (manifest?.categories && categoryName) {
            const category = manifest.categories[categoryName];
            if (category?.url) {
              assetUrl = category.url;
              console.log('🔍 ProjectEditor: Using category URL:', assetUrl);
            } else if (category?.asset?.meshoptUrl) {
              const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://192.168.1.10:3000';
              assetUrl = `${apiBaseUrl}/public/storage/serve/lumea-assets/${category.asset.meshoptUrl}`;
              console.log('🔍 ProjectEditor: Constructed meshopt URL:', assetUrl);
            } else if (category?.asset?.originalUrl) {
              const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://192.168.1.10:3000';
              assetUrl = `${apiBaseUrl}/public/storage/serve/lumea-assets/${category.asset.originalUrl}`;
              console.log('🔍 ProjectEditor: Constructed original URL:', assetUrl);
            }
          }
        } catch (urlError) {
          console.warn('⚠️ ProjectEditor: Failed to extract URL from manifest:', urlError);
        }
      }
      
      if (!assetUrl) {
        console.warn('⚠️ ProjectEditor: No valid URL found for asset:', {
          assetItem,
          category: manifest?.categories?.[categoryName],
          availableFields: Object.keys(assetItem)
        });
        // Use a placeholder or fall back to a known working URL
        assetUrl = 'placeholder-model';
      }
      
      console.log('🔍 ProjectEditor: Final asset URL:', assetUrl);
      
      // Create local asset entry
      const localAsset = {
        id: localAssetId,
        name: assetItem.name || assetItem.meta?.assetName || 'Dropped Asset',
        url: assetUrl,
        category: categoryName,
        position: [worldPosition.x, worldPosition.y, worldPosition.z],
        rotation: [0, Math.random() * Math.PI * 2, 0], // Random Y rotation
        scale: [1, 1, 1],
        transform: {
          position: worldPosition,
          rotation_euler: [0, Math.random() * Math.PI * 2, 0],
          scale: [1, 1, 1]
        },
        meta: {
          ...assetItem.meta,
          droppedAt: new Date().toISOString(),
          dropPosition: position,
          isLocalDrop: true,
          originalAssetData: assetItem // Store original for debugging
        }
      };
      
      console.log('🎯 ProjectEditor: Created local asset:', localAsset);
      
      // Store in localStorage for immediate rendering
      try {
        const existingAssets = JSON.parse(localStorage.getItem('lumea-local-assets') || '[]');
        existingAssets.push(localAsset);
        localStorage.setItem('lumea-local-assets', JSON.stringify(existingAssets));
        
        console.log('💾 ProjectEditor: Stored asset locally, total assets:', existingAssets.length);
        
        // Trigger achievement and refresh
        log('info', 'ProjectEditor: Asset successfully added locally');
        triggerAchievement(`✨ +10 XP - Asset placed in scene!`);
        
        // Force scene refresh to pick up the new local asset
        refreshScene();
        
        // Try to also add to backend if scene context is available
        if (contextSceneId) {
          try {
            // Normalize the category key to match backend validation requirements
            const normalizedCategoryKey = typeof categoryName === 'string' 
              ? categoryName.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 50) 
              : 'imported';
            
            const droppedItem: SceneItemCreateRequest = {
              categoryKey: normalizedCategoryKey,
              positionX: worldPosition.x,
              positionY: worldPosition.y,
              positionZ: worldPosition.z,
              rotationX: 0,
              rotationY: Math.random() * 360 - 180, // Random Y rotation in degrees
              rotationZ: 0,
              scaleX: 1,
              scaleY: 1,
              scaleZ: 1,
              selectable: true,
              locked: false,
              meta: {
                ...localAsset.meta,
                localAssetId: localAssetId
              }
            };
            
            const currentVersion = manifest?.scene?.version?.toString();
            const backendResponse = await scenesApi.addItem(contextSceneId, droppedItem, currentVersion);
            
            console.log('✅ ProjectEditor: Successfully added to backend:', backendResponse);
            
            // If backend add succeeds, schedule localStorage cleanup
            // We delay this to allow the manifest to update with the new item
            setTimeout(() => {
              try {
                const currentLocalAssets = JSON.parse(localStorage.getItem('lumea-local-assets') || '[]');
                const filteredAssets = currentLocalAssets.filter((asset: any) => asset.id !== localAssetId);
                localStorage.setItem('lumea-local-assets', JSON.stringify(filteredAssets));
                
                console.log('🧹 ProjectEditor: Cleaned up local asset after backend sync:', {
                  removedId: localAssetId,
                  remainingCount: filteredAssets.length
                });
                
                // REMOVED: Excessive refresh was causing loops
                // refreshScene();
              } catch (cleanupError) {
                console.warn('⚠️ ProjectEditor: Failed to cleanup local asset:', cleanupError);
              }
            }, 2000); // 2 second delay to allow manifest refresh
            
          } catch (backendError) {
            console.warn('⚠️ ProjectEditor: Failed to add to backend, keeping local version:', backendError);
            // Don't throw - local version is working
            // Mark the local asset as "backend-failed" to prevent future cleanup
            try {
              const currentLocalAssets = JSON.parse(localStorage.getItem('lumea-local-assets') || '[]');
              const errorMessage = backendError instanceof Error ? backendError.message : String(backendError);
              const updatedAssets = currentLocalAssets.map((asset: any) => 
                asset.id === localAssetId 
                  ? { ...asset, meta: { ...asset.meta, backendFailed: true, backendError: errorMessage } }
                  : asset
              );
              localStorage.setItem('lumea-local-assets', JSON.stringify(updatedAssets));
              console.log('📝 ProjectEditor: Marked local asset as backend-failed:', localAssetId);
            } catch (markError) {
              console.warn('⚠️ ProjectEditor: Failed to mark asset as backend-failed:', markError);
            }
          }
        } else {
          console.log('ℹ️ ProjectEditor: No scene context, asset added locally only');
        }
        
      } catch (storageError) {
        console.error('❌ ProjectEditor: Failed to store asset locally:', storageError);
        throw storageError;
      }

    } catch (error) {
      console.error('❌ ProjectEditor: Failed to drop asset into scene:', error);
      log('error', 'ProjectEditor: Asset drop failed completely', error);
      triggerAchievement(`❌ Failed to place asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // REMOVED: Excessive refresh in error handling was causing loops
      // The UI will naturally recover on next user interaction
      console.log('ℹ️ ProjectEditor: Error handled, UI will recover naturally');
    }
  }, [contextSceneId, contextProjectId, manifest, refreshScene, triggerAchievement]);
  
  // DISABLED: Periodic cleanup was causing infinite refresh loops
  // TODO: Implement a smarter cleanup mechanism that doesn't trigger on every refresh
  /*
  useEffect(() => {
    // Disabled periodic cleanup to prevent infinite loops
    console.log('🚧 Periodic cleanup disabled to prevent infinite refresh loops');
  }, [manifest, contextSceneId, refreshScene]);
  */

  return (
    <div className={styles.projectEditorRoot}>
      {/* Achievement Notification (disabled) */}
      {/*
      {showAchievement && (
        <Achievement 
          message={achievementMessage}
          show={showAchievement}
        />
      )}

      {showGamification && (
        <GamificationOverlay
          gamificationData={gamificationData}
          show={showGamification}
          onClose={() => setShowGamification(false)}
        />
      )}
      */}

      {/* Top Bar */}
      <TopBar
        onNavigate={handleNavigate}
        cameraMode={cameraMode}
        onCameraModeChange={handleCameraModeChange}
        soundEnabled={soundEnabled}
        onSoundToggle={handleSoundToggle}
        lightingMode={lightingMode}
        onLightingModeToggle={handleLightingModeToggle}
        showLeftPanel={showLeftPanel}
        onLeftPanelToggle={handleLeftPanelToggle}
        showProperties={showProperties}
        onPropertiesToggle={handlePropertiesToggle}
        showCollaboration={showCollaboration}
        onCollaborationToggle={handleCollaborationToggle}
        onAIAssist={handleAIAssist}
      />
      {/* Main Layout with Resizable Panels */}
      <div className={styles.projectEditorLayout}>
        <PanelGroup direction="horizontal" className={styles.resizablePanelGroup}>
          {/* Left Assets Panel - Conditional */}
          {showLeftPanel && (
            <>
              <Panel defaultSize={20} minSize={10} maxSize={40} className={styles.leftPanelContainer}>
                <TabbedLeftPanel
                  // Panel state
                  show={showLeftPanel}
                  onClose={() => setShowLeftPanel(false)}
                  
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
              </Panel>

              {/* Left Panel Resize Handle */}
              <PanelResizeHandle className={styles.panelResizeHandle} />
            </>
          )}

          {/* Main Viewport Area */}
          <Panel className={styles.mainViewportPanelContainer}>
            <main className={styles.mainViewportArea}>
              {/* Viewport Canvas */}
              <ViewportCanvas
                viewportRef={viewportRef}
                isWASDActive={isWASDActive}
                movement={movement}
                onViewportClick={handleViewportClickWithAchievement}
                cameraMode={cameraMode}
                onAssetDrop={handleAssetDrop}
                onSelectionChange={setSelectedItemId}
                onSceneRefresh={refreshScene}
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
          </Panel>

          {/* Right Panel Resize Handle (only when properties or collaboration panel is visible) */}
          {(showProperties || showCollaboration) && (
            <>
              <PanelResizeHandle className={styles.panelResizeHandle} />
              
              {/* Right Tabbed Panel (Properties + Camera OR Collaboration) */}
              <Panel defaultSize={20} minSize={15} maxSize={45} className={styles.rightPanelContainer}>
                {showProperties && (
                  <TabbedRightPanel
                    show={showProperties}
                    onClose={() => setShowProperties(false)}
                    
                    // Properties panel props
                    sceneId={contextSceneId || urlSceneId || undefined}
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
                
                {showCollaboration && (
                  <CollaborationPanel
                    projectId={contextProjectId || urlProjectId || 'unknown'}
                    projectName={manifest?.scene?.name || 'Current Project'}
                    sceneId={contextSceneId || urlSceneId || 'unknown'}
                    onClose={() => setShowCollaboration(false)}
                    className={styles.collaborationPanelContainer}
                  />
                )}
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
      {/* <RealtimeChat /> */}
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
