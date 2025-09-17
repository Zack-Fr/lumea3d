import React, { useState } from 'react';
import { UserPlus, Send, Mail, Clock, Check, X, RefreshCw, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useInvitations } from '../../hooks/useInvitations';
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

  // Update form validation
  React.useEffect(() => {
    setIsFormValid(
      inviteForm.email.trim() !== '' &&
      isValidEmail(inviteForm.email) &&
      inviteForm.expiresInHours > 0
    );
  }, [inviteForm]);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const dto: CreateInvitationDto = {
      projectId,
      toUserEmail: inviteForm.email.trim(),
      message: inviteForm.message.trim() || undefined,
      expiresInHours: inviteForm.expiresInHours
    };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={12} />;
      case 'accepted': return <Check size={12} />;
      case 'declined': return <X size={12} />;
      case 'expired': return <Clock size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const filteredSentInvitations = sentInvitations.filter(inv => inv.projectId === projectId);
  const filteredReceivedInvitations = receivedInvitations.filter(inv => inv.projectId === projectId);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Collaboration</h2>
            <p className="text-sm text-gray-600">Invite others to work on "{projectName}"</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={refreshInvitations}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('send')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'send'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            <UserPlus className="w-4 h-4 inline-block mr-2" />
            Send Invite
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sent'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            <Send className="w-4 h-4 inline-block mr-2" />
            Sent ({filteredSentInvitations.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'received'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            <Mail className="w-4 h-4 inline-block mr-2" />
            Received ({filteredReceivedInvitations.length})
          </button>
        </div>

        {/* Send Invitation Tab */}
        {activeTab === 'send' && (
          <Card className="p-6">
            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                {inviteForm.email && !isValidEmail(inviteForm.email) && (
                  <p className="text-red-500 text-xs mt-1">Please enter a valid email address</p>
                )}
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Message (optional)
                </label>
                <textarea
                  id="message"
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Hi! I'd like to invite you to collaborate on this project..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label htmlFor="expiration" className="block text-sm font-medium text-gray-700 mb-2">
                  Expires In
                </label>
                <select
                  id="expiration"
                  value={inviteForm.expiresInHours}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, expiresInHours: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full gap-2"
              >
                <Send size={16} />
                {isLoading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </form>
          </Card>
        )}

        {/* Sent Invitations Tab */}
        {activeTab === 'sent' && (
          <div className="space-y-3">
            {filteredSentInvitations.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">
                <Send size={32} className="mx-auto mb-3 opacity-50" />
                <p>No invitations sent for this project</p>
                <p className="text-sm mt-1">Click "Send Invite" to invite collaborators</p>
              </Card>
            ) : (
              filteredSentInvitations.map((invitation) => (
                <Card key={invitation.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{invitation.toUserEmail}</span>
                        <Badge className={`text-xs ${getStatusColor(invitation.status)}`}>
                          {getStatusIcon(invitation.status)}
                          <span className="ml-1 capitalize">{invitation.status}</span>
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Sent: {formatDate(invitation.createdAt)}</p>
                        <p>Expires: {formatDate(invitation.expiresAt)}</p>
                        {invitation.message && (
                          <p className="italic">"{invitation.message}"</p>
                        )}
                      </div>
                    </div>

                    {invitation.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeInvitation(invitation.id)}
                        className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X size={14} className="mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Received Invitations Tab */}
        {activeTab === 'received' && (
          <div className="space-y-3">
            {filteredReceivedInvitations.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">
                <Mail size={32} className="mx-auto mb-3 opacity-50" />
                <p>No invitations received for this project</p>
              </Card>
            ) : (
              filteredReceivedInvitations.map((invitation) => (
                <Card key={invitation.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">From: {invitation.fromUserName}</span>
                        <Badge className={`text-xs ${getStatusColor(invitation.status)}`}>
                          {getStatusIcon(invitation.status)}
                          <span className="ml-1 capitalize">{invitation.status}</span>
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Project: {invitation.projectName}</p>
                        <p>Received: {formatDate(invitation.createdAt)}</p>
                        <p>Expires: {formatDate(invitation.expiresAt)}</p>
                        {invitation.message && (
                          <p className="italic">"{invitation.message}"</p>
                        )}
                      </div>
                    </div>

                    {invitation.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => acceptInvitation(invitation.id, invitation.token)}
                          className="gap-1"
                        >
                          <Check size={14} />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => declineInvitation(invitation.id)}
                          className="gap-1"
                        >
                          <X size={14} />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationManager;