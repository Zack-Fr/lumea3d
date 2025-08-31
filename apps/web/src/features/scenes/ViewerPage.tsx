import { useParams } from 'react-router-dom';
import { Suspense } from 'react';
import SceneViewer from './SceneViewer';
import { useSceneManifest } from './useSceneManifest';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p>Loading 3D scene...</p>
      </div>
    </div>
  );
}

function ViewerContent({ projectId, sceneId }: { projectId: string; sceneId: string }) {
  const { data: manifest, isLoading, error } = useSceneManifest(projectId, sceneId);
  
  if (isLoading) {
    return <LoadingFallback />;
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Failed to load scene</h2>
          <p className="text-gray-400">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }
  
  if (!manifest) {
    return <LoadingFallback />;
  }
  
  return (
    <div className="h-screen w-full">
      <SceneViewer manifest={manifest} />
    </div>
  );
}

export default function ViewerPage() {
  const { projectId, sceneId } = useParams<{
    projectId: string;
    sceneId: string;
  }>();
  
  if (!projectId || !sceneId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Invalid route</h2>
          <p className="text-gray-400">Project ID and Scene ID are required</p>
        </div>
      </div>
    );
  }
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ViewerContent projectId={projectId} sceneId={sceneId} />
    </Suspense>
  );
}