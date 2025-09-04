import React from 'react';
import { Separator } from "../ui/Separator";
import { Target } from "lucide-react";
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface ViewportSettingsProps {
  cameraMode: string;
  renderMode: string;
}

const ViewportSettings: React.FC<ViewportSettingsProps> = React.memo(({
  cameraMode,
  renderMode
}) => {
  return (
    <div className={styles.viewportSettings}>
      <div className={styles.settingsContent}>
        <div className={styles.settingsItem}>
          <Target className="w-4 h-4 text-glass-yellow" />
          <span className={styles.settingsItemText}>{cameraMode === "fps" ? "FPS" : "Orbit"}</span>
        </div>
        <Separator orientation="vertical" className={styles.settingsSeparator} />
        <div className={styles.settingsItem}>
          <span className={styles.settingsItemText}>{renderMode}</span>
        </div>
      </div>
    </div>
  );
});

ViewportSettings.displayName = 'ViewportSettings';

export default ViewportSettings;