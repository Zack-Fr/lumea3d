import { Canvas } from '@react-three/fiber';
import { Environment, Stats } from '@react-three/drei';
import { Suspense, useState, useCallback } from 'react';
import type { SceneManifestV2 } from '../../services/scenesApi';
import { CategoryRenderer } from './CategoryRenderer';
import { GLBPreloader } from './GLBPreloader';
import { ViewerSidebar, type ViewerControls } from '../../../legacy/features/scenes/ViewerSidebar';
import { SceneHelpers } from '../../../legacy/features/scenes/SceneHelpers';
import { FPSTracker } from '../../../legacy/features/scenes/FPSTracker';
import { useViewerControls } from './useViewerControls';
import { FPSControls } from '../../../legacy/features/scenes/FPSControls';
import { SelectionProvider } from './SelectionContext';
import { ClickSelection } from './ClickSelection';
import { TransformGizmos } from './TransformGizmos';
import { SelectionHighlightSystem } from './SelectionHighlight';
import { SmoothCameraControls, CameraTransitionStatus } from './SmoothCameraControls';
import { KeyboardShortcuts } from '../../../legacy/features/scenes/KeyboardShortcuts';
import { EditorPersistence } from './EditorPersistence';

interface SceneGraphProps {
  manifest: SceneManifestV2;
  controls: ViewerControls;
  onFPSUpdate: (fps: number) => void;
}

function SceneGraph({ manifest, controls, onFPSUpdate }: SceneGraphProps) {
  const categories = Object.entries(manifest.categories);
  
  return (
    <>
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
      <SelectionHighlightSystem />
      
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
    </>
  );
}

interface SceneViewerProps {
  manifest: SceneManifestV2;
  isInteractive?: boolean;
}

export function SceneViewer({ manifest, isInteractive = false }: SceneViewerProps) {
  const [fps, setFPS] = useState(0);
  const { controls, updateControls } = useViewerControls();
  
  const handleFPSUpdate = useCallback((newFPS: number) => {
    setFPS(newFPS);
  }, []);

  const handleAssetImportComplete = useCallback((assetId: string) => {
    console.log('✅ Asset imported:', assetId);
  }, []);

  return (
    <div className="w-full h-full relative">
      <SelectionProvider>
        <Canvas
          shadows
          camera={{ 
            position: [10, 8, 10], 
            fov: 50,
            near: 0.1,
            far: 1000
          }}
          className="w-full h-full"
          style={{ background: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)' }}
        >
          <Suspense fallback={null}>
            <SceneGraph 
              manifest={manifest}
              controls={controls}
              onFPSUpdate={handleFPSUpdate}
            />
            
            {/* Enhanced Selection Highlighting System */}
            <SelectionHighlightSystem 
              enabled={true}
              highlightColor="#00aaff"
              boxColor="#ffaa00"
              showOutline={true}
              showBox={false}
              intensity={1.0}
              pulseSpeed={2.0}
            />
            
            {/* Smooth Camera Controls */}
            <SmoothCameraControls enabled={true} />
            
            {controls.showFPS && <Stats />}
          </Suspense>
        </Canvas>

        {/* Camera Transition Status */}
        <CameraTransitionStatus />

        {/* Existing ViewerSidebar */}
        <ViewerSidebar 
          controls={controls}
          onControlsChange={updateControls}
          fps={fps}
          onAssetImportComplete={handleAssetImportComplete}
        />
        
        {/* Editor State Persistence */}
        <EditorPersistence 
          enabled={isInteractive}
          sceneId={manifest.scene.id}
          autoSaveInterval={30000}
          onStateLoaded={(state) => console.log('📂 Editor state loaded:', state)}
          onStateSaved={(state) => console.log('💾 Editor state saved:', state)}
        />

        {/* Keyboard Shortcuts Handler */}
        <KeyboardShortcuts 
          enabled={isInteractive}
          onSave={() => console.log('💾 Save action triggered')}
          onUndo={() => console.log('↶ Undo action triggered')}
          onRedo={() => console.log('↷ Redo action triggered')}
        />

        {/* Simple Shell UI Toggle */}
        {isInteractive && (
          <div className="fixed bottom-4 left-4 z-50">
            <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm">Enhanced Shell UI Ready</span>
              </div>
            </div>
          </div>
        )}
      </SelectionProvider>
    </div>
  );
}

export default SceneViewer;