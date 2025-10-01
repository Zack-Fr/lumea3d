import { memo } from "react";
import { Folder, Plus, AlertCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { useUserProjects, ProjectWithScenes } from "../../hooks/useProjects";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../app/paths";
import UserProjectCard from "./UserProjectCard";

interface UserProjectsSectionProps {
  className?: string;
}

const UserProjectsSection = memo(({ className = "" }: UserProjectsSectionProps) => {
  const navigate = useNavigate();
  const { data: projects, isLoading, error } = useUserProjects();

  const handleProjectClick = (project: ProjectWithScenes) => {
    // Navigate to the first scene in the project or project dashboard
    if (project.scenes3D.length > 0) {
      navigate(ROUTES.projectSceneEditor(project.id, project.scenes3D[0].id));
    } else {
      navigate(ROUTES.project(project.id));
    }
  };

  const handleCreateProject = () => {
    navigate(ROUTES.dashboard());
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h4 className="font-medium text-white mb-3 flex items-center gap-2">
          <Folder className="w-4 h-4 text-[var(--glass-yellow)]" />
          Your Projects
        </h4>
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="glass rounded-lg p-4 animate-pulse">
              <div className="aspect-video bg-white/5 rounded mb-3"></div>
              <div className="h-4 bg-white/5 rounded mb-2"></div>
              <div className="h-3 bg-white/5 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h4 className="font-medium text-white mb-3 flex items-center gap-2">
          <Folder className="w-4 h-4 text-[var(--glass-yellow)]" />
          Your Projects
        </h4>
        <div className="flex items-center gap-2 p-3 glass rounded-lg text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm">Failed to load projects</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Folder className="w-4 h-4 text-[var(--glass-yellow)]" />
          Your Projects
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateProject}
          className="text-[var(--glass-gray)] hover:text-white p-1"
          aria-label="Create new project"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {projects && projects.length > 0 ? (
        <div className="space-y-3">
          {projects.slice(0, 3).map((project, index) => (
            <UserProjectCard
              key={project.id}
              project={project}
              index={index}
              onClick={handleProjectClick}
            />
          ))}
          {projects.length > 3 && (
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(ROUTES.dashboard())}
                className="text-[var(--glass-gray)] hover:text-white text-xs"
              >
                View all {projects.length} projects
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-6 glass rounded-lg">
          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mx-auto mb-3">
            <Folder className="w-6 h-6 text-[var(--glass-yellow)]" />
          </div>
          <p className="text-sm text-[var(--glass-gray)] mb-3">
            No projects yet
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateProject}
            className="glass border-glow text-white hover:bg-white/10"
          >
            Create Your First Project
          </Button>
        </div>
      )}
    </div>
  );
});

UserProjectsSection.displayName = 'UserProjectsSection';

export default UserProjectsSection;