// Realtime Types and Interfaces

export interface RealtimeUser {
  id: string;
  userId: string;
  name: string;
  color: string;
  isCurrentUser?: boolean;
  status: 'online' | 'editing' | 'viewing' | 'away';
  camera?: {
    position: [number, number, number];
    rotation: [number, number, number];
    target?: [number, number, number];
  };
  selection?: {
    objectId: string | null;
    isTransforming: boolean;
  };
  lastSeen: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  author: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system' | 'voice';
  attachments?: {
    objectId?: string;
    position?: [number, number, number];
  };
}

export interface ObjectTransform {
  objectId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  timestamp: number;
  userId: string;
}

// Server → Client events (matching backend RtSrvEvent)
export type RtSrvEvent =
  | { t: 'HELLO'; sceneId: string; version: number; serverTime: number }
  | { t: 'PRESENCE'; users: Array<{ id: string; name: string; color?: string; status?: string }> }
  | { t: 'CAMERA'; from: string; pose: { p: [number, number, number]; q: [number, number, number, number] } }
  | { t: 'CHAT'; from: string; msg: string; ts: number }
  | { t: 'DELTA'; version: number; ops: any[] }
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

// Client → Server events (matching backend RtCliEvent)
export type RtCliEvent =
  | { t: 'SUB'; sceneId: string }
  | { t: 'UNSUB'; sceneId: string }
  | { t: 'PING'; ts: number }
  | { t: 'CAMERA'; pose: { p: [number, number, number]; q: [number, number, number, number] } }
  | { t: 'CHAT'; msg: string }
  | { t: 'VIEWPORT_SYNC'; viewport: ViewportState };

// Legacy event interface for backward compatibility
export interface RealtimeEvent {
  t: string;
  userId?: string;
  timestamp?: number;
  [key: string]: any;
}

export interface CameraUpdateEvent extends RealtimeEvent {
  t: 'CAMERA';
  pose: {
    p: [number, number, number];  // position
    q: [number, number, number, number];  // quaternion rotation
  };
}

export interface ChatEvent extends RealtimeEvent {
  t: 'CHAT';
  msg: string;
  from?: string;
  ts?: number;
}

export interface ObjectTransformEvent extends RealtimeEvent {
  t: 'OBJECT_TRANSFORM';
  objectId: string;
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
}

export interface ObjectSelectEvent extends RealtimeEvent {
  t: 'OBJECT_SELECT';
  objectId: string | null;
  isTransforming?: boolean;
}

export interface PresenceEvent extends RealtimeEvent {
  t: 'PRESENCE';
  users: RealtimeUser[];
}

export interface RealtimeConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
  latency: number;
}

export interface RealtimeConfig {
  serverUrl: string;
  namespace: string;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  messageQueueSize: number;
}

// Collaboration types (matching backend)
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

export interface RealtimeNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'invitation';
  title: string;
  message: string;
  data?: any;
  timestamp: number;
}

// Legacy interfaces for backward compatibility
export interface Invitation {
  id: string;
  sessionId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserEmail: string;
  projectId: string;
  projectName: string;
  token: string;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: number;
  message?: string;
}

export interface SessionInfo {
  id: string;
  projectId: string;
  projectName: string;
  ownerId: string;
  ownerName: string;
  participants: RealtimeUser[];
  status: 'active' | 'ended';
  createdAt: number;
  endedAt?: number;
  maxParticipants?: number;
}

export interface ViewportState {
  camera: {
    position: [number, number, number];
    rotation: [number, number, number];
    target?: [number, number, number];
    zoom?: number;
  };
  viewport: {
    width: number;
    height: number;
    bounds?: {
      min: [number, number];
      max: [number, number];
    };
  };
  cursor?: {
    position: [number, number];
    isVisible: boolean;
  };
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'invitation';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  data?: any;
  actions?: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'danger';
  }>;
}

// Extended event interfaces
export interface InviteReceivedEvent extends RealtimeEvent {
  t: 'INVITE_RECEIVED';
  invitation: Invitation;
}

export interface InviteResponseEvent extends RealtimeEvent {
  t: 'INVITE_ACCEPTED' | 'INVITE_DECLINED';
  invitationId: string;
  userId: string;
  userName: string;
}

export interface SessionEvent extends RealtimeEvent {
  t: 'SESSION_STARTED' | 'SESSION_ENDED';
  session: SessionInfo;
}

export interface ViewportSyncEvent extends RealtimeEvent {
  t: 'VIEWPORT_SYNC';
  from: string;
  viewport: ViewportState;
}

export interface NotificationEvent extends RealtimeEvent {
  t: 'NOTIFICATION';
  notification: Notification;
}
