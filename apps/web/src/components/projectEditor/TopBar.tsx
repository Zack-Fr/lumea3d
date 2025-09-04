import React from 'react';
import { Button } from "../ui/Button";
import { Separator } from "../ui/Separator";
import { Badge } from "../ui/Badge";
import { 
  ArrowLeft,
  Eye,
  Gamepad2,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Settings,
  Sparkles
} from "lucide-react";
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface TopBarProps {
  onNavigate: (page: string) => void;
  cameraMode: string;
  onCameraModeChange: (mode: string) => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  lightingMode: string;
  onLightingModeToggle: () => void;
  showProperties: boolean;
  onPropertiesToggle: () => void;
  onAIAssist: () => void;
}

const TopBar: React.FC<TopBarProps> = React.memo(({
  onNavigate,
  cameraMode,
  onCameraModeChange,
  soundEnabled,
  onSoundToggle,
  lightingMode,
  onLightingModeToggle,
//   showProperties,
  onPropertiesToggle,
  onAIAssist
}) => {
  return (
    <header className={styles.topBar}>
      <div className={styles.topBarLeft}>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onNavigate("dashboard")}
          className={styles.backButton}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        <Separator orientation="vertical" className={styles.topBarSeparator} />
        <h1 className={styles.topBarTitle}>3D Scene Editor</h1>
        <Badge className={styles.liveBadge}>Live</Badge>
      </div>

      <div className={styles.topBarRight}>
        {/* Perspective Controls */}
        <div className={styles.cameraControls}>
          <Button 
            variant={cameraMode === "orbit" ? "default" : "ghost"} 
            size="sm"
            onClick={() => onCameraModeChange("orbit")}
            className={cameraMode === "orbit" ? styles.cameraButtonActive : styles.cameraButton}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button 
            variant={cameraMode === "fps" ? "default" : "ghost"} 
            size="sm"
            onClick={() => onCameraModeChange("fps")}
            className={cameraMode === "fps" ? styles.cameraButtonActive : styles.cameraButton}
          >
            <Gamepad2 className="w-4 h-4" />
          </Button>
        </div>

        <div className={styles.controlButtons}>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onSoundToggle}
            className={styles.controlButton}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onLightingModeToggle}
            className={styles.controlButton}
          >
            {lightingMode === "day" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Button 
            variant="ghost"
            size="sm"
            onClick={onPropertiesToggle}
            className={styles.controlButton}
          >
            <Settings className="w-4 h-4" />
          </Button>

          <Button 
            size="sm"
            className={styles.aiAssistButton}
            onClick={onAIAssist}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Assist
          </Button>
        </div>
      </div>
    </header>
  );
});

TopBar.displayName = 'TopBar';

export default TopBar;