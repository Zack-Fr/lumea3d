import { memo } from "react";
import { RecentActivity } from "../../types/dashboard";
import styles from "../../pages/dashboard/UserDashboard.module.css";

interface ActivityItemProps {
  activity: RecentActivity;
  onClick?: (activity: RecentActivity) => void;
}

const ActivityItem = memo(({ activity, onClick }: ActivityItemProps) => {
  const handleClick = () => {
    onClick?.(activity);
  };

  const getIconClass = () => {
    const baseClass = styles.activityIcon;
    const colorClass = styles[activity.color];
    return `${baseClass} ${colorClass}`;
  };

  return (
    <div
      className={styles.activityItem}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Activity: ${activity.message} - ${activity.time}`}
    >
      <div className={getIconClass()}>
        <activity.icon className="w-4 h-4" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p className={styles.activityMessage}>
          {activity.message}
        </p>
        <p className={styles.activityTime}>
          {activity.time}
        </p>
      </div>
    </div>
  );
});

ActivityItem.displayName = "ActivityItem";

export default ActivityItem;