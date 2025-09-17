import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, EyeOff, Monitor, Crosshair, RotateCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useRealtimeConnection } from '../../features/realtime/hooks/useRealtimeConnection';
import { useAuth } from '../../providers/AuthProvider';
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
    enabled: !!sceneId
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

  // Auto-broadcast when in broadcast mode
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
      <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-sm">Viewport Sync</span>
            <Badge variant="secondary" className="text-xs">
              {connectedUsers.length} online
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(!isVisible)}
            className="p-2"
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
                <h4 className="text-xs font-medium text-gray-600">Connected Users</h4>
                
                <div className="space-y-1">
                  {connectedUsers.map((user) => {
                    const isFollowing = followingUserId === user.userId;
                    const hasViewport = viewportIndicators.has(user.userId);
                    
                    return (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between p-2 rounded border"
                        style={{ borderColor: `${user.color}20`, backgroundColor: `${user.color}05` }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: user.color }}
                          />
                          <span className="text-sm font-medium">{user.name}</span>
                          
                          {hasViewport && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              <Monitor size={8} className="mr-1" />
                              Active
                            </Badge>
                          )}
                          
                          {isFollowing && (
                            <Badge variant="default" className="text-xs px-1 py-0">
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
                            className="text-xs px-2 py-1 h-auto"
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
            <div className="text-xs text-gray-500 space-y-1">
              {syncMode === 'broadcast' && (
                <p className="flex items-center gap-1 text-blue-600">
                  <RotateCw size={10} className="animate-spin" />
                  Broadcasting your viewport to {connectedUsers.length} users
                </p>
              )}
              
              {syncMode === 'follow' && followingUserId && (
                <p className="flex items-center gap-1 text-green-600">
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
