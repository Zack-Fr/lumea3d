import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { invitationsApi, type CreateInvitationDto, type InvitationResponse, type SessionResponse } from '../services/invitationsApi';
import type { Notification, NotificationType } from '../features/realtime/types/realtime';
import { log } from '../utils/logger';

interface UseInvitationsReturn {
  // Invitations
  sentInvitations: InvitationResponse[];
  receivedInvitations: InvitationResponse[];
  isLoading: boolean;
  error: string | null;
  
  // Sessions
  activeSessions: SessionResponse[];
  currentSession: SessionResponse | null;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  sendInvitation: (dto: CreateInvitationDto) => Promise<void>;
  acceptInvitation: (invitationId: string, token: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  
  // Session actions
  endSession: (sessionId: string) => Promise<void>;
  leaveSession: (sessionId: string) => Promise<void>;
  
  // Notification actions
  addNotification: (type: NotificationType, title: string, message: string, data?: any) => void;
  markNotificationAsRead: (notificationId: string) => void;
  clearNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  
  // Utils
  refreshInvitations: () => Promise<void>;
  refreshSessions: () => Promise<void>;
}

export const useInvitations = (): UseInvitationsReturn => {
  const { token } = useAuth();
  
  // State
  const [sentInvitations, setSentInvitations] = useState<InvitationResponse[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<InvitationResponse[]>([]);
  const [activeSessions, setActiveSessions] = useState<SessionResponse[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionResponse | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed values
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Load invitations from API
  const refreshInvitations = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const [sent, received] = await Promise.all([
        invitationsApi.getSentInvitations(token),
        invitationsApi.getReceivedInvitations(token)
      ]);

      setSentInvitations(sent);
      setReceivedInvitations(received);

      // Note: Removed automatic notification creation to prevent Maximum update depth exceeded
      // Notifications for new invitations should be handled by real-time updates or explicit user actions

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load invitations';
      setError(errorMessage);
      log('error', 'Failed to refresh invitations', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Load active sessions from API
  const refreshSessions = useCallback(async () => {
    if (!token) return;

    try {
      const sessions = await invitationsApi.getActiveSessions(token);
      setActiveSessions(sessions);
    } catch (err) {
      log('error', 'Failed to refresh sessions', err);
    }
  }, [token]);

  // Send invitation
  const sendInvitation = useCallback(async (dto: CreateInvitationDto) => {
    if (!token) throw new Error('Not authenticated');

    setIsLoading(true);
    setError(null);

    try {
      await invitationsApi.createInvitation(dto, token);
      await refreshInvitations();
      
      addNotification(
        'success',
        'Invitation Sent',
        `Invitation sent to ${dto.toUserEmail}`
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [token]); // FIXED: Removed refreshInvitations to prevent circular dependency

  // Accept invitation
  const acceptInvitation = useCallback(async (_invitationId: string, invitationToken: string) => {
    if (!token) throw new Error('Not authenticated');

    try {
      const result = await invitationsApi.acceptInvitation({ token: invitationToken }, token);
      await Promise.all([refreshInvitations(), refreshSessions()]);
      
      addNotification(
        'success',
        'Invitation Accepted',
        'You have joined the collaborative session'
      );

      // Find and update the current session
      const sessions = await invitationsApi.getActiveSessions(token);
      const session = sessions.find(s => s.id === result.sessionId);
      if (session) {
        setCurrentSession(session);
      }
    } catch (err) {
      // Always refresh invitations to show current status
      await refreshInvitations();
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invitation';
      addNotification('error', 'Failed to Accept', errorMessage);
      
      // Don't re-throw the error - just show the notification
      console.error('Accept invitation error:', err);
    }
  }, [token]); // FIXED: Removed function dependencies to prevent circular dependency

  // Decline invitation
  const declineInvitation = useCallback(async (invitationId: string) => {
    if (!token) throw new Error('Not authenticated');

    try {
      await invitationsApi.declineInvitation(invitationId, token);
      await refreshInvitations();
      
      addNotification('info', 'Invitation Declined', 'The invitation has been declined');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decline invitation';
      addNotification('error', 'Failed to Decline', errorMessage);
      throw err;
    }
  }, [token]); // FIXED: Removed refreshInvitations to prevent circular dependency

  // Revoke invitation
  const revokeInvitation = useCallback(async (invitationId: string) => {
    if (!token) throw new Error('Not authenticated');

    try {
      await invitationsApi.revokeInvitation(invitationId, token);
      await refreshInvitations();
      
      addNotification('info', 'Invitation Revoked', 'The invitation has been cancelled');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke invitation';
      addNotification('error', 'Failed to Revoke', errorMessage);
      throw err;
    }
  }, [token]); // FIXED: Removed refreshInvitations to prevent circular dependency

  // End session
  const endSession = useCallback(async (sessionId: string) => {
    if (!token) throw new Error('Not authenticated');

    try {
      await invitationsApi.endSession(sessionId, token);
      await refreshSessions();
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
      
      addNotification('info', 'Session Ended', 'The collaborative session has been ended');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end session';
      addNotification('error', 'Failed to End Session', errorMessage);
      throw err;
    }
  }, [token, currentSession]); // FIXED: Removed refreshSessions to prevent circular dependency

  // Leave session
  const leaveSession = useCallback(async (sessionId: string) => {
    if (!token) throw new Error('Not authenticated');

    try {
      await invitationsApi.leaveSession(sessionId, token);
      await refreshSessions();
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
      
      addNotification('info', 'Left Session', 'You have left the collaborative session');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave session';
      addNotification('error', 'Failed to Leave Session', errorMessage);
      throw err;
    }
  }, [token, currentSession]); // FIXED: Removed refreshSessions to prevent circular dependency

  // Notification management
  const addNotification = useCallback((
    type: NotificationType, 
    title: string, 
    message: string, 
    data?: any
  ) => {
    const notification: Notification = {
      id: `notification-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      isRead: false,
      data,
    };

    setNotifications(prev => [notification, ...prev]);
    
    // Auto-remove non-critical notifications after 5 seconds
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        // Use setNotifications directly to avoid circular dependency with clearNotification
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    }
  }, []); // FIXED: No dependency on clearNotification to prevent circular dependency

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    ));
  }, []);

  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Initial load
  useEffect(() => {
    if (token) {
      refreshInvitations();
      refreshSessions();
    }
  }, [token]); // FIXED: Only depend on token to prevent infinite loops

  return {
    // Data
    sentInvitations,
    receivedInvitations,
    activeSessions,
    currentSession,
    notifications,
    unreadCount,
    isLoading,
    error,
    
    // Actions
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    revokeInvitation,
    endSession,
    leaveSession,
    
    // Notifications
    addNotification,
    markNotificationAsRead,
    clearNotification,
    clearAllNotifications,
    
    // Utils
    refreshInvitations,
    refreshSessions,
  };
};