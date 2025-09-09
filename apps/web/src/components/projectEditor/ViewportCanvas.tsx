import React, { Suspense, useCallback } from 'react';
import { log, once as logOnce } from '../../utils/logger';
import { Canvas } from '@react-three/fiber';
import { motion } from "framer-motion";
import { Box, Loader2 } from "lucide-react";
import { ViewportMovement } from '../../types/projectEditor';
import { useSceneContext } from '../../contexts/SceneContext';
import { SceneRenderer } from '../../features/scenes/SceneRenderer';
import { StagedSceneLoader } from '../../features/scenes/StagedSceneLoader';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface ViewportCanvasProps {
  viewportRef: React.RefObject<HTMLDivElement>;
  isWASDActive: boolean;
  movement: ViewportMovement;
  onViewportClick: () => void;
}

const ViewportCanvas: React.FC<ViewportCanvasProps> = React.memo(({
  viewportRef,
  isWASDActive,
  movement,
  onViewportClick
}) => {
  // Get scene data from context
  const { 
    sceneId, 
    projectId,
    isLoading, 
    loading, 
    error 
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
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ 
          position: [0, 5, 10], 
          fov: 60,
          near: 0.1,
          far: 1000
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

        {/* Scene Content */}
        <Suspense fallback={null}>
          {projectId && sceneId && (
            <SceneRenderer
              key={`scene-renderer-${sceneId}`}
              sceneId={sceneId}
            />
          )}
        </Suspense>

        {/* Camera Controls */}
        {/* TODO: Integrate WASD controls with Three.js camera */}
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
    </div>
  );
});

ViewportCanvas.displayName = 'ViewportCanvas';

export default ViewportCanvas;