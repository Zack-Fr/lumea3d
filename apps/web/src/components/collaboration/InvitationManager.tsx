import React, { useState } from 'react';
import { UserPlus, Send, Mail, Check, X, RefreshCw, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { useInvitations } from '../../hooks/useInvitations';
import { useAuth } from '../../providers/AuthProvider';
import type { CreateInvitationDto } from '../../services/invitationsApi';

interface InvitationManagerProps {
  projectId: string;
  projectName: string;
  className?: string;
}

const InvitationManager: React.FC<InvitationManagerProps> = ({
  projectId,
  projectName,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'send' | 'sent' | 'received'>('send');
  const [inviteForm, setInviteForm] = useState({
    email: '',
    message: '',
    expiresInHours: 24
  });
  const [isFormValid, setIsFormValid] = useState(false);

  const { user } = useAuth();
  const {
    sentInvitations,
    receivedInvitations,
    isLoading,
    error,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    revokeInvitation,
    refreshInvitations
  } = useInvitations();

  // Validate email format
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Check if projectId is valid
  const isProjectIdValid = projectId && projectId !== 'unknown' && projectId.length >= 3;
  
  // Check if user has permission to send invitations
  // Let the backend handle detailed permission validation
  const canSendInvitations = !!user; // Any authenticated user can attempt to send invitations
  
  // Combined validation for form
  const canUseForm = isProjectIdValid && canSendInvitations;

  // Update form validation
  React.useEffect(() => {
    setIsFormValid(
      !!canUseForm &&
      inviteForm.email.trim() !== '' &&
      isValidEmail(inviteForm.email) &&
      inviteForm.expiresInHours > 0
    );
  }, [inviteForm, canUseForm]);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Validate projectId and permissions before sending
    if (!projectId || projectId === 'unknown' || projectId.length < 3) {
      console.error('🚨 INVALID PROJECT ID:', {
        projectId,
        isUnknown: projectId === 'unknown',
        isEmpty: !projectId,
        tooShort: projectId && projectId.length < 3
      });
      
      throw new Error('Invalid project ID. Please refresh the page and try again.');
    }
    
    if (!canSendInvitations) {
      console.error('🚨 AUTHENTICATION REQUIRED:', {
        isAuthenticated: !!user,
        canSendInvitations
      });
      
      throw new Error('You must be authenticated to send invitations.');
    }

    const dto: CreateInvitationDto = {
      projectId,
      toUserEmail: inviteForm.email.trim(),
      message: inviteForm.message.trim() || undefined,
      expiresInHours: inviteForm.expiresInHours
    };

    console.log('SENDING INVITATION:', {
      dto,
      projectId,
      email: inviteForm.email,
      message: inviteForm.message,
      expiresInHours: inviteForm.expiresInHours,
      projectIdValid: projectId && projectId !== 'unknown' && projectId.length >= 3
    });

    // Check for existing invitations to this email for this project
    const existingInvitation = sentInvitations.find(
      inv => inv.toUserEmail === inviteForm.email.trim() && 
             inv.projectId === projectId && 
             inv.status === 'pending'
    );
    
    if (existingInvitation) {
      console.warn('DUPLICATE INVITATION CHECK:', {
        existingInvitation,
        message: 'Found existing pending invitation to this email for this project'
      });
    }

    // Check if trying to invite yourself
    const isSelfInvitation = user?.email === inviteForm.email.trim();
    
    console.log('PRE-SEND VALIDATION:', {
      fromUser: user?.email,
      toUser: inviteForm.email.trim(),
      isSelfInvitation,
      totalSentInvitations: sentInvitations.length,
      projectSentInvitations: sentInvitations.filter(inv => inv.projectId === projectId).length,
      pendingInvitationsToEmail: sentInvitations.filter(
        inv => inv.toUserEmail === inviteForm.email.trim() && inv.status === 'pending'
      ).length,
      allReceivedInvitations: receivedInvitations.length,
      projectReceivedInvitations: receivedInvitations.filter(inv => inv.projectId === projectId).length
    });
    
    if (isSelfInvitation) {
      throw new Error('You cannot send an invitation to yourself.');
    }

    try {
      await sendInvitation(dto);
      
      // Reset form
      setInviteForm({
        email: '',
        message: '',
        expiresInHours: 24
      });
      
      // Switch to sent tab to show the new invitation
      setActiveTab('sent');
    } catch (err) {
      console.error('Failed to send invitation:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredSentInvitations = sentInvitations.filter(inv => inv.projectId === projectId);
  // Show ALL received invitations, not just for current project (better UX)
  const filteredReceivedInvitations = receivedInvitations;

  return (
    <div className={`space-y-6 ${className} text-white min-h-0`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--glass-border-dim)] rounded-lg">
            <Users className="w-5 h-5 text-[var(--glass-yellow)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Collaboration</h2>
            <p className="text-sm text-[var(--glass-gray)]">Invite others to work on "{projectName}"</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refreshInvitations}
          disabled={isLoading}
          className="gap-2 border-[var(--glass-border-dim)] text-[var(--glass-gray)] hover:bg-[var(--glass-border-dim)]"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-[var(--glass-black)] border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <div className="flex border-b border-[var(--glass-border-dim)] mb-6">
          <button
            onClick={() => setActiveTab('send')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'send'
                ? 'border-[var(--glass-yellow)] text-[var(--glass-yellow)]'
                : 'border-transparent text-[var(--glass-gray)] hover:text-white hover:border-[var(--glass-border-dim)]'
            }`}
          >
            <UserPlus className="w-4 h-4 inline-block mr-2" />
            Send Invite
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sent'
                ? 'border-[var(--glass-yellow)] text-[var(--glass-yellow)]'
                : 'border-transparent text-[var(--glass-gray)] hover:text-white hover:border-[var(--glass-border-dim)]'
            }`}
          >
            <Send className="w-4 h-4 inline-block mr-2" />
            Sent ({filteredSentInvitations.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'received'
                ? 'border-[var(--glass-yellow)] text-[var(--glass-yellow)]'
                : 'border-transparent text-[var(--glass-gray)] hover:text-white hover:border-[var(--glass-border-dim)]'
            }`}
          >
            <Mail className="w-4 h-4 inline-block mr-2" />
            Received ({filteredReceivedInvitations.length})
          </button>
        </div>

        {/* Send Invitation Tab */}
        {activeTab === 'send' && (
          <div className="p-6 bg-[var(--glass-black)] border border-[var(--glass-border-dim)] rounded-lg">
            {/* Project ID Validation Warning */}
            {(!projectId || projectId === 'unknown' || projectId.length < 3) && (
              <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                ⚠️ Invalid project ID detected. Please refresh the page or navigate to a valid project to send invitations.
              </div>
            )}
            
            {/* Authentication Warning */}
            {isProjectIdValid && !canSendInvitations && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                🚫 You must be authenticated to send collaboration invitations.
              </div>
            )}
            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2 bg-[var(--glass-black)] border border-[var(--glass-border-dim)] rounded-md text-white placeholder-[var(--glass-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--glass-yellow)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  disabled={!canUseForm}
                />
                {inviteForm.email && !isValidEmail(inviteForm.email) && (
                  <p className="text-red-400 text-xs mt-1">Please enter a valid email address</p>
                )}
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
                  Personal Message (optional)
                </label>
                <textarea
                  id="message"
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Hi! I'd like to invite you to collaborate on this project..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--glass-black)] border border-[var(--glass-border-dim)] rounded-md text-white placeholder-[var(--glass-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--glass-yellow)] focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!canUseForm}
                />
              </div>

              <div>
                <label htmlFor="expiration" className="block text-sm font-medium text-white mb-2">
                  Expires In
                </label>
                <select
                  id="expiration"
                  value={inviteForm.expiresInHours}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, expiresInHours: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-[var(--glass-black)] border border-[var(--glass-border-dim)] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--glass-yellow)] focus:border-transparent"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>1 week</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="w-full gap-2 bg-[var(--glass-yellow)] text-[var(--glass-black)] hover:bg-[var(--glass-yellow)]/90"
              >
                <Send size={16} />
                {isLoading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </form>
          </div>
        )}

        {/* Sent Invitations Tab */}
        {activeTab === 'sent' && (
          <div className="space-y-3">
            {filteredSentInvitations.length === 0 ? (
              <div className="p-8 text-center text-[var(--glass-gray)] bg-[var(--glass-black)] border border-[var(--glass-border-dim)] rounded-lg">
                <Send size={32} className="mx-auto mb-3 opacity-50" />
                <p>No invitations sent for this project</p>
                <p className="text-sm mt-1">Click "Send Invite" to invite collaborators</p>
              </div>
            ) : (
              filteredSentInvitations.map((invitation) => (
                <div key={invitation.id} className="p-4 bg-[var(--glass-black)] border border-[var(--glass-border-dim)] rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-white">{invitation.toUserEmail}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          invitation.status?.toLowerCase() === 'pending' ? 'bg-[var(--glass-yellow)]/20 text-[var(--glass-yellow)]' :
                          invitation.status?.toLowerCase() === 'accepted' ? 'bg-green-600/20 text-green-400' :
                          invitation.status?.toLowerCase() === 'declined' ? 'bg-red-500/20 text-red-400' :
                          'bg-[var(--glass-border-dim)] text-[var(--glass-gray)]'
                        }`}>
                          {invitation.status}
                        </span>
                      </div>

                      <div className="text-sm text-[var(--glass-gray)] space-y-1">
                        <p>Sent: {formatDate(invitation.createdAt)}</p>
                        <p>Expires: {formatDate(invitation.expiresAt)}</p>
                        {invitation.message && (
                          <p className="italic">"{invitation.message}"</p>
                        )}
                      </div>
                    </div>

                    {invitation.status?.toLowerCase() === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeInvitation(invitation.id)}
                        className="ml-4 text-red-400 border-red-500/30 hover:bg-red-900/20"
                      >
                        <X size={14} className="mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Received Invitations Tab */}
        {activeTab === 'received' && (
          <div className="space-y-3">
            {filteredReceivedInvitations.length === 0 ? (
              <div className="p-8 text-center text-[var(--glass-gray)] bg-[var(--glass-black)] border border-[var(--glass-border-dim)] rounded-lg">
                <Mail size={32} className="mx-auto mb-3 opacity-50" />
                <p>No invitations received for this project</p>
              </div>
            ) : (
              filteredReceivedInvitations.map((invitation) => {
                console.log('DEBUG: Invitation object:', invitation);
                const isPending = invitation.status?.toLowerCase() === 'pending';
                console.log('DEBUG: isPending check:', {
                  status: invitation.status,
                  statusLower: invitation.status?.toLowerCase(),
                  isPending,
                  comparison: invitation.status?.toLowerCase() === 'pending'
                });
                return (
                <div key={invitation.id} className="p-4 bg-[var(--glass-black)] border border-[var(--glass-border-dim)] rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-white">From: {invitation.fromUserName}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          invitation.status?.toLowerCase() === 'pending' ? 'bg-[var(--glass-yellow)]/20 text-[var(--glass-yellow)]' :
                          invitation.status?.toLowerCase() === 'accepted' ? 'bg-green-600/20 text-green-400' :
                          invitation.status?.toLowerCase() === 'declined' ? 'bg-red-500/20 text-red-400' :
                          'bg-[var(--glass-border-dim)] text-[var(--glass-gray)]'
                        }`}>
                          {invitation.status}
                        </span>
                      </div>

                      <div className="text-sm text-[var(--glass-gray)] space-y-1">
                        <p>Project: {invitation.projectName}</p>
                        <p>Received: {formatDate(invitation.createdAt)}</p>
                        <p>Expires: {formatDate(invitation.expiresAt)}</p>
                        {invitation.message && (
                          <p className="italic">"{invitation.message}"</p>
                        )}
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => {
                            console.log('DEBUG Accept button clicked:', {
                              status: invitation.status, 
                              statusLower: invitation.status?.toLowerCase(),
                              hasToken: !!invitation.token,
                              token: invitation.token,
                              invitationId: invitation.id
                            });
                            acceptInvitation(invitation.id, invitation.token);
                          }}
                          className="gap-1 bg-green-600 hover:bg-green-700"
                        >
                          <Check size={14} />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => declineInvitation(invitation.id)}
                          className="gap-1 text-red-400 border-red-500/30 hover:bg-red-900/20"
                        >
                          <X size={14} />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationManager;