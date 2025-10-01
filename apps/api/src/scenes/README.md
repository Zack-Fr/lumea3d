# WebSocket Realtime Collaboration API

## Overview

The Lumea 3D viewer supports realtime collaboration through WebSocket connections with Server-Sent Events (SSE) fallback. This enables multiple users to collaboratively edit 3D scenes with real-time updates.

## Features

- **WebSocket namespace**: `/scenes` for realtime scene collaboration
- **Coalesced updates**: Operations batched and sent every 16ms (~60fps)
- **Optimistic locking**: Version-based conflict resolution
- **SSE fallback**: Server-Sent Events for environments blocking WebSockets
- **Delta operations**: Efficient partial updates instead of full state sync
- **Authentication**: JWT-based authentication for secure access

## WebSocket API

### Connection

Connect to the WebSocket namespace with JWT authentication:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/scenes', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Client → Server

**joinScene**
```javascript
socket.emit('joinScene', {
  projectId: 'project-123',
  sceneId: 'scene-456'
});
```

**leaveScene**
```javascript
socket.emit('leaveScene');
```

**sceneOperation**
```javascript
socket.emit('sceneOperation', {
  type: 'update',        // 'add' | 'update' | 'remove'
  target: 'item',        // 'scene' | 'item'
  id: 'item-789',
  data: {
    position_x: 10.5,
    position_y: 0.0,
    position_z: 5.2,
    rotation_y: 45.0
  }
});
```

**requestSync**
```javascript
socket.emit('requestSync', {
  version: 42  // Current client version
});
```

#### Server → Client

**connected**
```javascript
socket.on('connected', (data) => {
  console.log('Connected to scenes namespace:', data);
});
```

**sceneJoined**
```javascript
socket.on('sceneJoined', (data) => {
  console.log('Joined scene:', data.sceneId);
  console.log('Current version:', data.version);
  console.log('Scene manifest:', data.manifest);
});
```

**sceneDelta**
```javascript
socket.on('sceneDelta', (data) => {
  console.log('Scene delta received:', data.delta);
  // Apply operations to local scene state
  data.delta.operations.forEach(op => {
    applyOperation(op);
  });
});
```

**userJoined/userLeft**
```javascript
socket.on('userJoined', (data) => {
  console.log('User joined scene:', data.userId);
});

socket.on('userLeft', (data) => {
  console.log('User left scene:', data.userId);
});
```

**syncResponse**
```javascript
socket.on('syncResponse', (data) => {
  if (data.type === 'full') {
    // Replace entire scene state
    updateSceneState(data.manifest, data.version);
  } else {
    // Client is up to date
    console.log('Scene is synchronized');
  }
});
```

**error**
```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

## Server-Sent Events (SSE) Fallback

For environments where WebSockets are blocked, use SSE:

```javascript
const eventSource = new EventSource(
  '/projects/project-123/scenes/scene-456/events?clientId=client-abc',
  {
    headers: {
      'Authorization': 'Bearer your-jwt-token'
    }
  }
);

eventSource.addEventListener('connected', (event) => {
  const data = JSON.parse(event.data);
  console.log('Connected via SSE:', data);
});

eventSource.addEventListener('sceneState', (event) => {
  const data = JSON.parse(event.data);
  console.log('Initial scene state:', data);
});

eventSource.addEventListener('sceneDelta', (event) => {
  const data = JSON.parse(event.data);
  console.log('Scene delta via SSE:', data);
});

eventSource.addEventListener('heartbeat', (event) => {
  // Keep-alive heartbeat
});
```

## Delta Operations

### Operation Types

**Add Item**
```json
{
  "type": "add",
  "target": "item",
  "data": {
    "id": "new-item-123",
    "categoryKey": "chairs",
    "model": "office_chair_01",
    "transform": {
      "position": { "x": 0, "y": 0, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "scale": { "x": 1, "y": 1, "z": 1 }
    }
  }
}
```

**Update Item**
```json
{
  "type": "update",
  "target": "item",
  "id": "item-456",
  "data": {
    "position_x": 10.5,
    "rotation_y": 45.0
  }
}
```

**Remove Item**
```json
{
  "type": "remove",
  "target": "item",
  "id": "item-789"
}
```

**Update Scene**
```json
{
  "type": "update",
  "target": "scene",
  "data": {
    "scale": 1.2,
    "exposure": 1.5
  }
}
```

## Client Implementation Example

```javascript
class SceneCollaboration {
  constructor(apiUrl, token) {
    this.socket = io(`${apiUrl}/scenes`, { auth: { token } });
    this.sceneVersion = 0;
    this.pendingOperations = [];
    
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.socket.on('sceneJoined', (data) => {
      this.sceneVersion = data.version;
      this.updateScene(data.manifest);
    });
    
    this.socket.on('sceneDelta', (data) => {
      this.applyDelta(data.delta);
    });
    
    this.socket.on('error', (error) => {
      console.error('Collaboration error:', error);
    });
  }
  
  joinScene(projectId, sceneId) {
    this.socket.emit('joinScene', { projectId, sceneId });
  }
  
  updateItem(itemId, changes) {
    const operation = {
      type: 'update',
      target: 'item',
      id: itemId,
      data: changes
    };
    
    // Apply optimistically
    this.applyOperationLocally(operation);
    
    // Send to server
    this.socket.emit('sceneOperation', operation);
  }
  
  applyDelta(delta) {
    delta.operations.forEach(operation => {
      this.applyOperationLocally(operation);
    });
    
    this.sceneVersion = delta.toVersion;
  }
  
  applyOperationLocally(operation) {
    switch (operation.type) {
      case 'add':
        this.addItem(operation.data);
        break;
      case 'update':
        this.updateLocalItem(operation.id, operation.data);
        break;
      case 'remove':
        this.removeItem(operation.id);
        break;
    }
  }
}

// Usage
const collaboration = new SceneCollaboration('http://localhost:3001', jwtToken);
collaboration.joinScene('project-123', 'scene-456');
```

## Performance Considerations

- **Update Coalescing**: Operations are batched every 16ms to maintain 60fps
- **Delta Compression**: Only changed properties are transmitted
- **Optimistic Updates**: Local changes applied immediately for responsiveness
- **Conflict Resolution**: Version-based optimistic locking prevents conflicts
- **Connection Cleanup**: Automatic cleanup of stale connections

## Security

- **JWT Authentication**: Required for all WebSocket and SSE connections
- **Project Access Control**: Users can only join scenes they have access to
- **Rate Limiting**: Built-in protection against operation spam
- **Input Validation**: All operations validated before application