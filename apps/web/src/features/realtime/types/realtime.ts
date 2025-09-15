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
     'OBJECT_TRANSFORM' | 'OBJECT_SELECT' | 'SCENE_UPDATE' | 'USER_JOIN' | 'USER_LEAVE';
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