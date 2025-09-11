import React, { useState, useCallback } from 'react';
import { Button } from "../ui/Button";
import { Slider } from "../ui/Slider";
import { ScrollArea } from "../ui/ScrollArea";
import { 
  Camera,
  Move3d,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Target,
  Home,
  Maximize,
  Eye
} from "lucide-react";
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface CameraControlsTabProps {
  show?: boolean;
  cameraMode: string;
  onCameraModeChange: (mode: string) => void;
  minDistance?: number;
  maxDistance?: number;
  moveSpeed?: number;
  onZoomLimitsChange?: (min: number, max: number) => void;
  onMoveSpeedChange?: (speed: number) => void;
  onCameraPreset?: (preset: string) => void;
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
  onControlsToggle?: (control: string, enabled: boolean) => void;
  // Clipping plane props
  nearClip?: number;
  farClip?: number;
  onClippingChange?: (near: number, far: number) => void;
}

const CameraControlsTab: React.FC<CameraControlsTabProps> = ({
  show = true,
  cameraMode,
  onCameraModeChange,
  minDistance = 0.1,
  maxDistance = 500,
  moveSpeed = 5,
  onZoomLimitsChange,
  onMoveSpeedChange,
  onCameraPreset,
  enablePan = true,
  enableZoom = true,
  enableRotate = true,
  onControlsToggle,
  // Clipping plane props
  nearClip = 0.1,
  farClip = 1000,
  onClippingChange
}) => {
  // Local state for camera controls
  const [localMinDistance, setLocalMinDistance] = useState(minDistance);
  const [localMaxDistance, setLocalMaxDistance] = useState(maxDistance);
  const [localMoveSpeed, setLocalMoveSpeed] = useState(moveSpeed);
  const [localNearClip, setLocalNearClip] = useState(nearClip);
  const [localFarClip, setLocalFarClip] = useState(farClip);

  // Camera mode selection
  const handleCameraModeSelect = useCallback((mode: string) => {
    onCameraModeChange(mode);
  }, [onCameraModeChange]);

  // Zoom limits handlers
  const handleMinDistanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = parseFloat(e.target.value);
    setLocalMinDistance(newMin);
    if (onZoomLimitsChange && newMin < localMaxDistance) {
      onZoomLimitsChange(newMin, localMaxDistance);
    }
  }, [localMaxDistance, onZoomLimitsChange]);

  const handleMaxDistanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = parseFloat(e.target.value);
    setLocalMaxDistance(newMax);
    if (onZoomLimitsChange && newMax > localMinDistance) {
      onZoomLimitsChange(localMinDistance, newMax);
    }
  }, [localMinDistance, onZoomLimitsChange]);

  // Move speed handler
  const handleMoveSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const speed = parseFloat(e.target.value);
    setLocalMoveSpeed(speed);
    if (onMoveSpeedChange) {
      onMoveSpeedChange(speed);
    }
  }, [onMoveSpeedChange]);

  // Camera preset handlers
  const handlePresetClick = useCallback((preset: string) => {
    if (onCameraPreset) {
      onCameraPreset(preset);
    }
  }, [onCameraPreset]);

  // Controls toggle handler
  const handleControlToggle = useCallback((control: string, enabled: boolean) => {
    if (onControlsToggle) {
      onControlsToggle(control, enabled);
    }
  }, [onControlsToggle]);

  // Clipping plane handlers
  const handleNearClipChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newNear = parseFloat(e.target.value);
    setLocalNearClip(newNear);
    if (onClippingChange && newNear < localFarClip) {
      onClippingChange(newNear, localFarClip);
    }
  }, [localFarClip, onClippingChange]);

  const handleFarClipChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFar = parseFloat(e.target.value);
    setLocalFarClip(newFar);
    if (onClippingChange && newFar > localNearClip) {
      onClippingChange(localNearClip, newFar);
    }
  }, [localNearClip, onClippingChange]);

  if (!show) return null;

  return (
    <div className={styles.cameraControlsTab}>
      <ScrollArea className={styles.assetsScrollArea}>
        <div className={styles.assetsContainer}>
          
          {/* Camera Mode Section */}
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <Camera className={styles.sectionIcon} />
              Camera Mode
            </h3>
            <div className={styles.buttonGroup}>
              <Button
                variant={cameraMode === 'orbit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCameraModeSelect('orbit')}
                className={`${styles.modeButton} ${cameraMode === 'orbit' ? styles.modeButtonActive : ''}`}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Orbit Camera
              </Button>
              <Button
                variant={cameraMode === 'fps' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCameraModeSelect('fps')}
                className={`${styles.modeButton} ${cameraMode === 'fps' ? styles.modeButtonActive : ''}`}
              >
                <Move3d className="w-4 h-4 mr-2" />
                FPS Camera (WASD)
              </Button>
            </div>
          </div>

          {/* Zoom Limits Section */}
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <ZoomIn className={styles.sectionIcon} />
              Zoom Range
            </h3>
            <div className={styles.controlGroup}>
              <div className={styles.sliderContainer}>
                <label className={styles.sliderLabel}>
                  Min Distance: {localMinDistance.toFixed(1)}
                </label>
                <Slider
                  value={localMinDistance}
                  onChange={handleMinDistanceChange}
                  min={0.01}
                  max={50}
                  step={0.1}
                  className={styles.slider}
                />
              </div>
              <div className={styles.sliderContainer}>
                <label className={styles.sliderLabel}>
                  Max Distance: {localMaxDistance.toFixed(0)}
                </label>
                <Slider
                  value={localMaxDistance}
                  onChange={handleMaxDistanceChange}
                  min={10}
                  max={1000}
                  step={10}
                  className={styles.slider}
                />
              </div>
            </div>
          </div>

          {/* Clipping Planes Section */}
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <ZoomOut className={styles.sectionIcon} />
              Clipping Planes
            </h3>
            <div className={styles.controlGroup}>
              <div className={styles.sliderContainer}>
                <label className={styles.sliderLabel}>
                  Near Clip: {localNearClip.toFixed(3)}
                </label>
                <Slider
                  value={localNearClip}
                  onChange={handleNearClipChange}
                  min={0.001}
                  max={10}
                  step={0.001}
                  className={styles.slider}
                />
              </div>
              <div className={styles.sliderContainer}>
                <label className={styles.sliderLabel}>
                  Far Clip: {localFarClip.toFixed(0)}
                </label>
                <Slider
                  value={localFarClip}
                  onChange={handleFarClipChange}
                  min={100}
                  max={10000}
                  step={100}
                  className={styles.slider}
                />
              </div>
            </div>
            <div className={styles.helpText}>
              <small>• Near: Objects closer than this won't render</small><br/>
              <small>• Far: Objects further than this won't render</small>
            </div>
          </div>

          {/* Movement Settings Section */}
          {cameraMode === 'fps' && (
            <div className={styles.sectionContainer}>
              <h3 className={styles.sectionTitle}>
                <Move3d className={styles.sectionIcon} />
                Movement
              </h3>
              <div className={styles.sliderContainer}>
                <label className={styles.sliderLabel}>
                  Move Speed: {localMoveSpeed.toFixed(1)}
                </label>
                <Slider
                  value={localMoveSpeed}
                  onChange={handleMoveSpeedChange}
                  min={0.5}
                  max={20}
                  step={0.5}
                  className={styles.slider}
                />
              </div>
            </div>
          )}

          {/* Camera Controls Toggle Section */}
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <Eye className={styles.sectionIcon} />
              Controls
            </h3>
            <div className={styles.toggleGroup}>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Pan</span>
                <Button
                  variant={enablePan ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleControlToggle('pan', !enablePan)}
                  className={`${styles.toggleButton} ${enablePan ? styles.toggleButtonActive : ''}`}
                >
                  {enablePan ? 'On' : 'Off'}
                </Button>
              </div>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Zoom</span>
                <Button
                  variant={enableZoom ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleControlToggle('zoom', !enableZoom)}
                  className={`${styles.toggleButton} ${enableZoom ? styles.toggleButtonActive : ''}`}
                >
                  {enableZoom ? 'On' : 'Off'}
                </Button>
              </div>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Rotate</span>
                <Button
                  variant={enableRotate ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleControlToggle('rotate', !enableRotate)}
                  className={`${styles.toggleButton} ${enableRotate ? styles.toggleButtonActive : ''}`}
                >
                  {enableRotate ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
          </div>

          {/* Camera Presets Section */}
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <Target className={styles.sectionIcon} />
              Quick Presets
            </h3>
            <div className={styles.presetGrid}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick('reset')}
                className={styles.presetButton}
              >
                <Home className="w-3 h-3 mr-1" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick('top')}
                className={styles.presetButton}
              >
                <Eye className="w-3 h-3 mr-1" />
                Top View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick('iso')}
                className={styles.presetButton}
              >
                <Maximize className="w-3 h-3 mr-1" />
                Isometric
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick('focus')}
                className={styles.presetButton}
              >
                <Target className="w-3 h-3 mr-1" />
                Focus Selected
              </Button>
            </div>
          </div>

          {/* Help Section */}
          <div className={styles.helpSection}>
            <h4 className={styles.helpTitle}>Controls Help:</h4>
            <ul className={styles.helpList}>
              <li>• Orbit: Click + drag to rotate</li>
              <li>• FPS: WASD to move, mouse to look</li>
              <li>• Scroll wheel to zoom in/out</li>
              <li>• Middle mouse to pan</li>
            </ul>
          </div>
          
        </div>
      </ScrollArea>
    </div>
  );
};

export default CameraControlsTab;
