import { useQuery } from '@tanstack/react-query'
import type { SceneManifestV2 } from '@lumea/shared'

export function useSceneManifest(projectId: string, sceneId: string) {
  return useQuery({
    queryKey: ['manifest', projectId, sceneId],
    queryFn: async (): Promise<SceneManifestV2> => {
      const res = await fetch(`/api/projects/${projectId}/scenes/${sceneId}/manifest`, { 
        credentials: 'include' 
      })
      if (!res.ok) throw new Error('Failed to load manifest')
      return res.json()
    },
    enabled: !!projectId && !!sceneId,
  })
}