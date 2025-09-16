import { memo } from "react";
import { motion } from "framer-motion";
import { Eye, Calendar, Users } from "lucide-react";
import { Card } from "../ui/Card";
import { ProjectWithScenes } from "../../hooks/useProjects";

interface UserProjectCardProps {
  project: ProjectWithScenes;
  index: number;
  onClick?: (project: ProjectWithScenes) => void;
}

const UserProjectCard = memo(({ project, index, onClick }: UserProjectCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleClick = () => {
    onClick?.(project);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="cursor-pointer"
      onClick={handleClick}
    >
      <Card className="glass border-glow hover:border-[var(--glass-yellow)] transition-all duration-300 group">
        <div className="relative overflow-hidden rounded-lg">
          {/* Project Thumbnail */}
          <div className="aspect-video bg-gradient-to-br from-[var(--glass-purple)] to-[var(--glass-blue)] relative overflow-hidden">
            {(project.customThumbnailUrl || project.thumbnailUrl) ? (
              <img
                src={project.customThumbnailUrl || project.thumbnailUrl}
                alt={project.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-[var(--glass-yellow)]" />
                </div>
              </div>
            )}
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="text-white font-medium">Open Project</div>
            </div>
          </div>

          {/* Project Info */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-white truncate flex-1 mr-2">
                {project.name}
              </h4>
              <div className="text-xs text-[var(--glass-gray)] shrink-0">
                {project.scenes3D.length} scene{project.scenes3D.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Project Stats */}
            <div className="flex items-center gap-4 text-xs text-[var(--glass-gray)]">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(project.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{project._count.members} member{project._count.members !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

UserProjectCard.displayName = 'UserProjectCard';

export default UserProjectCard;