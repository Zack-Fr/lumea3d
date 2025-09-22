import React from 'react';
import { motion } from "framer-motion";
import { Award } from "lucide-react";
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface AchievementNotificationProps {
  show: boolean;
  message: string;
}

const AchievementNotification: React.FC<AchievementNotificationProps> = React.memo(({ 
  show, 
  message 
}) => {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -50 }}
      className={styles.achievementNotification}
    >
      <div className={styles.achievementContent}>
        <div className={styles.achievementIcon}>
          <Award className="w-6 h-6 text-glass-yellow" />
        </div>
        <div>
          <p className={styles.achievementMessage}>{message}</p>
        </div>
      </div>
    </motion.div>
  );
});

AchievementNotification.displayName = 'AchievementNotification';

export default AchievementNotification;