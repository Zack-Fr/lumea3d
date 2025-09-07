import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion } from "framer-motion";
import { Box, Loader2 } from "lucide-react";
import { ViewportMovement } from '../../types/projectEditor';
import { useSceneContext } from '../../contexts/SceneContext';
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

  // Log for debugging
  console.log('ViewportCanvas scene state:', { sceneId, projectId, isLoading, error });

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
                      Stage: {loading.stage} • {Math.round(loading.progress * 100)}%
                    </p>
                    <div className={styles.viewportInstructions}>
                      <span>Categories: {loading.loadedCategories.length}/{loading.availableCategories.length}</span>
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
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />

        {/* Scene Content */}
        <Suspense fallback={null}>
          {/* 3D scene content will be rendered here */}
        </Suspense>

        {/* Camera Controls */}
        {/* TODO: Integrate WASD controls with Three.js camera */}
      </Canvas>

      {/* Scene Loading UI */}
      {sceneId && (
        <StagedSceneLoader 
          sceneId={sceneId}
          onManifestLoaded={(loadedManifest) => {
            console.log('🎯 3D Scene loaded:', loadedManifest);
          }}
          onLoadingStateChange={(loading) => {
            console.log('🔄 3D Scene loading state:', loading);
          }}
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