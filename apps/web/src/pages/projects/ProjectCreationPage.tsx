import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateProject } from '../../hooks/useProjects';
import { ROUTES } from '../../app/paths';

interface ProjectCreationPageProps {
  // Props if needed
}

const ProjectCreationPage: React.FC<ProjectCreationPageProps> = () => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createProject = useCreateProject({
    onSuccess: (result) => {
      console.log('Project created successfully:', result);
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
      alert('Please enter a project name');
      return;
    }

    setIsCreating(true);
    
    try {
      await createProject.mutateAsync({
        name: projectName.trim(),
        // Optional: Add default scene configuration
        scene: {
          spawn: {
            position: [0, 1.7, 5.0],
            yaw_deg: 0,
          },
          environment: {
            intensity: 1.0,
          },
          exposure: 1.0,
        },
      });
    } catch (error) {
      // Error handling is done in the onError callback
      console.error('Create project mutation failed:', error);
    }
  };

  const handleCancel = () => {
    navigate(ROUTES.dashboard());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Create New Project
        </h1>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-300 mb-2">
              Project Name
            </label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="Enter project name..."
              disabled={isCreating}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) {
                  handleCreateProject();
                }
              }}
            />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleCancel}
              disabled={isCreating}
              className="flex-1 px-6 py-3 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateProject}
              disabled={isCreating || !projectName.trim()}
              className="flex-1 px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>

        {createProject.error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-300 text-sm">
              {createProject.error.message || 'Failed to create project. Please try again.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCreationPage;