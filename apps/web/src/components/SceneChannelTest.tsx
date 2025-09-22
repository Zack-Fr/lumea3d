/**
 * React component demonstrating the updated useSceneChannel hook
 * with WebSocket primary and SSE fallback functionality
 */

import useSceneChannel from '../hooks/useSceneChannel';
import { useAuth } from '../providers/AuthProvider';

interface SceneChannelTestProps {
  sceneId: string;
}

export default function SceneChannelTest({ sceneId }: SceneChannelTestProps) {
  const { user, token } = useAuth();
  
  // Use the updated useSceneChannel hook
  const { connected, connectionType, error, reconnecting, reconnect } = useSceneChannel(
    sceneId,
    {
      enabled: !!token && !!sceneId,
      onDelta: (delta) => {
        console.log('🔄 Scene delta received:', delta);
      },
      onError: (error) => {
        console.error('❌ Connection error:', error);
      },
      onConnectionChange: (state) => {
        console.log('🔗 Connection state changed:', state);
      }
    }
  );

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-3">Realtime Connection Status</h3>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">Scene ID:</span>
          <span className="text-gray-600">{sceneId}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="font-medium">User:</span>
          <span className="text-gray-600">{user?.email || 'Not authenticated'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="font-medium">Status:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            connected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {connectionType && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Connection Type:</span>
            <span className={`px-2 py-1 rounded text-sm ${
              connectionType === 'websocket' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {connectionType === 'websocket' ? 'WebSocket' : 'Server-Sent Events'}
            </span>
          </div>
        )}
        
        {reconnecting && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <span className="px-2 py-1 rounded text-sm bg-yellow-100 text-yellow-800">
              Reconnecting...
            </span>
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Error:</span>
            <span className="px-2 py-1 rounded text-sm bg-red-100 text-red-800">
              {error}
            </span>
          </div>
        )}
        
        <div className="pt-2">
          <button
            onClick={reconnect}
            disabled={connected || reconnecting}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:bg-gray-300"
          >
            Reconnect
          </button>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
        <h4 className="font-medium mb-2">Implementation Features:</h4>
        <ul className="space-y-1 text-gray-600">
          <li>✅ WebSocket primary connection to /scenes namespace</li>
          <li>✅ Bearer token authentication via auth object</li>
          <li>✅ SSE fallback to /scenes/:sceneId/events flat route</li>
          <li>✅ Token authentication via query parameter for SSE</li>
          <li>✅ Last-Event-ID support for SSE reconnection</li>
          <li>✅ Automatic fallback on WebSocket failure</li>
          <li>✅ Exponential backoff reconnection logic</li>
          <li>✅ Query cache invalidation on deltas</li>
        </ul>
      </div>
    </div>
  );
}