import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateProject } from '../../hooks/useProjects';
import { useAuth } from '../../providers/AuthProvider';
import { log } from '../../utils/logger';
import { ROUTES } from '../../app/paths';
import { CtaLink } from '../../shared/ui/CtaLink';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import s from './ProjectCreation.module.css';

interface ProjectCreationPageProps {
  // Props if needed
}

const ProjectCreationPage: React.FC<ProjectCreationPageProps> = () => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [category, setCategory] = useState('');
  const [isCreating, setIsCreating] = useState(false);


  const { token, user, isAuthenticated } = useAuth();
  log('debug', 'ProjectCreationPage: Auth state check', {
    hasToken: !!token,
    tokenLength: token?.length,
    hasUser: !!user,
    isAuthenticated,
    userId: user?.id
  });

  const createProject = useCreateProject({
    onSuccess: (result) => {
      // Navigate directly to the editor with projectId and sceneId
      navigate(ROUTES.projectSceneEditor(result.projectId, result.sceneId));
    },
    onError: (error) => {
      console.error('Failed to create project:', error);
      setIsCreating(false);
      // TODO: Show error toast/notification
    },
  });

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setIsCreating(true);
    
    try {
      await createProject.mutateAsync({
        name: projectName.trim(),
      });
    } catch (error) {
      // Error handling is done in the onError callback
    }
  };

  const handleCancel = () => {
    navigate(ROUTES.dashboard());
  };

  return (
    <div className={s.projectCreationWrap}>
      {/* Back Button - positioned at top left of screen */}
      <div className={s.backButtonContainer}>
        <CtaLink to={ROUTES.dashboard()} variant="custom" className={s.backButton} aria-label="Back to Dashboard">
          <ArrowLeft className={s.backButtonIcon} />
          Back to Dashboard
        </CtaLink>
      </div>

      {/* Cinematic Background Effects */}
      <div className={s.backgroundEffects} aria-hidden="true">
        <div className={s.backgroundOrb1}></div>
        <div className={s.backgroundOrb2}></div>
        <div className={s.backgroundOrb3}></div>
      </div>

      <div className={s.contentWrapper}>
        {/* Logo Header */}
        <header className={s.header}>
          <div className={s.logoContainer}>
            <div className={s.logoCircle} aria-hidden="true"></div>
            <span className={s.title}>Lumea</span>
          </div>
          <p className={s.headerSubtitle}>
            Create a new project
          </p>
        </header>

        <div className={s.card} role="dialog" aria-label="Create New Project">
          <form onSubmit={(e) => { e.preventDefault(); handleCreateProject(); }} className={s.form} noValidate>
            <div>
              <label htmlFor="projectName" className={s.label}>Project Name</label>
              <div className={s.row}>
                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className={s.input}
                  placeholder="Enter project name..."
                  disabled={isCreating}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="category" className={s.label}>Category</label>
              <div className={s.row}>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={s.select}
                  disabled={isCreating}
                >
                  <option value="">Select a category (optional)</option>
                  <option value="architecture">Architecture</option>
                  <option value="interior-design">Interior Design</option>
                  <option value="landscape">Landscape</option>
                  <option value="urban-planning">Urban Planning</option>
                  <option value="product-design">Product Design</option>
                  <option value="education">Education</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {(createProject.error) && (
              <div className={s.error} role="alert">
                {createProject.error.message || 'Failed to create project. Please try again.'}
              </div>
            )}

            <div className={s.actions}>
              <button type="submit" className={s.submit} disabled={isCreating || !projectName.trim()}>
                <Sparkles width={18} height={18} style={{ marginRight: 8 }} />
                {isCreating ? 'Creating...' : 'Create Project'}
              </button>

              <button type="button" className={s.secondaryBtn} onClick={handleCancel} disabled={isCreating}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectCreationPage;