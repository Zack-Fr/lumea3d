import { memo } from "react";
import { Project } from "../../types/dashboard";
import { Calendar, MoreVertical } from "lucide-react";
import styles from "../../pages/dashboard/UserDashboard.module.css";

interface ProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
}

const ProjectCard = memo(({ project, onClick }: ProjectCardProps) => {
  const handleClick = () => {
    onClick?.(project);
  };

  const getBadgeClass = () => {
    switch (project.stage) {
      case "delivery":
        return styles.projectBadge + " " + styles.delivery;
      case "design":
        return styles.projectBadge + " " + styles.design;
      case "feedback":
        return styles.projectBadge + " " + styles.feedback;
      default:
        return styles.projectBadge;
    }
  };

  return (
    <div 
      className={styles.projectCard}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Project: ${project.name} by ${project.client}`}
    >
      <div className={styles.projectImage}>
        <img 
          src={project.thumbnail} 
          alt={project.name}
          loading="lazy"
        />
        <div className={styles.projectOverlay} />
      </div>
      
      <div className={styles.projectContent}>
        <div className={styles.projectHeader}>
          <h3 className={styles.projectTitle}>{project.name}</h3>
          <button 
            className={styles.projectMenu}
            aria-label={`More options for ${project.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        
        <p className={styles.projectDescription}>
          Client: {project.client}
        </p>
        
        <div className={styles.projectStatus}>
          <span className={getBadgeClass()}>
            {project.stage}
          </span>
          <span className={styles.projectProgress}>
            {project.progress}%
          </span>
        </div>
        
        <div className={styles.projectProgressBar}>
          <div 
            className={styles.projectProgressFill}
            style={{ width: `${project.progress}%` }}
          />
        </div>
        
        <div className={styles.projectDueDate}>
          <Calendar className="w-4 h-4" aria-hidden="true" />
          <span>Due {project.dueDate}</span>
        </div>
      </div>
    </div>
  );
});

ProjectCard.displayName = "ProjectCard";

export default ProjectCard;