
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
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('INVITATION_API: Making request:', {
      url,
      method: options.method,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
      body: options.body,
      headers
    });
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorData: any = null;
      
      try {
        errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Use default error message if JSON parsing fails
      }
      
      console.error('INVITATION_API: Request failed:', {
        url,
        method: options.method,
        status: response.status,
        statusText: response.statusText,
        requestBody: options.body,
        requestHeaders: headers,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        errorData,
        errorMessage,
        validationErrors: errorData?.validationErrors || 'none',
        possibleCauses: response.status === 400 ? [
          'Invalid project ID or project not found',
          'User doesn\'t have permission to invite to this project',
          'Email address already has pending invitation',
          'Project doesn\'t allow invitations',
          'Backend validation rule not captured in DTO validation'
        ] : response.status === 401 ? [
          'JWT token expired or invalid',
          'Please logout and login again',
          'Backend JWT secret may have changed'
        ] : ['Unknown error']
      });
      
      // Special handling for 401 errors
      if (response.status === 401) {
        throw new InvitationApiError(
          'Your session has expired or is invalid. Please logout and login again.',
          response.status
        );
      }

      throw new InvitationApiError(errorMessage, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof InvitationApiError) {
      throw error;
    }
    
    console.error('🚨 INVITATION_API: Network error:', {
      url,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    
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
      '/collaboration/invitations',
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
    const response = await invitationApiRequest<{ invitations: InvitationResponse[] }>(
      '/collaboration/invitations/sent',
      {
        method: 'GET',
      },
      token
    );
    return response.invitations;
  },

  /**
   * Get all invitations received by the current user
   */
  async getReceivedInvitations(token: string): Promise<InvitationResponse[]> {
    const response = await invitationApiRequest<{ invitations: InvitationResponse[] }>(
      '/collaboration/invitations/received',
      {
        method: 'GET',
      },
      token
    );
    return response.invitations;
  },

  /**
   * Accept an invitation using its token
   */
  async acceptInvitation(dto: AcceptInvitationDto, token: string): Promise<{ sessionId: string; message: string }> {
    return invitationApiRequest<{ sessionId: string; message: string }>(
      '/collaboration/invitations/accept',
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
      `/collaboration/invitations/${invitationId}/decline`,
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
      `/collaboration/invitations/${invitationId}`,
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
    const response = await invitationApiRequest<{ sessions: SessionResponse[] }>(
      '/collaboration/sessions/active',
      {
        method: 'GET',
      },
      token
    );
    return response.sessions;
  },

  /**
   * Get details of a specific session
   */
  async getSession(sessionId: string, token: string): Promise<SessionResponse> {
    return invitationApiRequest<SessionResponse>(
      `/collaboration/sessions/${sessionId}`,
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
      `/collaboration/sessions/${sessionId}/end`,
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
      `/collaboration/sessions/${sessionId}/leave`,
      {
        method: 'POST',
      },
      token
    );
  },

  /**
   * Validate an invitation token (public endpoint - no auth required)
   */
  async validateInvitationToken(token: string): Promise<{
    id: string;
    projectName: string;
    inviterName: string;
    email: string;
    isValid: boolean;
    isExpired: boolean;
    isAccepted: boolean;
  }> {
    return invitationApiRequest<{
      id: string;
      projectName: string;
      inviterName: string;
      email: string;
      isValid: boolean;
      isExpired: boolean;
      isAccepted: boolean;
    }>(
      `/collaboration/invitations/validate/${token}`,
      {
        method: 'GET',
      }
      // No token required for this endpoint
    );
  }
};

export default invitationsApi;