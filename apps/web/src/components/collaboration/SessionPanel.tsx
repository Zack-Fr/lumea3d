import React, { useState } from 'react';
import { Users, Eye, EyeOff, LogOut, Crown, Clock, RefreshCw, X, Monitor } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useInvitations } from '../../hooks/useInvitations';
import { useRealtimeConnection } from '../../features/realtime/hooks/useRealtimeConnection';
import { useAuth } from '../../providers/AuthProvider';
import type { SessionResponse } from '../../services/invitationsApi';

interface SessionPanelProps {
  className?: string;
  showActiveOnly?: boolean;
  sceneId?: string | null;
}

const SessionPanel: React.FC<SessionPanelProps> = ({
  className = '',
  showActiveOnly = false,
  sceneId = null
}) => {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const { user, token } = useAuth();
  const {
    activeSessions,
    currentSession,
    isLoading,
    endSession,
    leaveSession,
    refreshSessions
  } = useInvitations();

  // Get realtime connection state for current session
  const { users: realtimeUsers, connectionState } = useRealtimeConnection({
    token,
    sceneId: sceneId,
    enabled: !!sceneId && !!token
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const isSessionOwner = (session: SessionResponse) => {
    return session.ownerId === user?.id;
  };

  const getParticipantStatus = (participantId: string) => {
    console.log('🔍 Looking for participant:', participantId, 'in realtime users:', realtimeUsers.map(u => ({ userId: u.userId, id: u.id, name: u.name, status: u.status })));
    const realtimeUser = realtimeUsers.find(u => u.userId === participantId);
    if (!realtimeUser) {
      console.log('❌ Participant not found in realtime users, marking as offline');
      return 'offline';
    }
    console.log('✅ Found realtime user:', realtimeUser.name, 'status:', realtimeUser.status);
    return realtimeUser.status;
  };

  const sessionsToShow = showActiveOnly 
    ? activeSessions.filter(s => s.status === 'active') 
    : activeSessions;

  if (sessionsToShow.length === 0) {
    return (
      <Card className={`p-6 text-center text-gray-400 bg-[var(--glass-black)] border-[var(--glass-border-dim)] ${className}`}>
        <Users size={32} className="mx-auto mb-3 opacity-50 text-gray-400" />
        <p className="font-medium text-white">No active sessions</p>
        <p className="text-sm mt-1 text-gray-400">
          {showActiveOnly 
            ? "Start collaborating by accepting an invitation" 
            : "Your collaboration history will appear here"
          }
        </p>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-white">Active Sessions</h3>
          <Badge variant="secondary" className="text-xs bg-[var(--glass-yellow)] text-black">
            {sessionsToShow.length}
          </Badge>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshSessions}
          disabled={isLoading}
          className="gap-2 text-gray-300 hover:text-white hover:bg-[var(--glass-border-dim)]"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {sessionsToShow.map((session) => {
          const isOwner = isSessionOwner(session);
          const isCurrentSession = currentSession?.id === session.id;
          const isExpanded = expandedSession === session.id;

          return (
            <Card key={session.id} className={`transition-all bg-[var(--glass-black)] border-[var(--glass-border-dim)] ${isCurrentSession ? 'ring-2 ring-[var(--glass-yellow)]' : ''}`}>
              {/* Session Header */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium truncate text-white">{session.projectName}</h4>
                      
                      {session.status === 'active' && (
                        <Badge variant="default" className="text-xs bg-green-600 text-white">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                          Live
                        </Badge>
                      )}
                      
                      {isCurrentSession && (
                        <Badge variant="secondary" className="text-xs bg-[var(--glass-yellow)] text-black">
                          <Monitor size={10} className="mr-1" />
                          Current
                        </Badge>
                      )}
                      
                      {isOwner && (
                        <Crown size={14} className="text-yellow-400" />
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>Owner: {session.ownerName}</p>
                      <p>Started: {formatTime(session.createdAt)}</p>
                      <p>Duration: {getDuration(session.createdAt, session.endedAt)}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    {/* Real-time connection status */}
                    {isCurrentSession && (
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                          connectionState.isConnected ? 'bg-green-500' : 
                          connectionState.isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                        }`} />
                        <span className="text-xs text-gray-400">
                          {connectionState.isConnected ? 'Connected' : 
                           connectionState.isConnecting ? 'Connecting...' : 'Disconnected'}
                        </span>
                      </div>
                    )}
                    
                    {/* Expand/Collapse */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      className="p-2"
                    >
                      {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>

                    {/* Leave/End Session */}
                    {session.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => isOwner ? endSession(session.id) : leaveSession(session.id)}
                        className={`gap-1 ${isOwner ? 'text-red-600 hover:text-red-700' : ''}`}
                      >
                        {isOwner ? (
                          <>
                            <X size={12} />
                            End Session
                          </>
                        ) : (
                          <>
                            <LogOut size={12} />
                            Leave
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-[var(--glass-border-dim)] p-4 bg-[var(--glass-black)]">
                  <div className="space-y-4">
                    {/* Participants */}
                    <div>
                      <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-white">
                        <Users size={14} />
                        Participants ({session.participants.length})
                      </h5>
                      
                      <div className="space-y-2">
                        {session.participants.map((participant) => {
                          const status = getParticipantStatus(participant.id);
                          
                          return (
                            <div key={participant.id} className="flex items-center justify-between p-2 bg-[var(--glass-black)] rounded border border-[var(--glass-border-dim)]">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium text-white">
                                  {participant.name.charAt(0).toUpperCase()}
                                </div>
                                
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-white">{participant.name}</span>
                                    {participant.id === session.ownerId && (
                                      <Crown size={12} className="text-yellow-400" />
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400">{participant.email}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={status === 'online' ? 'default' : 'secondary'} 
                                  className="text-xs"
                                >
                                  {status === 'online' && <div className="w-2 h-2 bg-green-400 rounded-full mr-1" />}
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </Badge>
                                
                                <span className="text-xs text-gray-400">{participant.role}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Real-time Users (if current session) */}
                    {isCurrentSession && realtimeUsers.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-white">
                          <Monitor size={14} />
                          Currently Active ({realtimeUsers.length})
                        </h5>
                        
                        <div className="flex gap-2 flex-wrap">
                          {realtimeUsers.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center gap-2 px-3 py-1 bg-[var(--glass-black)] rounded-full border border-[var(--glass-border-dim)] text-sm text-white"
                              style={{ borderColor: user.color }}
                            >
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: user.color }}
                              />
                              <span>{user.name}</span>
                              {user.isCurrentUser && (
                                <Badge variant="secondary" className="text-xs px-1 py-0 bg-[var(--glass-yellow)] text-black">You</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Session Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-[var(--glass-black)] p-3 rounded border border-[var(--glass-border-dim)]">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                          <Clock size={12} />
                          <span>Duration</span>
                        </div>
                        <p className="font-medium text-white">{getDuration(session.createdAt, session.endedAt)}</p>
                      </div>
                      
                      <div className="bg-[var(--glass-black)] p-3 rounded border border-[var(--glass-border-dim)]">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                          <Users size={12} />
                          <span>Peak Users</span>
                        </div>
                        <p className="font-medium text-white">{session.participants.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SessionPanel;