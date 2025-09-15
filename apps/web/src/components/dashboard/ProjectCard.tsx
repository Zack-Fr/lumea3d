import { memo, useState, useRef, useEffect } from "react";
import { Project } from "../../types/dashboard";
import { Calendar, MoreVertical, Upload, Trash2 } from "lucide-react";
import { uploadCanvasScreenshot } from "../../utils/canvasScreenshot";
import styles from "../../pages/dashboard/UserDashboard.module.css";

interface ProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  onThumbnailUpdate?: (project: Project, thumbnailUrl: string) => void;
  onProjectDelete?: (project: Project) => void;
}

const ProjectCard = memo(({ project, onClick, onThumbnailUpdate, onProjectDelete }: ProjectCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    onClick?.(project);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleThumbnailUpload = () => {
    fileInputRef.current?.click();
    setShowMenu(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = event.target?.result as string;
          
          // Upload as custom thumbnail
          const result = await uploadCanvasScreenshot(project.id, base64Data, 'custom');
          
          console.log('📷 Custom thumbnail uploaded:', result.thumbnailUrl);
          onThumbnailUpdate?.(project, result.thumbnailUrl);
        } catch (error) {
          console.error('❌ Thumbnail upload failed:', error);
          alert('Failed to upload thumbnail. Please try again.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('❌ File reading failed:', error);
      alert('Failed to read file. Please try again.');
      setIsUploading(false);
    }

    // Reset file input
    e.target.value = '';
  };

  const handleDeleteProject = () => {
    setShowMenu(false);
    
    if (confirm(`Are you sure you want to delete the project "${project.name}"? This action cannot be undone.`)) {
      onProjectDelete?.(project);
    }
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
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button 
              className={styles.projectMenu}
              aria-label={`More options for ${project.name}`}
              onClick={handleMenuClick}
              disabled={isUploading}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {showMenu && (
              <div className={styles.projectDropdown || 'project-dropdown'}>
                <button
                  onClick={handleThumbnailUpload}
                  className={styles.dropdownItem || 'dropdown-item'}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Uploading...' : 'Upload Thumbnail'}
                </button>
                <button
                  onClick={handleDeleteProject}
                  className={`${styles.dropdownItem || 'dropdown-item'} ${styles.deleteItem || 'delete-item'}`}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Project
                </button>
              </div>
            )}
          </div>
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
      
      {/* Hidden file input for thumbnail upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
});

ProjectCard.displayName = "ProjectCard";

export default ProjectCard;