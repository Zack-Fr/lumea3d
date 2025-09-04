import { useState, useCallback } from 'react';

export interface Project {
  id: number;
  name: string;
  client: string;
  stage: 'concept' | 'design' | 'feedback' | 'delivery';
  progress: number;
  dueDate: string;
  thumbnail: string;
}

export const useProjects = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleProjectClick = useCallback((project: Project) => {
    setSelectedProject(project);
  }, []);

  const handleFilterChange = useCallback((filter: string) => {
    setSelectedFilter(filter);
  }, []);

  return {
    selectedFilter,
    selectedProject,
    setSelectedFilter: handleFilterChange,
    onProjectClick: handleProjectClick,
  };
};