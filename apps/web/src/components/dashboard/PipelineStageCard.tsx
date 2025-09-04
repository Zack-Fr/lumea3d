import { memo } from "react";
import { PipelineStage } from "../../types/dashboard";
import styles from "../../pages/dashboard/UserDashboard.module.css";

interface PipelineStageCardProps {
  stage: PipelineStage;
  index: number;
}

const PipelineStageCard = memo(({ stage, index }: PipelineStageCardProps) => {
  return (
    <div 
      className={styles.pipelineStage}
      style={{ 
        animationDelay: `${index * 0.1}s` 
      }}
    >
      <div className={styles.pipelineStageCard}>
        <div className={styles.pipelineStageIcon}>
          <stage.icon 
            className="w-5 h-5 text-[var(--glass-yellow)]" 
            aria-hidden="true"
          />
        </div>
        <div className={styles.pipelineStageCount}>
          {stage.count}
        </div>
        <p className={styles.pipelineStageLabel}>
          {stage.label}
        </p>
      </div>
    </div>
  );
});

PipelineStageCard.displayName = "PipelineStageCard";

export default PipelineStageCard;