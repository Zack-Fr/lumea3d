// src/viewer/EditorScene.tsx
import React from 'react';
import { useManifestStore } from '../stores/manifestStore';
import { SceneRenderer } from '../features/scenes/SceneRenderer';
import { CameraRig } from './CameraRig';
import { TransformGizmos } from '../features/scenes/TransformGizmos';

export const EditorScene = React.memo(function EditorScene({ sceneId }: { sceneId: string }) {
  const manifest = useManifestStore((s) => s.manifest);

  return (
    <>
      <CameraRig sceneId={sceneId} />
      {manifest && <SceneRenderer sceneId={sceneId} />}
      <TransformGizmos enabled={true} /> {/* uses selectionStore, not Context */}
    </>
  );
}, (a, b) => a.sceneId === b.sceneId);