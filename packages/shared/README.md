# Lumea API Client

This package contains the automatically generated TypeScript client for the Lumea API, along with comprehensive type definitions and utilities for easy integration.

## Features

- **Full TypeScript Support**: Complete type safety with automatically generated types from OpenAPI specification
- **Multiple API Endpoints**: Organized by functional areas (Assets, Authentication, Scenes, Projects, Users)
- **Optimistic Locking**: Built-in support for If-Match headers and version conflict handling
- **3D Scene Management**: Comprehensive scene manipulation with category filtering and manifest generation
- **Asset Processing**: Background processing pipeline with status tracking and retry mechanisms
- **Real-time Updates**: Server-Sent Events for live scene updates

## Installation

```bash
# Install the shared package in your project
pnpm add @lumea/shared
```

## Quick Start

### Basic Usage

```typescript
import { createLumeaApiClient } from '@lumea/shared';

// Create a client instance
const api = createLumeaApiClient({
  baseURL: 'https://api.lumea.dev', // or http://localhost:3001 for development
  accessToken: 'your-jwt-token'
});

// Use the API
const projects = await api.projects.findAll();
const scene = await api.scenes.findOne('scene-id');
```

### Authentication

```typescript
import { createLumeaApiClient } from '@lumea/shared';

const api = createLumeaApiClient();

// Login
const loginResponse = await api.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// Set the access token for subsequent requests
api.setAccessToken(loginResponse.data.accessToken);

// Now make authenticated requests
const userProfile = await api.users.getCurrentUser();
```

### Scene Management with Optimistic Locking

```typescript
import { createLumeaApiClient, SceneManifestV2 } from '@lumea/shared';

const api = createLumeaApiClient({ accessToken: 'your-token' });

// Get scene with current version
const scene = await api.scenes.findOne('scene-id');

// Update scene with optimistic locking
try {
  const updatedScene = await api.scenes.update(
    'scene-id',
    scene.data.version.toString(), // If-Match header
    {
      name: 'Updated Scene Name',
      scale: 1.5
    }
  );
} catch (error) {
  if (error.response?.status === 412) {
    console.log('Scene was modified by another user, please refresh and try again');
  }
}
```

### Scene Manifest with Category Filtering

```typescript
// Get complete scene manifest
const manifest: SceneManifestV2 = await api.scenes.generateManifest('scene-id');

// Get manifest with only specific categories
const filteredManifest = await api.scenes.generateManifest(
  'scene-id', 
  'furniture,lighting', // categories filter
  true // include metadata
);

// Discover available categories
const categories = await api.scenes.getSceneCategories('scene-id');
console.log('Available categories:', categories.data.categories);
```

### Asset Processing Pipeline

```typescript
// Upload asset
const uploadUrl = await api.assets.getUploadUrl({
  filename: 'model.gltf',
  contentType: 'model/gltf+json'
});

// ... upload file to presigned URL ...

// Mark upload as complete to trigger processing
await api.assets.markUploadComplete(uploadUrl.data.assetId);

// Monitor processing status
const status = await api.assets.getProcessingStatus(uploadUrl.data.assetId);
console.log('Processing status:', status.data);

// Retry processing if needed
if (status.data.status === 'failed') {
  await api.assets.retryProcessing(uploadUrl.data.assetId);
}
```

### Real-time Scene Updates

```typescript
// Subscribe to scene updates via Server-Sent Events
const eventSource = new EventSource(
  \`http://localhost:3001/scenes/\${sceneId}/events?token=\${accessToken}\`
);

eventSource.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Scene update:', update);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};
```

## API Organization

The client is organized into logical API groups:

- **`api.auth`**: Authentication and user session management
- **`api.users`**: User profile and management
- **`api.projects`**: Project creation and management  
- **`api.scenes`**: Scene CRUD operations with flat routes
- **`api.assets`**: Asset upload, processing, and management
- **`api.sse`**: Server-Sent Events for real-time updates

## Type Safety

All API responses and request bodies are fully typed:

```typescript
import type { 
  SceneManifestV2, 
  CreateSceneItemDto, 
  UpdateSceneDto 
} from '@lumea/shared';

// TypeScript will provide full autocomplete and type checking
const newItem: CreateSceneItemDto = {
  categoryKey: 'furniture.chair',
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  // ... other required fields
};
```

## Error Handling

The client includes proper error handling for common scenarios:

```typescript
import { AxiosError } from 'axios';

try {
  const result = await api.scenes.update(sceneId, version, updateData);
} catch (error) {
  if (error instanceof AxiosError) {
    switch (error.response?.status) {
      case 401:
        console.log('Authentication required');
        break;
      case 403:
        console.log('Insufficient permissions');
        break;
      case 412:
        console.log('Version conflict - scene was modified by another user');
        break;
      case 404:
        console.log('Scene not found');
        break;
      default:
        console.log('Unknown error:', error.message);
    }
  }
}
```

## Development

### Regenerating the Client

When the API changes, regenerate the client:

```bash
# Regenerate OpenAPI spec and client
pnpm generate:client

# Or step by step:
pnpm generate:openapi      # Generate OpenAPI spec
pnpm generate:client:types # Generate TypeScript types
pnpm generate:client:sdk   # Generate API client SDK
```

### Building the Package

```bash
cd packages/shared
pnpm build
```

## OpenAPI Specification

The complete OpenAPI specification is available at:

- Development: <http://localhost:3001/docs>
- Production: <https://api.lumea.dev/docs>

The generated `openapi.json` file contains the complete API specification used to generate this client.