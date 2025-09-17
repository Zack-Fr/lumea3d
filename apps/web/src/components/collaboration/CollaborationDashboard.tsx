import React, { useState } from 'react';
import { Users, UserPlus, Monitor, Settings, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import InvitationManager from './InvitationManager';
import SessionPanel from './SessionPanel';
import ViewportSync from './ViewportSync';
import NotificationCenter from '../notifications/NotificationCenter';
import { useInvitations } from '../../hooks/useInvitations';

interface CollaborationDashboardProps {
  projectId: string;
  projectName: string;
  sceneId?: string | null;
  currentCamera?: {
    position: [number, number, number];
    rotation: [number, number, number];
    target?: [number, number, number];
  };
  onCameraUpdate?: (position: [number, number, number], rotation: [number, number, number]) => void;
  onFollowUser?: (userId: string) => void;
  position?: 'right' | 'left' | 'bottom';
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  className?: string;
}

const CollaborationDashboard: React.FC<CollaborationDashboardProps> = ({
  projectId,
  projectName,
  sceneId,
  currentCamera,
  onCameraUpdate,
  onFollowUser,
  className = '',
  position = 'right',
  isMinimized = false,
  onToggleMinimize
}) => {
  const [activeTab, setActiveTab] = useState<'invites' | 'sessions' | 'viewport'>('sessions');
  const [isVisible, setIsVisible] = useState(true);

  const {
    activeSessions,
    currentSession,
    receivedInvitations,
    sentInvitations
  } = useInvitations();

  const activeSentInvites = sentInvitations.filter(inv => 
    inv.projectId === projectId && inv.status === 'pending'
  );
  const activeReceivedInvites = receivedInvitations.filter(inv => 
    inv.projectId === projectId && inv.status === 'pending'
  );

  const positionClasses = {
    right: 'right-4',
    left: 'left-4', 
    bottom: 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  const panelWidth = position === 'bottom' ? 'w-96' : 'w-80';

  if (!isVisible) {
    return (
      <div className={`fixed top-4 ${positionClasses[position]} z-40`}>
        <Button
          onClick={() => setIsVisible(true)}
          className="rounded-full w-12 h-12 p-0 shadow-lg"
          title="Show Collaboration Panel"
        >
          <Users size={20} />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Notification Center */}
      <NotificationCenter position="top-right" className="z-50" />

      {/* Main Collaboration Panel */}
      <div className={`fixed top-4 ${positionClasses[position]} ${panelWidth} z-40 ${className}`}>
        <Card className="shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold">Collaboration</h2>
              
              {/* Status Indicators */}
              <div className="flex items-center gap-1">
                {activeSessions.length > 0 && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Active session" />
                )}
                {(activeReceivedInvites.length > 0 || activeSentInvites.length > 0) && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" title="Pending invitations" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Minimize/Maximize */}
              {onToggleMinimize && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleMinimize}
                  className="p-2"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </Button>
              )}

              {/* Close */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="p-2"
                title="Hide Collaboration Panel"
              >
                <X size={14} />
              </Button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="p-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">{activeSessions.length}</div>
                  <div className="text-xs text-gray-600">Active Sessions</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-green-600">{activeReceivedInvites.length}</div>
                  <div className="text-xs text-gray-600">New Invites</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-orange-600">{activeSentInvites.length}</div>
                  <div className="text-xs text-gray-600">Sent Invites</div>
                </div>
              </div>

              {/* Current Session Banner */}
              {currentSession && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="font-medium text-blue-800">Active Session</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Collaborating on "{currentSession.projectName}" with {currentSession.participants.length} participants
                  </p>
                </div>
              )}

              {/* Tabs */}
              <div className="space-y-4">
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('sessions')}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'sessions'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <Monitor className="w-4 h-4 inline-block mr-1" />
                    Sessions
                  </button>
                  <button
                    onClick={() => setActiveTab('invites')}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'invites'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <UserPlus className="w-4 h-4 inline-block mr-1" />
                    Invites
                    {(activeReceivedInvites.length + activeSentInvites.length) > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {activeReceivedInvites.length + activeSentInvites.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('viewport')}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'viewport'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <Settings className="w-4 h-4 inline-block mr-1" />
                    Viewport
                  </button>
                </div>

                {/* Tab Content */}
                <div className="max-h-96 overflow-y-auto">
                  {activeTab === 'sessions' && (
                    <SessionPanel showActiveOnly={true} />
                  )}

                  {activeTab === 'invites' && (
                    <InvitationManager
                      projectId={projectId}
                      projectName={projectName}
                    />
                  )}

                  {activeTab === 'viewport' && (
                    <ViewportSync
                      sceneId={sceneId || null}
                      currentCamera={currentCamera}
                      onCameraUpdate={onCameraUpdate}
                      onFollowUser={onFollowUser}
                    />
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('invites')}
                    className="flex-1 text-xs"
                  >
                    <UserPlus size={12} className="mr-1" />
                    Invite
                  </Button>
                  
                  {currentSession && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('viewport')}
                      className="flex-1 text-xs"
                    >
                      <Monitor size={12} className="mr-1" />
                      Sync
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Minimized State */}
          {isMinimized && (
            <div className="p-2">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Users size={16} />
                <span>{activeSessions.length} sessions</span>
                {(activeReceivedInvites.length + activeSentInvites.length) > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">
                      {activeReceivedInvites.length + activeSentInvites.length} invites
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default CollaborationDashboard;