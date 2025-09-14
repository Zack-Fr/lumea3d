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
  | { t: 'PRESENCE'; users: Array<{ id: string; name: string }> }
  | { t: 'CAMERA'; from: string; pose: { p: [number, number, number]; q: [number, number, number, number] } }
  | { t: 'CHAT'; from: string; msg: string; ts: number }
  | { t: 'DELTA'; version: number; ops: DeltaOp[] }
  | { t: 'JOB_STATUS'; jobId: string; status: 'queued' | 'running' | 'completed' | 'failed' };

// Client → Server events
export type RtCliEvent =
  | { t: 'SUB'; sceneId: string }
  | { t: 'UNSUB'; sceneId: string }
  | { t: 'PING'; ts: number }
  | { t: 'CAMERA'; pose: { p: [number, number, number]; q: [number, number, number, number] } }
  | { t: 'CHAT'; msg: string };

// WebSocket client data interface
export interface AuthenticatedRealtimeSocket {
  userId: string;
  sceneId?: string;
  userName?: string;
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