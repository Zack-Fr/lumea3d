import { memo } from "react";
import { UpcomingDeadline } from "../../types/dashboard";
import styles from "../../pages/dashboard/UserDashboard.module.css";

interface DeadlineItemProps {
  deadline: UpcomingDeadline;
  onClick?: (deadline: UpcomingDeadline) => void;
}

const DeadlineItem = memo(({ deadline, onClick }: DeadlineItemProps) => {
  const handleClick = () => {
    onClick?.(deadline);
  };

  const getBadgeClass = () => {
    const baseClass = styles.deadlineBadge;
    const priorityClass = styles[deadline.priority];
    return `${baseClass} ${priorityClass}`;
  };

  const getDaysClass = () => {
    const baseClass = styles.deadlineDays;
    if (deadline.daysLeft <= 3) return `${baseClass} ${styles.urgent}`;
    if (deadline.daysLeft <= 7) return `${baseClass} ${styles.soon}`;
    return `${baseClass} ${styles.normal}`;
  };

  return (
    <div
      className={styles.deadlineItem}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Deadline: ${deadline.project} due ${deadline.dueDate} (${deadline.daysLeft} days left)`}
    >
      <div className={styles.deadlineHeader}>
        <h4 className={styles.deadlineTitle}>
          {deadline.project}
        </h4>
        <span className={getBadgeClass()}>
          {deadline.priority}
        </span>
      </div>
      
      <p className={styles.deadlineClient}>
        Client: {deadline.client}
      </p>
      
      <div className={styles.deadlineFooter}>
        <span className={styles.deadlineDate}>
          Due {deadline.dueDate}
        </span>
        <span className={getDaysClass()}>
          {deadline.daysLeft} days left
        </span>
      </div>
    </div>
  );
});

DeadlineItem.displayName = "DeadlineItem";

export default DeadlineItem;