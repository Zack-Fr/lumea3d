import { memo } from "react";
import { QuickAction } from "../../types/dashboard";
import { ArrowRight } from "lucide-react";
import styles from "../../pages/dashboard/UserDashboard.module.css";

interface QuickActionButtonProps {
  action: QuickAction;
  onClick?: (action: string) => void;
}

const QuickActionButton = memo(({ action, onClick }: QuickActionButtonProps) => {
  const handleClick = () => {
    onClick?.(action.action);
  };

  const getIconClass = () => {
    const baseClass = styles.quickActionIcon;
    const colorClass = styles[action.color];
    return `${baseClass} ${colorClass}`;
  };

  return (
    <button
      className={styles.quickActionButton}
      onClick={handleClick}
      aria-label={`Quick action: ${action.name}`}
    >
      <div className={getIconClass()}>
        <action.icon className="w-4 h-4" aria-hidden="true" />
      </div>
      <span className={styles.quickActionText}>
        {action.name}
      </span>
      <ArrowRight className={styles.quickActionArrow} aria-hidden="true" />
    </button>
  );
});

QuickActionButton.displayName = "QuickActionButton";

export default QuickActionButton;