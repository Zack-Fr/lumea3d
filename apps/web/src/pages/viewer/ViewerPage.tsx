import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import type { SceneManifestV2 } from '@/services/scenesApi';
import SceneViewer from '@/features/scenes/SceneViewer';
import { ScenePersistenceProvider } from '@/features/scenes/ScenePersistenceContext';

// Loading component for the viewer
function ViewerLoading() {
  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl">
        Loading Scene...
      </div>
    </div>
  );
}

// Error component for failed manifest loading
function ViewerError({ error }: { error: string }) {
  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
      <div className="text-red-400 text-xl max-w-md text-center">
        <h2 className="mb-4">Failed to Load Scene</h2>
        <p className="text-sm opacity-80">{error}</p>
      </div>
    </div>
  );
}

export default function ViewerPage() {
  const { sceneId } = useParams<{ sceneId: string }>();
  const [manifest, setManifest] = useState<SceneManifestV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadManifest() {
      if (!sceneId) {
        setError('No scene ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // For demo scenes, load from mock data
        if (sceneId === 'demo') {
          const response = await fetch('/mock/scene-manifest-v2.json');
          if (!response.ok) {
            throw new Error(`Failed to load manifest: ${response.statusText}`);
          }
          const manifestData = await response.json();
          
          // Basic validation
          if (!manifestData.version || !manifestData.categories || !manifestData.items) {
            throw new Error('Invalid manifest format');
          }
          
          setManifest(manifestData as SceneManifestV2);
        } else {
          // For real scenes, load from API (not implemented yet)
          throw new Error('Real scene loading not implemented yet');
        }
      } catch (err) {
        console.error('Failed to load scene manifest:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadManifest();
  }, [sceneId]);

  if (loading) {
    return <ViewerLoading />;
  }

  if (error) {
    return <ViewerError error={error} />;
  }

  if (!manifest) {
    return <ViewerError error="No manifest data loaded" />;
  }

  return (
    <div className="h-screen w-screen">
      <ScenePersistenceProvider 
        sceneId={sceneId || 'unknown'}
        initialManifest={manifest}
        userId="demo-user"
        userRole="editor"
      >
        <Suspense fallback={<ViewerLoading />}>
          <SceneViewer 
            key={`scene-viewer-${manifest.scene.id}`}
            manifest={manifest} 
          />
        </Suspense>
      </ScenePersistenceProvider>
    </div>
  );
}