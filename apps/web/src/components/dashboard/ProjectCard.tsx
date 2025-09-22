import { memo, useState, useRef, useEffect } from "react";
import { Project } from "../../types/dashboard";
import { Calendar, MoreVertical, Upload, Trash2 } from "lucide-react";
import { uploadCanvasScreenshot } from "../../utils/canvasScreenshot";
import { toast } from "react-toastify";
import ConfirmationModal from "../ui/ConfirmationModal";
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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
    console.log('🔧 Menu button clicked');
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    setShowMenu(!showMenu);
  };

  const handleThumbnailUpload = (e: React.MouseEvent) => {
    console.log('📷 Thumbnail upload clicked');
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    fileInputRef.current?.click();
    setShowMenu(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB.');
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
          const result = await uploadCanvasScreenshot(project.originalId || project.id.toString(), base64Data, 'custom');
          
          console.log('📷 Custom thumbnail uploaded:', result.thumbnailUrl);
          onThumbnailUpdate?.(project, result.thumbnailUrl);
        } catch (error) {
          console.error('❌ Thumbnail upload failed:', error);
          toast.error('Failed to upload thumbnail. Please try again.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('❌ File reading failed:', error);
      toast.error('Failed to read file. Please try again.');
      setIsUploading(false);
    }

    // Reset file input
    e.target.value = '';
  };

  const handleDeleteProject = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    setShowMenu(false);
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onProjectDelete?.(project);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
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
      onClick={(e) => {
        // Only navigate if we're not clicking on menu elements
        const target = e.target as HTMLElement;
        const isMenuClick = target.closest('[data-menu]') !== null;
        if (!isMenuClick) {
          handleClick();
        }
      }}
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
          <div 
            ref={menuRef} 
            style={{ position: 'relative' }}
            data-menu
            onClick={(e) => {
              console.log('🔒 Menu container clicked');
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
          >
            <button 
              className={styles.projectMenu}
              aria-label={`More options for ${project.name}`}
              onClick={handleMenuClick}
              disabled={isUploading}
            >
              <MoreVertical className="w-6 h-6" />
            </button>
            
            {showMenu && (
              <div 
                className={styles.projectDropdown || 'project-dropdown'}
                onClick={(e) => { 
                  console.log('🔒 Dropdown container clicked'); 
                  e.preventDefault();
                  e.stopPropagation(); 
                  e.nativeEvent.stopImmediatePropagation();
                }}
              >
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
        data-menu
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete the project "${project.name}"? This action cannot be undone and will permanently remove all project data.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
});

ProjectCard.displayName = "ProjectCard";

export default ProjectCard;