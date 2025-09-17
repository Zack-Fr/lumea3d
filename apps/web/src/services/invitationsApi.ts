
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// DTO types for invitation API calls
export interface CreateInvitationDto {
  projectId: string;
  toUserEmail: string;
  message?: string;
  expiresInHours?: number; // Default 24 hours
}

export interface InvitationResponse {
  id: string;
  sessionId: string;
  fromUserId: string;
  fromUserName: string;
  toUserEmail: string;
  projectId: string;
  projectName: string;
  token: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  message?: string;
}

export interface SessionResponse {
  id: string;
  projectId: string;
  projectName: string;
  ownerId: string;
  ownerName: string;
  participants: Array<{
    id: string;
    name: string;
    email: string;
    role: 'CLIENT' | 'DESIGNER' | 'ADMIN';
    joinedAt: string;
  }>;
  status: 'active' | 'ended';
  createdAt: string;
  endedAt?: string;
  maxParticipants?: number;
}

export interface AcceptInvitationDto {
  token: string;
}

/**
 * Error class for Invitation API related errors
 */
export class InvitationApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'InvitationApiError';
  }
}

/**
 * Generic API request handler for invitations
 */
async function invitationApiRequest<T>(
  endpoint: string, 
  options: RequestInit,
  token?: string
): Promise<T> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Use default error message if JSON parsing fails
      }

      throw new InvitationApiError(errorMessage, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof InvitationApiError) {
      throw error;
    }
    throw new InvitationApiError(
      'Network error occurred while communicating with the invitations API',
      undefined,
      error as Error
    );
  }
}

/**
 * Invitations API service
 * 
 * Handles invitation and session management:
 * - Creating and sending invitations
 * - Accepting/declining invitations
 * - Managing collaborative sessions
 * - Tracking session participants
 */
export const invitationsApi = {
  /**
   * Create and send an invitation to collaborate on a project
   */
  async createInvitation(dto: CreateInvitationDto, token: string): Promise<InvitationResponse> {
    return invitationApiRequest<InvitationResponse>(
      '/invitations',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      token
    );
  },

  /**
   * Get all invitations sent by the current user
   */
  async getSentInvitations(token: string): Promise<InvitationResponse[]> {
    return invitationApiRequest<InvitationResponse[]>(
      '/invitations/sent',
      {
        method: 'GET',
      },
      token
    );
  },

  /**
   * Get all invitations received by the current user
   */
  async getReceivedInvitations(token: string): Promise<InvitationResponse[]> {
    return invitationApiRequest<InvitationResponse[]>(
      '/invitations/received',
      {
        method: 'GET',
      },
      token
    );
  },

  /**
   * Accept an invitation using its token
   */
  async acceptInvitation(dto: AcceptInvitationDto, token: string): Promise<{ sessionId: string; projectId: string }> {
    return invitationApiRequest<{ sessionId: string; projectId: string }>(
      '/invitations/accept',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      token
    );
  },

  /**
   * Decline an invitation
   */
  async declineInvitation(invitationId: string, token: string): Promise<void> {
    return invitationApiRequest<void>(
      `/invitations/${invitationId}/decline`,
      {
        method: 'POST',
      },
      token
    );
  },

  /**
   * Revoke a sent invitation (cancel before accepted)
   */
  async revokeInvitation(invitationId: string, token: string): Promise<void> {
    return invitationApiRequest<void>(
      `/invitations/${invitationId}/revoke`,
      {
        method: 'DELETE',
      },
      token
    );
  },

  /**
   * Get active sessions for the current user
   */
  async getActiveSessions(token: string): Promise<SessionResponse[]> {
    return invitationApiRequest<SessionResponse[]>(
      '/sessions/active',
      {
        method: 'GET',
      },
      token
    );
  },

  /**
   * Get details of a specific session
   */
  async getSession(sessionId: string, token: string): Promise<SessionResponse> {
    return invitationApiRequest<SessionResponse>(
      `/sessions/${sessionId}`,
      {
        method: 'GET',
      },
      token
    );
  },

  /**
   * End a collaborative session (only session owner can do this)
   */
  async endSession(sessionId: string, token: string): Promise<void> {
    return invitationApiRequest<void>(
      `/sessions/${sessionId}/end`,
      {
        method: 'POST',
      },
      token
    );
  },

  /**
   * Leave a collaborative session (any participant can do this)
   */
  async leaveSession(sessionId: string, token: string): Promise<void> {
    return invitationApiRequest<void>(
      `/sessions/${sessionId}/leave`,
      {
        method: 'POST',
      },
      token
    );
  }
};

export default invitationsApi;