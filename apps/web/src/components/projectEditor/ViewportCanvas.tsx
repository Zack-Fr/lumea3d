import React, { Suspense, useCallback } from 'react';
import { log, once as logOnce } from '../../utils/logger';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { motion } from "framer-motion";
import { Box, Loader2 } from "lucide-react";
import { ViewportMovement } from '../../types/projectEditor';
import { useSceneContext } from '../../contexts/SceneContext';
import { StagedSceneLoader } from '../../features/scenes/StagedSceneLoader';
import { SceneRenderer } from '../../features/scenes/SceneRenderer';
import { ClickSelection } from '../../features/scenes/ClickSelection';
import { TransformGizmos } from '../../features/scenes/TransformGizmos';
import { SelectionHighlightSystem } from '../../features/scenes/SelectionHighlight';
import { TransformControlsPanel } from '../../features/scenes/TransformControlsPanel';
import { TransformKeyboardControls } from '../../features/scenes/TransformKeyboardControls';
import { SelectionBridge } from '../../features/scenes/SelectionBridge';
import { GridSystem } from '../../features/scenes/GridSystem';
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
  
  // Debug log clipping plane values
  console.log('🎥 Camera clipping planes:', { nearClip, farClip });
  // Get scene data from context
  const { 
    sceneId, 
    projectId,
    isLoading, 
    loading, 
    error,
    manifest
  } = useSceneContext();

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
        
        try {
          const dragDataString = e.dataTransfer.getData('application/json');
          if (!dragDataString) return;
          
          const dragData = JSON.parse(dragDataString);
          if (dragData.type === 'asset' && onAssetDrop) {
            const dropPosition = {
              x: e.clientX,
              y: e.clientY
            };
            
            console.log('🎯 ViewportCanvas: Asset dropped:', { dragData, dropPosition });
            onAssetDrop(dragData, dropPosition);
          }
        } catch (error) {
          console.error('❌ ViewportCanvas: Error handling drop:', error);
        }
      }}
    >
      {/* 3D Canvas */}
      <Canvas
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
        onCreated={({ gl }) => {
          gl.setClearColor('#0f0f0f', 0);
        }}
      >
        {/* Enhanced Lighting Setup */}
        <ambientLight intensity={0.6} />
        
        {/* Main directional light (key light) */}
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1.2} 
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        
        {/* Fill light */}
        <directionalLight 
          position={[-10, 5, 5]} 
          intensity={0.4} 
          color="#87CEEB"
        />
        
        {/* Rim light */}
        <directionalLight 
          position={[0, -10, -5]} 
          intensity={0.3} 
          color="#FFE4B5"
        />
        
        {/* Point lights for additional illumination */}
        <pointLight position={[0, 5, 0]} intensity={0.5} distance={20} />
        <pointLight position={[5, 3, 5]} intensity={0.3} distance={15} color="#FFF8DC" />
        <pointLight position={[-5, 3, -5]} intensity={0.3} distance={15} color="#F0E68C" />
        
        {/* HDR Environment */}
        {manifest?.scene?.env?.hdri_url ? (
          <Environment files={manifest.scene.env.hdri_url} />
        ) : (
          <Environment preset="city" background={false} />
        )}
        
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
      
      {/* Scene Content */}
      <Suspense fallback={null}>
        {sceneId && <SceneRenderer sceneId={sceneId} />}
      </Suspense>
      
      {/* Debug test cubes for selection testing */}
      <group name="debug-objects">
        <mesh 
          name="debug-cube-center"
          position={[0, 1, 0]}
          userData={{
            itemId: 'debug-cube-center',
            category: 'debug',
            selectable: true,
            locked: false,
            meta: { isDebug: true, name: 'Center Cube' }
          }}
        >
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#ff4444" transparent opacity={0.8} />
        </mesh>
        
        <mesh 
          name="debug-cube-left"
          position={[-4, 0.5, 0]}
          userData={{
            itemId: 'debug-cube-left',
            category: 'debug',
            selectable: true,
            locked: false,
            meta: { isDebug: true, name: 'Left Cube' }
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#44ff44" transparent opacity={0.8} />
        </mesh>
        
        <mesh 
          name="debug-cube-right"
          position={[4, 0.5, 0]}
          userData={{
            itemId: 'debug-cube-right',
            category: 'debug',
            selectable: true,
            locked: false,
            meta: { isDebug: true, name: 'Right Cube' }
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#4444ff" transparent opacity={0.8} />
        </mesh>
        
        {/* Additional sphere for testing */}
        <mesh 
          name="debug-sphere"
          position={[0, 0.5, 4]}
          userData={{
            itemId: 'debug-sphere',
            category: 'debug',
            selectable: true,
            locked: false,
            meta: { isDebug: true, name: 'Test Sphere' }
          }}
        >
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshStandardMaterial color="#ffaa44" transparent opacity={0.8} />
        </mesh>
      </group>
      
      {/* Selection and Transform System */}
      <ClickSelection enabled={true} />
      <TransformGizmos enabled={true} />
      <SelectionHighlightSystem 
        enabled={true}
        highlightColor="#f5c842"
        boxColor="#ff0066"
        showOutline={true}
        showBox={true}
        intensity={1.2}
        pulseSpeed={2.0}
      />

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