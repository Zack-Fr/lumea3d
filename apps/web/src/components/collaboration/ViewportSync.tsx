import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, EyeOff, Monitor, Crosshair, RotateCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useRealtimeConnection } from '../../features/realtime/hooks/useRealtimeConnection';
import { useAuth } from '../../providers/AuthProvider';
import { cameraStore } from '../../stores/cameraStore';
import type { ViewportState } from '../../features/realtime/types/realtime';

interface ViewportSyncProps {
  sceneId: string | null;
  currentCamera?: {
    position: [number, number, number];
    rotation: [number, number, number];
    target?: [number, number, number];
  };
  onCameraUpdate?: (position: [number, number, number], rotation: [number, number, number]) => void;
  onFollowUser?: (userId: string) => void;
  className?: string;
}

interface ViewportIndicator {
  userId: string;
  userName: string;
  color: string;
  viewport: ViewportState;
  lastUpdate: number;
}

const ViewportSync: React.FC<ViewportSyncProps> = ({
  sceneId,
  currentCamera,
  onCameraUpdate: _onCameraUpdate,
  onFollowUser,
  className = ''
}) => {
  const { token } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const [viewportIndicators, setViewportIndicators] = useState<Map<string, ViewportIndicator>>(new Map());
  const [syncMode, setSyncMode] = useState<'free' | 'follow' | 'broadcast'>('free');
  const lastCameraUpdateRef = useRef<number>(0);
  const broadcastIntervalRef = useRef<number | null>(null);

  const {
    users,
    connectionState,
    sendMessage
  } = useRealtimeConnection({
    token,
    sceneId,
    enabled: !!sceneId,
    onViewportSync: (event) => {
      console.log('📹 Received viewport sync from:', event.from, event.viewport);
      
      // Update camera store with remote camera position
      if (event.viewport.camera) {
        cameraStore.getState().setPose(
          { 
            p: event.viewport.camera.position, 
            t: event.viewport.camera.target || [0, 0, 0] 
          }, 
          'remote'
        );
        
        // Also call the callback for additional handling
        _onCameraUpdate?.(
          event.viewport.camera.position,
          event.viewport.camera.rotation || [0, 0, 0]
        );
      }
      
      // Update viewport indicators for visual feedback
      setViewportIndicators(prev => new Map(prev.set(event.from, {
        userId: event.from,
        userName: users.find(u => u.userId === event.from)?.name || 'Unknown',
        color: users.find(u => u.userId === event.from)?.color || '#ffffff',
        viewport: event.viewport,
        lastUpdate: Date.now()
      })));
      
      // If we're following this user, update our camera
      if (followingUserId === event.from && syncMode === 'follow' && event.viewport.camera) {
        console.log('👁️ Following user camera update:', event.from);
        cameraStore.getState().setPose(
          { 
            p: event.viewport.camera.position, 
            t: event.viewport.camera.target || [0, 0, 0] 
          }, 
          'remote'
        );
      }
    }
  });

  // Send viewport updates to other users
  const broadcastViewport = useCallback(() => {
    if (!currentCamera || !connectionState.isConnected) return;
    
    const now = Date.now();
    if (now - lastCameraUpdateRef.current < 100) return; // Throttle to 10fps
    
    const viewportState: ViewportState = {
      camera: {
        position: currentCamera.position,
        rotation: currentCamera.rotation,
        target: currentCamera.target
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    sendMessage({
      t: 'VIEWPORT_SYNC',
      viewport: viewportState
    });

    lastCameraUpdateRef.current = now;
  }, [currentCamera, connectionState.isConnected, sendMessage]);

  // Auto-broadcast camera changes for collaboration
  useEffect(() => {
    if (!connectionState.isConnected) return;
    
    const unsubscribe = cameraStore.subscribe(
      (state) => state,
      ({ pose, by }) => {
        // Only broadcast local camera changes to avoid loops
        if (by === 'local' && sceneId) {
          console.log('📹 Broadcasting local camera change:', pose);
          const viewportState: ViewportState = {
            camera: {
              position: pose.p,
              rotation: [0, 0, 0], // TODO: Add rotation support
              target: pose.t
            },
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            }
          };

          sendMessage({
            t: 'VIEWPORT_SYNC',
            viewport: viewportState
          });
        }
      }
    );

    return unsubscribe;
  }, [connectionState.isConnected, sceneId, sendMessage]);

  // Auto-broadcast when in broadcast mode (legacy)
  useEffect(() => {
    if (syncMode === 'broadcast' && currentCamera) {
      broadcastIntervalRef.current = setInterval(broadcastViewport, 200); // 5fps
      return () => {
        if (broadcastIntervalRef.current) {
          clearInterval(broadcastIntervalRef.current);
        }
      };
    }
  }, [syncMode, currentCamera, broadcastViewport]);

  // Clean up old viewport indicators
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setViewportIndicators(prev => {
        const updated = new Map(prev);
        for (const [userId, indicator] of updated.entries()) {
          if (now - indicator.lastUpdate > 10000) { // Remove after 10 seconds
            updated.delete(userId);
          }
        }
        return updated;
      });
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  // Handle follow user
  const handleFollowUser = (userId: string) => {
    if (followingUserId === userId) {
      setFollowingUserId(null);
      setSyncMode('free');
    } else {
      setFollowingUserId(userId);
      setSyncMode('follow');
      onFollowUser?.(userId);
    }
  };

  // Toggle broadcast mode
  const toggleBroadcast = () => {
    if (syncMode === 'broadcast') {
      setSyncMode('free');
    } else {
      setSyncMode('broadcast');
      setFollowingUserId(null);
    }
  };

  const activeUsers = users.filter(u => !u.isCurrentUser);
  const connectedUsers = activeUsers.filter(u => u.status === 'online');
  
  if (!sceneId || !connectionState.isConnected) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Viewport Sync Controls */}
      <div className="bg-[var(--glass-black)] rounded-lg border border-[var(--glass-border-dim)] p-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-sm text-white">Viewport Sync</span>
            <Badge variant="secondary" className="text-xs bg-[var(--glass-yellow)] text-black">
              {connectedUsers.length} online
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(!isVisible)}
            className="p-2 text-gray-300 hover:text-white hover:bg-[var(--glass-border-dim)]"
          >
            {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
          </Button>
        </div>

        {isVisible && (
          <div className="space-y-3">
            {/* Sync Mode Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={syncMode === 'free' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSyncMode('free');
                  setFollowingUserId(null);
                }}
                className="flex-1 text-xs"
              >
                <Crosshair size={12} className="mr-1" />
                Free
              </Button>
              
              <Button
                variant={syncMode === 'broadcast' ? 'default' : 'outline'}
                size="sm"
                onClick={toggleBroadcast}
                className="flex-1 text-xs"
              >
                <RotateCw size={12} className="mr-1" />
                Broadcast
              </Button>
            </div>

            {/* Active Users List */}
            {connectedUsers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-400">Connected Users</h4>
                
                <div className="space-y-1">
                  {connectedUsers.map((user) => {
                    const isFollowing = followingUserId === user.userId;
                    const hasViewport = viewportIndicators.has(user.userId);
                    
                    return (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between p-2 rounded border border-[var(--glass-border-dim)] bg-[var(--glass-black)]"
                        style={{ borderColor: `${user.color}20`, backgroundColor: `${user.color}05` }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: user.color }}
                          />
                          <span className="text-sm font-medium text-white">{user.name}</span>
                          
                          {hasViewport && (
                            <Badge variant="secondary" className="text-xs px-1 py-0 bg-[var(--glass-yellow)] text-black">
                              <Monitor size={8} className="mr-1" />
                              Active
                            </Badge>
                          )}
                          
                          {isFollowing && (
                            <Badge variant="default" className="text-xs px-1 py-0 bg-green-600 text-white">
                              Following
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant={isFollowing ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleFollowUser(user.userId)}
                            disabled={!hasViewport}
                            className="text-xs px-2 py-1 h-auto text-gray-300 hover:text-white hover:bg-[var(--glass-border-dim)] border-[var(--glass-border-dim)]"
                          >
                            <Eye size={10} className="mr-1" />
                            {isFollowing ? 'Unfollow' : 'Follow'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status Messages */}
            <div className="text-xs text-gray-400 space-y-1">
              {syncMode === 'broadcast' && (
                <p className="flex items-center gap-1 text-blue-400">
                  <RotateCw size={10} className="animate-spin" />
                  Broadcasting your viewport to {connectedUsers.length} users
                </p>
              )}
              
              {syncMode === 'follow' && followingUserId && (
                <p className="flex items-center gap-1 text-green-400">
                  <Eye size={10} />
                  Following {users.find(u => u.userId === followingUserId)?.name}'s viewport
                </p>
              )}
              
              {syncMode === 'free' && (
                <p>Independent viewport - click Follow to sync with others</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewportSync;
