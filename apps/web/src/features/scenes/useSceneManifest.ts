import { useQuery } from '@tanstack/react-query'
import type { SceneManifestV2 } from '@lumea/shared'

// Environment variable for development mock data
const USE_MOCK_MANIFEST = import.meta.env.VITE_USE_MOCK_MANIFEST === 'true'

async function fetchSceneManifest(projectId: string, sceneId: string): Promise<SceneManifestV2> {
  console.log('🔄 Fetching scene manifest:', { projectId, sceneId, useMock: USE_MOCK_MANIFEST });
  
  // For development, optionally use mock data
  if (USE_MOCK_MANIFEST) {
    const response = await fetch('/mock/scene-manifest-v2.json')
    if (!response.ok) {
      throw new Error('Failed to load mock manifest')
    }
    const data = await response.json()
    console.log('✅ Mock manifest loaded:', data);
    return data
  }

  // Production API call with project-scoped endpoint
  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const response = await fetch(
    `${apiUrl}/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneId)}/manifest`,
    {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to load scene manifest: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  console.log('✅ Production manifest loaded:', data);
  return data
}

export function useSceneManifest(projectId: string, sceneId: string) {
  return useQuery({
    queryKey: ['scene-manifest', projectId, sceneId],
    queryFn: () => fetchSceneManifest(projectId, sceneId),
    enabled: !!projectId && !!sceneId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && error.message.includes('4')) {
        return false
      }
      return failureCount < 3
    },
    suspense: true, // Enable suspense mode
  })
}