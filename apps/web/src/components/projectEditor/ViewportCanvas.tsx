import React from 'react';
import { motion } from "framer-motion";
import { Box } from "lucide-react";
import { ViewportMovement } from '../../types/projectEditor';
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
  return (
    <div 
      ref={viewportRef}
      className={styles.viewportCanvas}
      onClick={onViewportClick}
      tabIndex={0}
    >
      {/* Immersive 3D Canvas Background */}
      <div className={styles.viewportBackground}></div>
      
      {/* 3D Scene Placeholder */}
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
                <Box className={styles.viewportIcon} />
              </div>
              <p className={styles.viewportTitle}>3D Scene Viewport</p>
              <p className={styles.viewportDescription}>Drag assets from the panel to add to scene</p>
              <div className={styles.viewportInstructions}>
                <span>WASD to move</span>
                <span>•</span>
                <span>Mouse to look</span>
              </div>
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
});

ViewportCanvas.displayName = 'ViewportCanvas';

export default ViewportCanvas;