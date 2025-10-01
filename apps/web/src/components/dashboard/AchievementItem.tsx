import { memo } from "react";
import { Achievement } from "../../types/dashboard";
import styles from "../../pages/dashboard/UserDashboard.module.css";

interface AchievementItemProps {
  achievement: Achievement;
  onClick?: (achievement: Achievement) => void;
}

const AchievementItem = memo(({ achievement, onClick }: AchievementItemProps) => {
  const handleClick = () => {
    if (achievement.unlocked) {
      onClick?.(achievement);
    }
  };

  const getAchievementClass = () => {
    const baseClass = styles.achievementItem;
    const statusClass = achievement.unlocked ? styles.unlocked : styles.locked;
    return `${baseClass} ${statusClass}`;
  };

  const getIconClass = () => {
    const baseClass = styles.achievementIcon;
    const colorClass = styles[achievement.color];
    return `${baseClass} ${colorClass}`;
  };

  return (
    <div
      className={getAchievementClass()}
      onClick={handleClick}
      role={achievement.unlocked ? "button" : "img"}
      tabIndex={achievement.unlocked ? 0 : -1}
      onKeyDown={(e) => {
        if (achievement.unlocked && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Achievement: ${achievement.name}${achievement.unlocked ? ' (unlocked)' : ' (locked)'}`}
      title={achievement.name}
    >
      <div className={getIconClass()}>
        <achievement.icon className="w-4 h-4" aria-hidden="true" />
      </div>
      <span className={styles.achievementName}>
        {achievement.name}
      </span>
    </div>
  );
});

AchievementItem.displayName = "AchievementItem";

export default AchievementItem;