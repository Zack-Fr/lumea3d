# Task 2: Realtime WebSocket + SSE Updates - Implementation

## 🎯 Objective
Update `useSceneChannel` for WebSocket primary with SSE fallback, implement flat SSE alias `/scenes/:sceneId/events`, test both connection methods with token auth, and add proper reconnection logic and state sync.

## ✅ Implementation Summary

### **Core Features Implemented:**

1. **WebSocket Primary Connection**
   - Uses `/scenes` namespace with Bearer token auth via `auth` object  
   - Automatic connection to scene rooms
   - Real-time `scene:delta` event handling

2. **SSE Fallback Connection**
   - Flat route `/scenes/:sceneId/events` 
   - Token authentication via query parameter (EventSource limitation)
   - Last-Event-ID support for reconnection
   - Automatic fallback when WebSocket fails

3. **Connection Management**
   - Automatic fallback from WebSocket to SSE (5-second timeout)
   - Exponential backoff reconnection (max 5 attempts)
   - Connection state tracking (connected, type, error, reconnecting)
   - Proper cleanup and connection handling

4. **Authentication Integration**
   - Bearer token authentication for both connections
   - Automatic token updates via AuthProvider integration
   - Token validation and connection management

## 🔧 Technical Implementation

### **useSceneChannel Hook API:**

```typescript
interface SceneChannelState {
  connected: boolean
  connectionType: 'websocket' | 'sse' | null
  error: string | null
  reconnecting: boolean
}

interface SceneChannelOptions {
  enabled?: boolean
  onDelta?: (delta: SceneDelta) => void
  onError?: (error: Error) => void
  onConnectionChange?: (state: SceneChannelState) => void
}

function useSceneChannel(
  sceneId: string,
  options?: SceneChannelOptions
): SceneChannelState & { reconnect: () => void }
```

### **Connection Flow:**

1. **Primary**: WebSocket connection to `/scenes` namespace
   - Auth via `auth: { token }` object
   - Listens for `scene:delta` events
   - 5-second connection timeout

2. **Fallback**: SSE connection to `/scenes/:sceneId/events`
   - Auth via `?token=xyz` query parameter  
   - Handles `message` events with JSON delta parsing
   - Last-Event-ID tracking for reconnection

3. **Reconnection**: Exponential backoff with connection type preference
   - Maintains SSE connection type if previously connected via SSE
   - Falls back to full connection logic for WebSocket reconnection

### **Backend Integration:**

- **WebSocket Gateway**: `/scenes` namespace with `WsSceneGuard`
- **SSE Controller**: `/scenes/:sceneId/events` with `JwtAuthGuard` + `ScenesAuthGuard`  
- **Authentication**: Bearer token support for both connection types
- **Delta Broadcasting**: Unified event system for real-time updates

## 🧪 Testing

### **Test Component: `SceneChannelTest.tsx`**
- Visual connection status display
- Real-time connection type indicator  
- Error state handling
- Manual reconnection testing
- Feature implementation checklist

### **Manual Testing Steps:**
1. Load test component with valid scene ID
2. Verify WebSocket connection (if server running)
3. Test SSE fallback (simulate WebSocket failure)
4. Test token authentication
5. Test reconnection logic
6. Test delta event handling

## 📊 Connection Reliability

### **Fallback Strategy:**
- **WebSocket fails** → Automatic SSE fallback within 5 seconds
- **SSE fails** → Exponential backoff reconnection (1s, 2s, 4s, 8s, 16s)
- **Max attempts** → Connection stops after 5 failed reconnection attempts
- **Token refresh** → Automatic reconnection when new token provided

### **Error Handling:**
- Connection state tracking with detailed error messages
- Graceful degradation when connections fail
- User feedback via connection status indicators
- Optional error callbacks for custom handling

## 🔄 Real-time Features

### **Delta Operations:**
- Automatic query cache invalidation on scene updates
- Customizable delta handling via `onDelta` callback
- JSON parsing with error handling for malformed messages
- Timestamp tracking for event ordering

### **State Synchronization:**
- Connection state updates trigger React re-renders
- Optional `onConnectionChange` callback for external state management
- Manual reconnect function for user-initiated connection retry
- Proper cleanup on component unmount

## 🚀 Next Steps

With Task 2 complete, the realtime infrastructure is now ready for:

- **Task 3**: Shell UI Controls Integration with real-time state sync
- **Task 4**: Asset Processing Pipeline with progress updates via SSE/WebSocket  
- **Task 5**: Performance monitoring with real-time metrics reporting

## 🔧 Usage Example

```typescript
// In a React component
const { connected, connectionType, error, reconnect } = useSceneChannel(
  sceneId,
  {
    enabled: !!token && !!sceneId,
    onDelta: (delta) => {
      console.log('Scene updated:', delta);
      // Handle real-time scene changes
    },
    onError: (error) => {
      console.error('Connection error:', error);
      // Handle connection errors
    },
    onConnectionChange: (state) => {
      console.log('Connection changed:', state);
      // Update UI based on connection state
    }
  }
);
```

## ✅ Acceptance Criteria Met

- ✅ **WebSocket Primary**: `/scenes` namespace with token auth
- ✅ **SSE Fallback**: `/scenes/:sceneId/events` flat route  
- ✅ **Token Authentication**: Both connection methods support Bearer tokens
- ✅ **Reconnection Logic**: Exponential backoff with connection type preference
- ✅ **State Sync**: Real-time delta handling with query cache invalidation
- ✅ **Error Handling**: Comprehensive error states and user feedback
- ✅ **Testing**: Test component and manual verification procedures