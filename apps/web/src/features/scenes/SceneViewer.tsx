import { Canvas } from '@react-three/fiber';
import { Environment, Stats } from '@react-three/drei';
import { Suspense, useState, useCallback, useEffect } from 'react';
import { log } from '../../utils/logger';
import type { SceneManifestV2 } from '../../services/scenesApi';
import { CategoryRenderer } from './CategoryRenderer';
import { GLBPreloader, useSceneMetrics } from './GLBPreloader';
import { ViewerSidebar, type ViewerControls } from '../../../legacy/features/scenes/ViewerSidebar';
import { SceneHelpers } from '../../../legacy/features/scenes/SceneHelpers';
import { FPSTracker } from '../../../legacy/features/scenes/FPSTracker';
import { useViewerControls } from './useViewerControls';
import { FPSControls } from '../../../legacy/features/scenes/FPSControls';
import { ControlsInstructions } from '../../../legacy/features/scenes/ControlsInstructions';
import { SelectionProvider } from './SelectionContext';
import { ClickSelection } from './ClickSelection';
import { TransformGizmos } from './TransformGizmos';
import { SelectionHighlight } from './SelectionHighlight';
import { TransformControlsPanel } from './TransformControlsPanel';
import { TransformKeyboardControls } from './TransformKeyboardControls';
import { AssetManagementPanel } from './AssetManagementPanel';
import { useLODSystem } from './useLODSystem';
import { usePerformanceMonitor } from './usePerformanceMonitor';
import { PerformanceDisplay } from '../../../legacy/features/scenes/PerformanceDisplay';
import { AdvancedFrustumCulling } from '../../../legacy/features/scenes/FrustumCulling';
import { ScenePersistenceProvider } from './ScenePersistenceContext';
import { ScenePersistenceStatus } from './ScenePersistenceStatus';
import { useSceneHistory } from '../../../legacy/features/scenes/useSceneHistory';
import { useSceneKeyboardShortcuts, createSceneEditorShortcuts } from './useSceneKeyboardShortcuts';
import { SceneShortcutsHelp, useSceneShortcutsHelp } from '../../../legacy/features/scenes/SceneShortcutsHelp';

// Import our new Shell UI components
import { ShellUIControls } from './ShellUIControls';
import { LayerManagementPanel } from './LayerManagementPanel';
import { SmoothCameraControls, CameraTransitionStatus } from './SmoothCameraControls';
import { PerformanceStats } from './PerformanceStats';
import { InstancedSelectionBridge } from './InstancedSelectionBridge';

interface SceneGraphProps {
  manifest: SceneManifestV2;
  controls: ViewerControls;
  onFPSUpdate: (fps: number) => void;
}

function SceneGraph({ manifest, controls, onFPSUpdate }: SceneGraphProps) {
  const categories = Object.entries(manifest.categories);
  useSceneMetrics(manifest); // Use metrics for logging
  
  // Performance optimization hooks
  const { stats } = usePerformanceMonitor({
    enabled: controls.showFPS,
    updateInterval: 1000,
    onStatsUpdate: (stats) => {
      onFPSUpdate(stats.fps);
    }
  });

  const lodSystem = useLODSystem({
    enabled: true,
    adaptToPerformance: true,
    targetFPS: 60,
    debugMode: false
  });

  // Track performance for LOD system
  useEffect(() => {
    lodSystem.trackPerformance(stats.fps);
  }, [stats.fps, lodSystem]);
  
  log('debug', '🏗️ SceneGraph rendering with categories:', categories.map(([key]) => ({
    key,
    itemCount: manifest.items.filter(item => {
      const itemCategory = typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey || '';
      return itemCategory === key;
    }).length
  })));
  
  return (
    <>
      {/* Performance Optimization Systems */}
      <AdvancedFrustumCulling 
        enabled={true}
        maxDistance={500}
        useLODCulling={true}
        debugMode={false}
        updateInterval={100}
      />
      
      {/* FPS Controls for first-person navigation */}
      <FPSControls 
        controls={controls}
        spawnPosition={manifest.spawn?.position || [0, 1.6, 0]}
      />
      
      {/* FPS Tracker */}
      <FPSTracker onFPSUpdate={onFPSUpdate} controls={controls} />
      
      {/* Preload GLBs for better performance */}
      <GLBPreloader manifest={manifest} />
      
      {/* Scene Helpers (Grid, NavMesh, etc.) */}
      <SceneHelpers 
        controls={controls} 
        navmeshUrl={manifest.navmesh_url} 
      />
      
      {/* Selection and Transform System */}
      <ClickSelection enabled={true} />
      <TransformGizmos enabled={true} />
      <SelectionHighlight />
      
      {/* New Instanced Selection System */}
      <InstancedSelectionBridge />
      
      {/* Smooth Camera Controls */}
      <SmoothCameraControls enabled={true} />
      
      {/* Environment lighting with exposure control */}
      {manifest.env?.hdri_url && (
        <Environment files={manifest.env.hdri_url} />
      )}
      
      {/* Exposure control via ambient light */}
      <ambientLight intensity={0.2 * controls.exposure} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.8 * controls.exposure}
        castShadow
      />
      
      {/* Render categories with their items */}
      {categories.map(([categoryKey, category]) => (
        <Suspense key={`${manifest.scene.id}-${categoryKey}`} fallback={null}>
          <CategoryRenderer
            categoryKey={categoryKey}
            category={category}
            items={manifest.items}
            sceneId={manifest.scene.id}
          />
        </Suspense>
      ))}
      
      {/* Performance stats (only if FPS is enabled) */}
      {controls.showFPS && <Stats />}
    </>
  );
}

interface SceneViewerProps {
  manifest: SceneManifestV2;
}

export default function SceneViewer({ manifest }: SceneViewerProps) {
  const spawnPosition = manifest.spawn?.position || [0, 1.6, 0];
  const { controls, updateControls } = useViewerControls();
  const [currentFPS, setCurrentFPS] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showAssetManagement, setShowAssetManagement] = useState(false);
  
  // Shell UI state
  const [cameraMode, setCameraMode] = useState<'orbit' | 'fps'>('orbit');
  const [showShellUI, setShowShellUI] = useState(true);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);

  // Performance monitoring for the overall viewer
  const { stats } = usePerformanceMonitor({
    enabled: true,
    updateInterval: 1000,
    onStatsUpdate: (stats) => {
      setCurrentFPS(stats.fps);
    }
  });

  // Scene history management
  const sceneHistory = useSceneHistory({
    maxHistorySize: 50,
    onUndo: (_manifest) => {
      log('info', '↶ SceneViewer: Undo applied');
      // Future: Apply manifest changes to scene
    },
    onRedo: (_manifest) => {
      log('info', '↷ SceneViewer: Redo applied');
      // Future: Apply manifest changes to scene
    }
  });

  // Shortcuts help system
  const shortcutsHelp = useSceneShortcutsHelp();

  // Create keyboard shortcuts
  const shortcuts = createSceneEditorShortcuts({
    onUndo: sceneHistory.undo,
    onRedo: sceneHistory.redo,
  onSave: () => log('info', '💾 Manual save triggered'),
    onToggleGrid: () => updateControls({ showGrid: !controls.showGrid }),
    onDeselectAll: () => log('info', '🔲 Deselect all'),
    onDelete: () => log('info', '🗑️ Delete selected'),
    onDuplicate: () => log('info', '📋 Duplicate selected')
  });

  // Add shell UI toggle shortcut
  shortcuts.push({
    key: 'Shift+U',
    action: () => setShowShellUI(!showShellUI),
    description: 'Toggle Shell UI controls',
    category: 'UI'
  });

  // Add help shortcut
  shortcuts.push({
    key: '?',
    action: shortcutsHelp.toggle,
    description: 'Show/hide keyboard shortcuts help',
    category: 'Help'
  });

  // Enable keyboard shortcuts
  useSceneKeyboardShortcuts({
    shortcuts,
    enabled: true,
    preventDefault: true
  });

  const handleFPSUpdate = useCallback((fps: number) => {
    setCurrentFPS(fps);
  }, []);
  
  const dismissInstructions = useCallback(() => {
    setShowInstructions(false);
  }, []);

  const handleAssetImportComplete = useCallback((assetId: string) => {
  log('info', '✅ SceneViewer: Asset import completed:', assetId);
    // Future: Refresh scene manifest or add asset to scene
  }, []);

  const handleAssetAttach = useCallback((asset: any) => {
  log('info', '🔗 SceneViewer: Attach asset to scene:', asset);
    // Future: Implement asset attachment to scene
    // This would create a category and add the asset to the scene
  }, []);

  // Scene viewer content
  const sceneViewerContent = (
    <div className="relative h-screen w-full">
      {/* 3D Canvas */}
      <Canvas
        camera={{ 
          position: spawnPosition, 
          fov: 60 
        }}
        gl={{ 
          antialias: true, 
          powerPreference: 'high-performance' 
        }}
      >
        {/* Background */}
        <color attach="background" args={['#0b0b0b']} />
        
        {/* Scene content */}
        <Suspense fallback={null}>
          <SceneGraph 
            manifest={manifest} 
            controls={controls}
            onFPSUpdate={handleFPSUpdate}
          />
        </Suspense>
      </Canvas>

      {/* Sidebar Controls */}
      <ViewerSidebar
        controls={controls}
        onControlsChange={updateControls}
        fps={currentFPS}
        onAssetImportComplete={handleAssetImportComplete}
      />
      
      {/* Asset Management Panel */}
      <AssetManagementPanel
        isVisible={showAssetManagement}
        onToggleVisibility={() => setShowAssetManagement(!showAssetManagement)}
  onAssetSelected={(asset) => log('info', 'Asset selected:', asset)}
        onAssetAttach={handleAssetAttach}
      />
      
      {/* Transform Controls Panel (appears when object selected) */}
      <TransformControlsPanel />
      
      {/* Keyboard Controls for Transform */}
      <TransformKeyboardControls />
      
      {/* Controls Instructions Overlay */}
      <ControlsInstructions
        isVisible={showInstructions}
        onDismiss={dismissInstructions}
      />

      {/* Performance Display */}
      <PerformanceDisplay
        stats={stats}
        visible={controls.showFPS}
        position="top-right"
        compact={false}
      />

      {/* Scene Persistence Status */}
      <ScenePersistenceStatus
        position="bottom-left"
        compact={true}
      />

      {/* Keyboard Shortcuts Help */}
      <SceneShortcutsHelp
        shortcuts={shortcuts}
        isVisible={shortcutsHelp.isVisible}
        onClose={shortcutsHelp.hide}
      />

      {/* Camera Transition Status */}
      <CameraTransitionStatus />

      {/* Enhanced Shell UI Controls */}
      {showShellUI && (
        <ShellUIControls
          cameraMode={cameraMode}
          onCameraModeChange={setCameraMode}
          showGrid={controls.showGrid}
          onToggleGrid={() => updateControls({ showGrid: !controls.showGrid })}
          showPerformance={showPerformanceStats}
          onTogglePerformance={() => setShowPerformanceStats(!showPerformanceStats)}
          isPlaying={false}
          onTogglePlayback={() => log('info', 'Toggle playback')}
          onSave={() => log('info', 'Save scene')}
          onUndo={sceneHistory.undo}
          onRedo={sceneHistory.redo}
          canUndo={sceneHistory.canUndo}
          canRedo={sceneHistory.canRedo}
          lightingMode="realistic"
          onToggleLighting={() => log('info', 'Toggle lighting')}
          selectionMode="select"
          onToggleSelectionMode={() => console.log('Toggle selection mode')}
        />
      )}

      {/* Layer Management Panel */}
      <LayerManagementPanel
        isVisible={showLayerPanel}
        onToggleVisibility={() => setShowLayerPanel(!showLayerPanel)}
        layers={[
          {
            id: 'layer-1',
            name: 'Environment',
            visible: true,
            locked: false,
            type: 'objects' as const,
            color: '#4ade80',
            expanded: true,
            objects: [
              { id: 'obj-1', name: 'Ground Plane', visible: true, locked: false, type: 'mesh', selected: false }
            ]
          }
        ]}
        onLayerUpdate={(layerId, updates) => {
          console.log('🏷️ Update layer:', layerId, updates);
        }}
        onObjectSelect={(objectId) => {
          console.log('🎯 Select object:', objectId);
        }}
        onObjectUpdate={(objectId, layerId, updates) => {
          console.log('📝 Update object:', objectId, 'in layer:', layerId, updates);
        }}
        onCreateLayer={() => {
          console.log('➕ Create new layer');
        }}
        onDeleteLayer={(layerId) => {
          console.log('🗑️ Delete layer:', layerId);
        }}
      />

      {/* Enhanced Performance Stats */}
      <PerformanceStats
        isVisible={showPerformanceStats}
        onToggleVisibility={() => setShowPerformanceStats(!showPerformanceStats)}
        position="top-left"
      />
    </div>
  );

  // Mock user data for scene persistence (in real app, get from auth context)
  const userId = 'user-123';
  const userRole = 'designer';
  const sceneId = 'scene-demo'; // In real app, extract from URL params

  return (
    <SelectionProvider>
      <ScenePersistenceProvider
        initialManifest={manifest}
        sceneId={sceneId}
        userId={userId}
        userRole={userRole}
      >
        {sceneViewerContent}
      </ScenePersistenceProvider>
    </SelectionProvider>
  );
}