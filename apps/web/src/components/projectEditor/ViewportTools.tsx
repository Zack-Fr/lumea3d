import React from 'react';
import { Button } from "../ui/Button";
import { 
  MousePointer,
  Hand,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize
} from "lucide-react";
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

const ViewportTools: React.FC = React.memo(() => {
  return (
    <div className={styles.viewportTools}>
      <div className={styles.toolsPanel}>
        <div className={styles.toolsGrid}>
          <Button variant="ghost" size="sm" className={styles.toolButton}>
            <MousePointer className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className={styles.toolButton}>
            <Hand className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className={styles.toolButton}>
            <Move className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className={styles.toolButton}>
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className={styles.toolsPanel}>
        <div className={styles.zoomControls}>
          <Button variant="ghost" size="sm" className={styles.toolButton}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className={styles.toolButton}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className={styles.toolButton}>
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

ViewportTools.displayName = 'ViewportTools';

export default ViewportTools;