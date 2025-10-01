# Scene Asset Download API

This module provides comprehensive asset download capabilities for 3D scenes with CDN integration support, proper caching headers, and multiple asset variants.

## Features

### 🔗 Download Endpoints

#### 1. Scene Manifest Download
**GET** `/projects/:projectId/scenes/:sceneId/download/manifest`

Downloads all assets referenced in a scene manifest.

```typescript
// Query Parameters
{
  variant?: 'original' | 'meshopt' | 'draco' | 'navmesh',
  cacheDuration?: number, // seconds (60-86400)
  includeCdn?: boolean
}

// Response
{
  sceneId: string,
  sceneName: string,
  assets: AssetDownloadInfo[],
  totalSize: number,
  assetCount: number,
  generatedAt: string
}
```

#### 2. Batch Asset Download
**POST** `/projects/:projectId/scenes/:sceneId/download/batch`

Downloads specific asset categories from a scene.

```typescript
// Request Body
{
  categoryKeys: string[], // ['chairs', 'tables', 'lamps']
  variant?: 'original' | 'meshopt' | 'draco' | 'navmesh',
  cacheDuration?: number,
  includeCdn?: boolean
}
```

#### 3. Individual Asset Download
**GET** `/projects/:projectId/scenes/:sceneId/download/assets/:assetId`

Downloads a specific asset with presigned URL.

#### 4. Direct Asset Redirect
**GET** `/projects/:projectId/scenes/:sceneId/download/assets/:assetId/redirect`

Immediately redirects to asset download with proper headers.

#### 5. Asset Metadata
**GET** `/projects/:projectId/scenes/:sceneId/download/assets/:assetId/metadata`

Returns asset metadata for client-side caching.

### Asset Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| `original` | Original uploaded GLB file | High-quality viewing |
| `meshopt` | Meshopt compressed | Balanced quality/size |
| `draco` | Draco compressed | Smallest file size |
| `navmesh` | Navigation mesh | Pathfinding |

### Caching & CDN

#### Cache Headers
All download responses include proper caching headers:

```http
Cache-Control: public, max-age=3600
ETag: "asset-id-variant-timestamp"
Last-Modified: Wed, 21 Oct 2015 07:28:00 GMT
```

#### CDN Integration
When `includeCdn: true` and `CDN_BASE_URL` is configured:

```typescript
{
  downloadUrl: "https://minio.example.com/lumea-assets/...",
  cdnUrl: "https://cdn.example.com/assets/...", // CDN URL
  // ... other fields
}
```

### 🔐 Authentication

All endpoints require JWT authentication:

```http
Authorization: Bearer <jwt-token>
```

### Response Format

#### AssetDownloadInfo
```typescript
{
  assetId: string,
  categoryKey: string,
  filename: string,
  downloadUrl: string,
  cdnUrl?: string,
  variant: AssetVariant,
  fileSize: number,
  contentType: string,
  cacheHeaders: {
    'Cache-Control': string,
    ETag: string,
    'Last-Modified': string
  },
  expiresAt: string
}
```

## Usage Examples

### Download Scene Manifest (Client)

```typescript
const response = await fetch(
  '/projects/proj123/scenes/scene456/download/manifest?variant=meshopt&includeCdn=true',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const manifest = await response.json();
console.log(`Scene has ${manifest.assetCount} assets (${manifest.totalSize} bytes)`);

// Download assets in parallel
const downloads = manifest.assets.map(asset => {
  return fetch(asset.cdnUrl || asset.downloadUrl);
});

await Promise.all(downloads);
```

### Batch Download Specific Categories

```typescript
const categories = ['chairs', 'tables', 'lighting'];

const response = await fetch(
  '/projects/proj123/scenes/scene456/download/batch',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      categoryKeys: categories,
      variant: 'draco',
      cacheDuration: 7200, // 2 hours
      includeCdn: true
    })
  }
);

const batchResult = await response.json();
```

### Direct Asset Download with Caching

```typescript
// First, check if we have a cached version
const metadataResponse = await fetch(
  '/projects/proj123/scenes/scene456/download/assets/asset789/metadata',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'If-None-Match': cachedETag // Client's cached ETag
    }
  }
);

if (metadataResponse.status === 304) {
  // Use cached version
  return cachedAsset;
}

// Download fresh version
window.location.href = 
  '/projects/proj123/scenes/scene456/download/assets/asset789/redirect?variant=meshopt';
```

## Configuration

### Environment Variables

```bash
# CDN Configuration (optional)
CDN_BASE_URL=https://cdn.example.com

# Storage Configuration
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin123
STORAGE_BUCKET_NAME=lumea-assets
```

### Asset Variant URLs

Assets are stored with the following structure:

```
assets/
  {userId}/
    {category}/
      {assetId}/
        original.glb          # Original upload
        processed/
          meshopt/
            optimized.glb     # Meshopt compressed
          draco/
            compressed.glb    # Draco compressed
          navmesh/
            navmesh.glb       # Navigation mesh
```

## Error Handling

### Common Error Responses

```typescript
// Asset not found
{
  statusCode: 404,
  message: "Asset not found or not ready",
  error: "Not Found"
}

// Variant not available
{
  statusCode: 404,
  message: "Asset variant 'draco' not available",
  error: "Not Found"
}

// Scene access denied
{
  statusCode: 404,
  message: "Scene not found or access denied",
  error: "Not Found"
}
```

### Graceful Degradation

The download service automatically falls back to available variants:

1. Try requested variant
2. Fall back to `meshopt` if available
3. Fall back to `original` if available
4. Return 404 if no variants available

## Integration with Scene System

The download API integrates seamlessly with the scenes management system:

- **Scene Manifests**: Automatically includes all assets referenced in scene items
- **Category Filtering**: Downloads only assets for specific categories
- **Version Tracking**: Respects scene versioning for cache invalidation
- **Realtime Updates**: Can be triggered from WebSocket scene updates

## Performance Considerations

### Presigned URL Caching
- URLs are valid for the specified cache duration (default: 1 hour)
- ETag-based caching prevents unnecessary re-downloads
- CDN URLs provide global edge caching

### Batch Operations
- Parallel URL generation for multiple assets
- Efficient database queries with proper indexing
- Graceful error handling for individual asset failures

### Asset Size Optimization
- Automatic variant selection based on client preferences
- Progressive loading support (metadata → download)
- Compression-aware content delivery