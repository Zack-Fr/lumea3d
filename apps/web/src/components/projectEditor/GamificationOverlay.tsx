import React from 'react';
import { motion } from "framer-motion";
import { Button } from "../ui/Button";
import { Progress } from "../ui/Progress";
import { Award, Zap } from "lucide-react";
import { GamificationData } from '../../types/projectEditor';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface GamificationOverlayProps {
  gamificationData: GamificationData;
  show: boolean;
  onClose: () => void;
}

const GamificationOverlay: React.FC<GamificationOverlayProps> = React.memo(({ 
  gamificationData, 
  show, 
  onClose 
}) => {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={styles.gamificationOverlay}
    >
      <div className={styles.gamificationContent}>
        <div className={styles.gamificationLevel}>
          <Award className="w-4 h-4 text-glass-yellow" />
          <span className={styles.gamificationLevelText}>Level {gamificationData.level}</span>
        </div>
        <div className={styles.gamificationProgress}>
          <Progress 
            value={(gamificationData.xp / gamificationData.nextLevelXp) * 100} 
            className="h-2"
          />
          <span className={styles.gamificationProgressText}>
            {gamificationData.xp}/{gamificationData.nextLevelXp}
          </span>
        </div>
        <div className={styles.gamificationStreak}>
          <Zap className="w-4 h-4 text-glass-yellow" />
          <span className={styles.gamificationStreakText}>{gamificationData.streak}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className={styles.gamificationClose}
        >
          ×
        </Button>
      </div>
    </motion.div>
  );
});

GamificationOverlay.displayName = 'GamificationOverlay';

export default GamificationOverlay;