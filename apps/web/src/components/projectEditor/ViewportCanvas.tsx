import React, { useCallback } from 'react';
import { log, once as logOnce } from '../../utils/logger';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { motion } from "framer-motion";
import { Box, Loader2 } from "lucide-react";
import { ViewportMovement } from '../../types/projectEditor';
import { useSceneContext } from '../../contexts/SceneContext';
import { useLightingControls } from '../../hooks/useLightingControls';
import { initKTX2Loader } from '../../utils/textureSystem';
import { gpuMemoryMonitor } from '../../utils/gpuMemoryMonitor';
import { StagedSceneLoader } from '../../features/scenes/StagedSceneLoader';
import { ClickSelection } from '../../features/scenes/ClickSelection';
import { SelectionHighlightSystem } from '../../features/scenes/SelectionHighlight';
import { TransformControlsPanel } from '../../features/scenes/TransformControlsPanel';
import { TransformKeyboardControls } from '../../features/scenes/TransformKeyboardControls';
import { SelectionBridge } from '../../features/scenes/SelectionBridge';
import { GridSystem } from '../../features/scenes/GridSystem';
import { LayerHierarchyBridge } from '../../features/scenes/LayerHierarchyBridge';
// Portal imports temporarily removed to fix infinite loop
// import { SceneHost } from '../../viewer/SceneHost';
// import { useScenePortal } from '../../viewer/useScenePortal';
import { EditorScene } from '../../viewer/EditorScene';
import { PerformanceStatsOverlay } from './PerformanceStatsOverlay';
import LightsContainer from './LightsContainer';
import CameraControlsComponent from './CameraControls';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface ViewportCanvasProps {
  viewportRef: React.RefObject<HTMLDivElement>;
  isWASDActive: boolean;
  movement: ViewportMovement;
  onViewportClick: () => void;
  cameraMode?: string;
  onAssetDrop?: (assetData: any, position: { x: number; y: number }) => void;
  onSelectionChange?: (itemId: string | null) => void;
  onSceneRefresh?: () => void;
  // Camera control props
  minDistance?: number;
  maxDistance?: number;
  moveSpeed?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
  // Clipping plane props
  nearClip?: number;
  farClip?: number;
}

const ViewportCanvas: React.FC<ViewportCanvasProps> = React.memo(({
  viewportRef,
  isWASDActive,
  movement,
  onViewportClick,
  cameraMode = 'orbit',
  onAssetDrop,
  onSelectionChange,
  onSceneRefresh,
  // Camera control props
  minDistance = 0.1,
  maxDistance = 500,
  moveSpeed = 5,
  enablePan = true,
  enableZoom = true,
  enableRotate = true,
  // Clipping plane props
  nearClip = 0.1,
  farClip = 1000
}) => {
  
  // Get scene data from context
  const { 
    sceneId, 
    projectId,
    isLoading, 
    loading, 
    error,
    manifest
  } = useSceneContext();

  // Update manifest store when manifest changes - with deep change detection to prevent loops
  React.useEffect(() => {
    if (!sceneId || !manifest) return;
    
    import('../../stores/manifestStore').then(({ manifestStore }) => {
      const currentState = manifestStore.getState();
      // Only update if sceneId changed OR manifest is actually a different object reference
      if (currentState.sceneId !== sceneId || currentState.manifest !== manifest) {
        console.log('📦 Updating manifest store:', { sceneId, manifestItems: manifest?.items?.length });
        manifestStore.getState().set({ sceneId, manifest });
      }
    });
  }, [sceneId, manifest]);

  // Temporarily render EditorScene directly to avoid portal issues
  // TODO: Re-implement portal after fixing infinite loop
  const editorScene = React.useMemo(() => {
    return sceneId ? <EditorScene sceneId={sceneId} /> : null;
  }, [sceneId]);
  
  // Get lighting controls
  const { defaultLightEnabled } = useLightingControls();

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const handleManifestLoaded = useCallback((loadedManifest: any) => {
    logOnce('viewport:scene-loaded', 'info', '🎯 3D Scene loaded (logged once)');
    log('debug', 'Viewport manifest loaded', loadedManifest);
  }, []);

  const handleLoadingStateChange = useCallback((loading: boolean) => {
    log('debug', '🔄 3D Scene loading state', loading);
  }, []);

  // Debug log - disabled by default, enable via logger.enable('debug') if needed
  log('debug', 'ViewportCanvas scene state', { sceneId, projectId, isLoading, error });

  // Show loading state while scene is loading
  if (isLoading || !sceneId) {
    return (
      <div 
        ref={viewportRef}
        className={styles.viewportCanvas}
        onClick={onViewportClick}
        tabIndex={0}
      >
        <div className={styles.viewportBackground}></div>
        
        <div className={styles.viewportPlaceholder}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1 }}
            className={styles.viewportContent}
          >
            <div className={styles.viewportCard}>
              <div className={styles.viewportCardContent}>
                <div className={styles.viewportIconContainer}>
                  {isLoading ? (
                    <Loader2 className={`${styles.viewportIcon} animate-spin`} />
                  ) : (
                    <Box className={styles.viewportIcon} />
                  )}
                </div>
                
                {isLoading ? (
                  <>
                    <p className={styles.viewportTitle}>Loading Scene</p>
                    <p className={styles.viewportDescription}>
                      Stage: {loading?.stage ?? 'discovering'} • {typeof loading?.progress === 'number' ? Math.round(loading.progress * 100) : 0}%
                    </p>
                    <div className={styles.viewportInstructions}>
                      <span>
                        Categories: {Array.isArray(loading?.loadedCategories) ? loading.loadedCategories.length : 0}/{Array.isArray(loading?.availableCategories) ? loading.availableCategories.length : 0}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className={styles.viewportTitle}>3D Scene Viewport</p>
                    <p className={styles.viewportDescription}>
                      {sceneId ? `Loading scene ${sceneId}...` : 'No scene selected'}
                    </p>
                    <div className={styles.viewportInstructions}>
                      {sceneId ? (
                        <span>Scene will load shortly...</span>
                      ) : (
                        <span>Please select a project with a scene</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* WASD Movement Indicator */}
        {isWASDActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.wasdIndicator}
          >
            <div className={styles.wasdGrid}>
              <div></div>
              <div className={`${styles.wasdKey} ${movement.forward ? styles.wasdKeyActive : ''}`}>W</div>
              <div></div>
              <div className={`${styles.wasdKey} ${movement.left ? styles.wasdKeyActive : ''}`}>A</div>
              <div className={`${styles.wasdKey} ${movement.backward ? styles.wasdKeyActive : ''}`}>S</div>
              <div className={`${styles.wasdKey} ${movement.right ? styles.wasdKeyActive : ''}`}>D</div>
            </div>
            <p className={styles.wasdLabel}>Movement Controls</p>
          </motion.div>
        )}
      </div>
    );
  }

  // Show error state
  if (error) {
    const isAuthError = error.includes('401') || error.includes('Unauthorized') || error.includes('Authentication required');
    
    return (
      <div 
        ref={viewportRef}
        className={styles.viewportCanvas}
        onClick={onViewportClick}
        tabIndex={0}
      >
        <div className={styles.viewportBackground}></div>
        
        <div className={styles.viewportPlaceholder}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1 }}
            className={styles.viewportContent}
          >
            <div className={styles.viewportCard}>
              <div className={styles.viewportCardContent}>
                <div className={styles.viewportIconContainer}>
                  <Box className={styles.viewportIcon} style={{ color: '#ef4444' }} />
                </div>
                <p className={styles.viewportTitle}>
                  {isAuthError ? 'Authentication Required' : 'Scene Loading Error'}
                </p>
                <p className={styles.viewportDescription}>
                  {isAuthError 
                    ? 'Please log in to access scene data' 
                    : error
                  }
                </p>
                <div className={styles.viewportInstructions}>
                  <span>
                    {isAuthError 
                      ? 'Check your login status and try again' 
                      : 'Check scene ID and try again'
                    }
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Render 3D scene
  return (
    <div
        ref={viewportRef}
        className={styles.viewportCanvas}
        onClick={onViewportClick}
        tabIndex={0}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        
        console.log('🎯 ViewportCanvas: Drop event received:', {
          dataTransfer: e.dataTransfer,
          types: Array.from(e.dataTransfer.types),
          position: { x: e.clientX, y: e.clientY }
        });
        
        try {
          const dragDataString = e.dataTransfer.getData('application/json');
          console.log('🎯 ViewportCanvas: Drag data string:', dragDataString);
          
          if (!dragDataString) {
            console.warn('⚠️ ViewportCanvas: No drag data found');
            return;
          }
          
          const dragData = JSON.parse(dragDataString);
          console.log('🎯 ViewportCanvas: Parsed drag data:', dragData);
          
          if (dragData.type === 'asset' && onAssetDrop) {
            const dropPosition = {
              x: e.clientX,
              y: e.clientY
            };
            
            console.log('🎯 ViewportCanvas: Calling onAssetDrop with:', { dragData, dropPosition });
            
            // Add a timeout to prevent UI freezing
            setTimeout(() => {
              try {
                onAssetDrop(dragData, dropPosition);
              } catch (dropError) {
                console.error('❌ ViewportCanvas: Error in onAssetDrop handler:', dropError);
              }
            }, 0);
            
          } else {
            console.warn('⚠️ ViewportCanvas: Invalid drop data or missing handler:', {
              hasAssetType: dragData.type === 'asset',
              hasHandler: !!onAssetDrop,
              dragDataType: dragData.type
            });
          }
        } catch (error) {
          console.error('❌ ViewportCanvas: Error handling drop:', error);
          
          // Ensure UI doesn't freeze on error
          setTimeout(() => {
            console.log('🔄 ViewportCanvas: Attempting error recovery');
          }, 100);
        }
      }}
    >
      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ 
          position: [0, 8, 12], 
          fov: 50,
          near: Math.max(0.01, nearClip || 0.01), // Ensure near is not too large
          far: Math.max(1000, farClip || 1000) // Ensure far is reasonable
        }}
        style={{ 
          width: '100%', 
          height: '100%',
          background: 'transparent'
        }}
        onCreated={({ gl, scene }) => {
          console.log('🌄 ViewportCanvas: Canvas created, configuring renderer...');
          gl.setClearColor('#0f0f0f', 0);
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = 2; // THREE.PCFSoftShadowMap
          
          // Throttling for refresh calls to prevent infinite loops
          let lastRefreshTime = 0;
          const REFRESH_THROTTLE_MS = 2000; // Allow refresh max every 2 seconds
          
          const throttledRefresh = (reason: string) => {
            const now = Date.now();
            if (now - lastRefreshTime < REFRESH_THROTTLE_MS) {
              console.log(`⏱️ ViewportCanvas: Refresh throttled (${reason}) - last refresh ${now - lastRefreshTime}ms ago`);
              return;
            }
            
            lastRefreshTime = now;
            console.log(`🔄 ViewportCanvas: Executing throttled refresh (${reason})`);
            if (onSceneRefresh) {
              try {
                onSceneRefresh();
              } catch (refreshError) {
                console.warn(`⚠️ ViewportCanvas: Throttled refresh failed (${reason}):`, refreshError);
              }
            }
          };
          
          // Initialize GPU memory monitoring
          try {
            // Get the underlying WebGL context from the Three.js renderer
            const webglContext = gl.getContext() as WebGLRenderingContext | WebGL2RenderingContext;
            gpuMemoryMonitor.initialize(webglContext);
            
            // Set up enhanced context loss listeners through the memory monitor
            const canvas = gl.domElement;
            gpuMemoryMonitor.setupContextLossListeners(canvas);
            
            console.log('✅ GPU Memory Monitor initialized with context loss detection');
          } catch (error) {
            console.warn('⚠️ Failed to initialize GPU memory monitor:', error);
            
            // Fallback context loss handling if memory monitor fails
            const canvas = gl.domElement;
            
            const handleContextLost = (event: Event) => {
              console.warn('⚠️ WebGL context lost - preventing default behavior (fallback)');
              event.preventDefault();
            };
            
            const handleContextRestored = (_event: Event) => {
              console.log('✅ WebGL context restored - reinitializing resources (fallback)');
              gl.setClearColor('#0f0f0f', 0);
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = 2;
              
              // Use throttled refresh to prevent loops
              setTimeout(() => {
                throttledRefresh('fallback-context-restore');
              }, 100);
            };
            
            canvas.addEventListener('webglcontextlost', handleContextLost, false);
            canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
          }
          
          // Listen for custom WebGL context loss events from the memory monitor
          const handleCustomContextLoss = (_event: Event) => {
            console.error('🚨 Custom WebGL context loss detected!');
            console.log('💬 Context loss handled by GPU memory monitor - no emergency refresh needed');
            
            // REMOVED: Emergency refresh loop that was causing 200k log spam
            // The GPU memory monitor and pooled instancing system handle context loss gracefully
            // No need to force scene refresh which can cause infinite loops
          };
          
          // Keep the listener for logging, but don't trigger refresh loops
          window.addEventListener('webgl-context-lost', handleCustomContextLoss as EventListener);
          
          // Initialize KTX2 loader for optimized textures
          try {
            const ktx2Loader = initKTX2Loader(gl);
            // Store reference globally for use in material system
            (window as any).__lumea_ktx2_loader = ktx2Loader;
            console.log('🌨️ KTX2Loader initialized and stored globally');
          } catch (error) {
            console.warn('⚠️ Failed to initialize KTX2Loader:', error);
          }
          
          console.log('🌄 ViewportCanvas: Renderer configured', {
            shadowMapEnabled: gl.shadowMap.enabled,
            shadowMapType: gl.shadowMap.type,
            outputColorSpace: gl.outputColorSpace,
            ktx2Support: !!(window as any).__lumea_ktx2_loader
          });
          
          // Log scene lights periodically
          setInterval(() => {
            const lights: any[] = [];
            scene.traverse(child => {
              if (child.type.includes('Light')) {
                lights.push({
                  name: child.name,
                  type: child.type,
                  position: child.position.toArray(),
                  intensity: (child as any).intensity,
                  visible: child.visible
                });
              }
            });
            // console.log('💡 Scene lights check:', lights.length, 'lights found:', lights);
          }, 5000); // Check every 5 seconds
          
          // DISABLED: Mesh validation system (was causing infinite recovery loops)
          // TODO: Fix mesh validation system to prevent infinite refresh cycles
          console.log('🔍 Mesh validation system disabled to prevent infinite loops');
          
          // Monitor GPU memory and performance periodically
          setInterval(() => {
            try {
              gpuMemoryMonitor.logMemoryWarningIfNeeded();
              
              const fpsStats = gpuMemoryMonitor.getFPSStats();
              const memoryStatus = gpuMemoryMonitor.getMemoryStatus();
              
              // Log periodic performance summary
              if (memoryStatus) {
                console.log('📊 GPU Performance Summary:', {
                  fps: `${fpsStats.current.toFixed(1)} (avg: ${fpsStats.average.toFixed(1)}, min: ${fpsStats.min.toFixed(1)})`,
                  memory: `${(memoryStatus.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB / ${(memoryStatus.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB`,
                  performance: memoryStatus.performanceLevel,
                  pressure: memoryStatus.memoryPressureLevel,
                  gpu: memoryStatus.webglRenderer
                });
              }
            } catch (error) {
              console.warn('⚠️ Failed to check GPU performance:', error);
            }
          }, 50000000); // Check every 10 seconds
        }}
      >
        {/* Controllable default ambient light */}
        <ambientLight intensity={defaultLightEnabled ? 0.1 : 0.0} />
        
        {/* HDR Environment */}
        {(() => {
          // Check both possible HDR URL locations in manifest
          const hdriUrl = manifest?.scene?.envHdriUrl || manifest?.scene?.env?.hdri_url || manifest?.env?.hdri_url;
          
          if (hdriUrl) {
            return (
              <Environment 
                files={hdriUrl} 
                background={true}
                blur={0.1}
              />
            );
          } else if (defaultLightEnabled) {
            return <Environment preset="city" background={false} />;
          } else {
            return null;
          }
        })()}
        
        {/* Ground plane for shadows */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0, 0]}
          receiveShadow
          name="ground-plane"
        >
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial 
            color="#404040" 
            roughness={0.8}
            metalness={0.2}
            transparent={false}
          />
        </mesh>
        
        {/* Grid System for spatial reference */}
        <GridSystem 
          size={100}
          divisions={100}
          colorCenterLine="#ffffff"
          colorGrid="#555555"
          visible={true}
        />

      {/* Dynamic Lights Management */}
      <LightsContainer />
      
      {/* Scene Content - Direct rendering for now */}
      {editorScene}
      
      {/* Selection and Transform System (outside portal) */}
      <ClickSelection enabled={true} />
      <SelectionHighlightSystem 
        enabled={true}
        highlightColor="#f5c842"
        boxColor="#ff0066"
        showOutline={true}
        showBox={true}
        intensity={1.2}
        pulseSpeed={2.0}
      />
      
      {/* Layer Hierarchy Data Bridge */}
      <LayerHierarchyBridge />

        {/* Camera Controls */}
        <CameraControlsComponent
          cameraMode={cameraMode}
          isWASDActive={isWASDActive}
          movement={movement}
          minDistance={minDistance}
          maxDistance={maxDistance}
          moveSpeed={moveSpeed}
          enablePan={enablePan}
          enableZoom={enableZoom}
          enableRotate={enableRotate}
        />
      </Canvas>

      {/* Scene Loading UI */}
      {sceneId && projectId && (
        <StagedSceneLoader 
          key={`staged-loader-${sceneId}`}
          projectId={projectId}
          sceneId={sceneId}
          onManifestLoaded={handleManifestLoaded}
          onLoadingStateChange={handleLoadingStateChange}
        />
      )}

      {/* WASD Movement Indicator */}
      {isWASDActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={styles.wasdIndicator}
        >
          <div className={styles.wasdGrid}>
            <div></div>
            <div className={`${styles.wasdKey} ${movement.forward ? styles.wasdKeyActive : ''}`}>W</div>
            <div></div>
            <div className={`${styles.wasdKey} ${movement.left ? styles.wasdKeyActive : ''}`}>A</div>
            <div className={`${styles.wasdKey} ${movement.backward ? styles.wasdKeyActive : ''}`}>S</div>
            <div className={`${styles.wasdKey} ${movement.right ? styles.wasdKeyActive : ''}`}>D</div>
          </div>
          <p className={styles.wasdLabel}>Movement Controls</p>
        </motion.div>
      )}
      
  {/* Performance Stats Overlay */}
  <PerformanceStatsOverlay visible={true} position="top-right" projectId={projectId} />
      
      {/* Transform Controls Panel */}
      <TransformControlsPanel />
      
      {/* Selection Bridge */}
      {onSelectionChange && (
        <SelectionBridge onSelectionChange={onSelectionChange} />
      )}
      
      {/* Keyboard Controls for Transform */}
      <TransformKeyboardControls />
    </div>
  );
});

ViewportCanvas.displayName = 'ViewportCanvas';

export default ViewportCanvas;