// Shared types for realtime events (Server → Client and Client → Server)

export interface DeltaOp {
  type: 'add' | 'update' | 'remove';
  target: 'scene' | 'item';
  id?: string;
  data?: any;
}

// Server → Client events
export type RtSrvEvent =
  | { t: 'HELLO'; sceneId: string; version: number; serverTime: number }
  | { t: 'PRESENCE'; users: Array<{ id: string; userId: string; name: string; color?: string; status?: string; lastSeen?: number }> }
  | { t: 'CAMERA'; from: string; pose: { p: [number, number, number]; q: [number, number, number, number] } }
  | { t: 'CHAT'; from: string; msg: string; ts: number }
  | { t: 'DELTA'; version: number; ops: DeltaOp[] }
  | { t: 'JOB_STATUS'; jobId: string; status: 'queued' | 'running' | 'completed' | 'failed' }
  // Collaboration events
  | { t: 'INVITE_RECEIVED'; invitation: CollaborationInvitation }
  | { t: 'INVITE_RESPONSE'; inviteId: string; status: 'accepted' | 'declined'; userId: string }
  | { t: 'SESSION_STARTED'; session: CollaborationSession }
  | { t: 'SESSION_ENDED'; sessionId: string; reason?: string }
  | { t: 'SESSION_PARTICIPANT_JOINED'; sessionId: string; participant: SessionParticipant }
  | { t: 'SESSION_PARTICIPANT_LEFT'; sessionId: string; userId: string; reason?: string }
  | { t: 'VIEWPORT_SYNC'; from: string; viewport: ViewportState }
  | { t: 'NOTIFICATION'; notification: RealtimeNotification };

// Client → Server events
export type RtCliEvent =
  | { t: 'SUB'; sceneId: string }
  | { t: 'UNSUB'; sceneId: string }
  | { t: 'PING'; ts: number }
  | { t: 'CAMERA'; pose: { p: [number, number, number]; q: [number, number, number, number] } }
  | { t: 'CHAT'; msg: string }
  // Collaboration events
  | { t: 'VIEWPORT_SYNC'; viewport: ViewportState };

// WebSocket client data interface
export interface AuthenticatedRealtimeSocket {
  userId: string;
  sceneId?: string;
  userName?: string;
  userEmail?: string;
}

// Presence user info
export interface PresenceUser {
  id: string;
  name: string;
  socketIds: Set<string>;
  lastActivity: number;
}

// Throttle configuration
export interface ThrottleConfig {
  maxMessages: number;
  windowMs: number;
  coalesceMs?: number;
}

// Collaboration types
export interface CollaborationInvitation {
  id: string;
  projectId: string;
  projectName: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  toUserEmail: string;
  token: string;
  message?: string;
  expiresAt: string;
  createdAt: string;
}

export interface CollaborationSession {
  id: string;
  projectId: string;
  projectName: string;
  ownerId: string;
  ownerName: string;
  name?: string;
  status: 'ACTIVE' | 'ENDED';
  createdAt: string;
  participants: SessionParticipant[];
}

export interface SessionParticipant {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  isActive: boolean;
}

export interface ViewportState {
  camera: {
    position: [number, number, number];
    rotation: [number, number, number];
    target?: [number, number, number];
  };
  viewport: {
    width: number;
    height: number;
  };
}

export interface RealtimeNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'invitation';
  title: string;
  message: string;
  data?: any;
  timestamp: number;
}
