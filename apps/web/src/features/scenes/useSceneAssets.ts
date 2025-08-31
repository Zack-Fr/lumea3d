import type { SceneManifestV2 } from '@lumea/shared'

export function pickCategoryUrl(category: SceneManifestV2['categories'][string]) {
  // Prefer meshopt, fallback to draco, then glb_url
  return category.encodings?.meshopt_url ?? 
         category.encodings?.draco_url ?? 
         category.glb_url!
}

// We'll configure the loaders in the Canvas component
// drei's useGLTF automatically handles Draco and Meshopt decoding