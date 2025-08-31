import { useParams } from 'react-router-dom';
import { Suspense, Component, ErrorInfo, ReactNode } from 'react';
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

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Scene viewer error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Failed to load scene</h2>
            <p className="text-gray-400 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              className="px-4 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-500"
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ViewerContent({ projectId, sceneId }: { projectId: string; sceneId: string }) {
  const { data: manifest } = useSceneManifest(projectId, sceneId);
  
  // With suspense enabled, this component will only render when data is available
  // But TypeScript doesn't know that, so we add a safety check
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
    <SceneErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <ViewerContent projectId={projectId} sceneId={sceneId} />
      </Suspense>
    </SceneErrorBoundary>
  );
}