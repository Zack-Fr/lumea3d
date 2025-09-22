import React, { useState } from 'react';
import { Users, UserPlus, Monitor, X } from 'lucide-react';
import { Button } from '../ui/Button';
import InvitationManager from './InvitationManager';
import SessionPanel from './SessionPanel';
import ViewportSync from './ViewportSync';
import { useInvitations } from '../../hooks/useInvitations';
import { useCameraStore } from '../../stores/cameraStore';

interface CollaborationPanelProps {
  projectId: string;
  projectName: string;
  sceneId?: string | null;
  onClose?: () => void;
  className?: string;
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  projectId,
  projectName,
  sceneId,
  onClose,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'invites' | 'sessions' | 'viewport'>('invites');
  const { pose, setPose } = useCameraStore();

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

  return (
    <div className={`h-full flex flex-col bg-[var(--glass-black)] border border-[var(--glass-border-dim)] rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--glass-border-dim)] bg-[var(--glass-black)]">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--glass-yellow)]" />
          <div>
            <h2 className="font-semibold text-white text-sm">Collaboration</h2>
            <p className="text-xs text-[var(--glass-gray)]">{projectName}</p>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center gap-1">
            {activeSessions.length > 0 && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Active session" />
            )}
            {(activeReceivedInvites.length > 0 || activeSentInvites.length > 0) && (
              <div className="w-2 h-2 bg-[var(--glass-yellow)] rounded-full" title="Pending invitations" />
            )}
          </div>
        </div>

        {/* Close Button */}
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 hover:bg-[var(--glass-border-dim)]"
            title="Close Collaboration Panel"
          >
            <X size={16} />
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="px-3 py-2 border-b border-[var(--glass-border-dim)]">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-[var(--glass-black)] border border-[var(--glass-border-dim)] rounded-md">
            <div className="text-lg font-semibold text-[var(--glass-yellow)]">{activeSessions.length}</div>
            <div className="text-xs text-[var(--glass-gray)]">Active Sessions</div>
          </div>
          <div className="text-center p-2 bg-[var(--glass-black)] border border-[var(--glass-border-dim)] rounded-md">
            <div className="text-lg font-semibold text-green-400">{activeReceivedInvites.length}</div>
            <div className="text-xs text-[var(--glass-gray)]">New Invites</div>
          </div>
          <div className="text-center p-2 bg-[var(--glass-black)] border border-[var(--glass-border-dim)] rounded-md">
            <div className="text-lg font-semibold text-orange-400">{activeSentInvites.length}</div>
            <div className="text-xs text-[var(--glass-gray)]">Sent Invites</div>
          </div>
        </div>
      </div>

      {/* Current Session Banner */}
      {currentSession && (
        <div className="px-3 py-2 border-b border-[var(--glass-border-dim)]">
          <div className="p-2 bg-[var(--glass-black)] border border-[var(--glass-border-dim)] rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-[var(--glass-yellow)] rounded-full animate-pulse" />
              <span className="font-medium text-white text-sm">Active Session</span>
            </div>
            <p className="text-sm text-[var(--glass-gray)]">
              Collaborating on "{currentSession.projectName}" with {currentSession.participants.length} participants
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[var(--glass-border-dim)]">
        <div className="flex">
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'invites'
                ? 'border-[var(--glass-yellow)] text-[var(--glass-yellow)] bg-[var(--glass-black)]'
                : 'border-transparent text-[var(--glass-gray)] hover:text-white hover:border-[var(--glass-border-dim)]'
            }`}
          >
            <UserPlus className="w-4 h-4 inline-block mr-1" />
            Invites
            {(activeReceivedInvites.length + activeSentInvites.length) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-[var(--glass-yellow)] text-[var(--glass-black)] rounded-full">
                {activeReceivedInvites.length + activeSentInvites.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sessions'
                ? 'border-[var(--glass-yellow)] text-[var(--glass-yellow)] bg-[var(--glass-black)]'
                : 'border-transparent text-[var(--glass-gray)] hover:text-white hover:border-[var(--glass-border-dim)]'
            }`}
          >
            <Monitor className="w-4 h-4 inline-block mr-1" />
            Sessions
          </button>
          <button
            onClick={() => setActiveTab('viewport')}
            className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'viewport'
                ? 'border-[var(--glass-yellow)] text-[var(--glass-yellow)] bg-[var(--glass-black)]'
                : 'border-transparent text-[var(--glass-gray)] hover:text-white hover:border-[var(--glass-border-dim)]'
            }`}
          >
            <Monitor className="w-4 h-4 inline-block mr-1" />
            Viewport
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === 'invites' && (
          <div className="p-4 max-h-96 overflow-y-auto">
            <InvitationManager
              projectId={projectId}
              projectName={projectName}
              className=""
            />
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="p-2 min-h-[200px]">
            <SessionPanel className="" sceneId={sceneId} />
          </div>
        )}

        {activeTab === 'viewport' && (
          <div className="p-2 min-h-[200px]">
            <ViewportSync
              sceneId={sceneId || null}
              currentCamera={{
                position: pose.p,
                rotation: [0, 0, 0], // TODO: Add rotation to camera store
                target: pose.t
              }}
              onCameraUpdate={(position, rotation) => {
                // Update camera store when remote user changes view
                setPose({ p: position, t: rotation }, 'remote');
              }}
              onFollowUser={(userId) => {
                // TODO: Implement user following logic
                console.log('Following user:', userId);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaborationPanel;