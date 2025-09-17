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

export interface RealtimeEvent {
  t: 'HELLO' | 'PRESENCE' | 'CHAT' | 'CAMERA' | 'PING' | 'PONG' | 
     'OBJECT_TRANSFORM' | 'OBJECT_SELECT' | 'SCENE_UPDATE' | 'USER_JOIN' | 'USER_LEAVE' |
     'INVITE_RECEIVED' | 'INVITE_ACCEPTED' | 'INVITE_DECLINED' | 'SESSION_STARTED' | 
     'SESSION_ENDED' | 'VIEWPORT_SYNC' | 'NOTIFICATION';
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

// New interfaces for invitations and notifications
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
