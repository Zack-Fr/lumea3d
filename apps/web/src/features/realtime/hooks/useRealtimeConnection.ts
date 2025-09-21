import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { log } from '../../../utils/logger';
import type { 
  RealtimeUser, 
  RealtimeEvent, 
  RealtimeConnectionState,
  ChatMessage,
  CameraUpdateEvent,
  PresenceEvent,
  InviteReceivedEvent,
  InviteResponseEvent,
  SessionEvent,
  ViewportSyncEvent,
  NotificationEvent
} from '../types/realtime';

interface UseRealtimeConnectionProps {
  token: string | null;
  sceneId: string | null;
  enabled?: boolean;
  onInviteReceived?: (event: InviteReceivedEvent) => void;
  onInviteResponse?: (event: InviteResponseEvent) => void;
  onSessionEvent?: (event: SessionEvent) => void;
  onViewportSync?: (event: ViewportSyncEvent) => void;
  onNotification?: (event: NotificationEvent) => void;
}

interface UseRealtimeConnectionReturn {
  connectionState: RealtimeConnectionState;
  users: RealtimeUser[];
  messages: ChatMessage[];
  sendMessage: (message: RealtimeEvent) => void;
  sendCameraUpdate: (position: number[]) => void;
  sendChatMessage: (content: string) => void;
}

const USER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
];

export const useRealtimeConnection = ({
  token,
  sceneId,
  enabled = true,
  onInviteReceived,
  onInviteResponse,
  onSessionEvent,
  onViewportSync,
  onNotification
}: UseRealtimeConnectionProps): UseRealtimeConnectionReturn => {
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>({
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    reconnectAttempts: 0,
    latency: 0
  });

  const [users, setUsers] = useState<RealtimeUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const pingStartTime = useRef<number>(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isCleaningUpRef = useRef<boolean>(false);

  // Send a message through WebSocket
  const sendMessage = useCallback((message: RealtimeEvent) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('evt', {
        ...message,
        timestamp: message.timestamp || Date.now()
      });
    } else {
      log('warn', 'Cannot send message: WebSocket not connected', message);
    }
  }, []);

  // Send camera position update
  const sendCameraUpdate = useCallback((position: number[]) => {
    // Convert rotation to quaternion (simplified)
    const quaternion = [0, 0, 0, 1]; // TODO: Proper euler to quaternion conversion
    
    sendMessage({
      t: 'CAMERA',
      pose: {
        p: position as [number, number, number],
        q: quaternion as [number, number, number, number]
      }
    } as CameraUpdateEvent);
  }, [sendMessage]);

  // Send chat message
  const sendChatMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    const chatMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      userId: 'current-user', // TODO: Get from auth context
      author: 'You',
      content: content.trim(),
      timestamp: Date.now(),
      type: 'text'
    };

    // Add to local messages immediately for instant feedback
    setMessages(prev => [...prev, chatMessage]);

    sendMessage({
      t: 'CHAT',
      msg: content.trim()
    });
  }, [sendMessage]);

  // Clear any existing connections and timeouts
  const cleanup = useCallback(() => {
    isCleaningUpRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setConnectionState(prev => ({ 
      ...prev, 
      isConnected: false, 
      isConnecting: false 
    }));
  }, []);

  // Main WebSocket connection effect
  useEffect(() => {
    if (!enabled || !token || !sceneId) {
      log('warn', 'Realtime connection disabled', { enabled, hasToken: !!token, sceneId });
      cleanup();
      return;
    }

    // If we're already connecting to the same scene, don't create a new connection
    if (socketRef.current && !isCleaningUpRef.current) {
      log('debug', 'Connection already exists for scene', sceneId);
      return;
    }

    // Clean up any existing connection first
    cleanup();
    isCleaningUpRef.current = false;
    reconnectAttemptsRef.current = 0;

    setConnectionState(prev => ({ ...prev, isConnecting: true, reconnectAttempts: 0 }));

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    log('info', 'Connecting to realtime server', { serverUrl, sceneId, tokenPreview: token.substring(0, 20) + '...' });

    const socket = io(`${serverUrl}/rt`, {
      query: { token, sceneId },
      transports: ['websocket'],
      timeout: 10000,
      reconnection: false // We handle reconnection manually
    });

    // Connection successful
    socket.on('connect', () => {
      if (isCleaningUpRef.current) return;
      
      log('info', 'Realtime connection established');
      reconnectAttemptsRef.current = 0;
      setConnectionState({
        isConnected: true,
        isConnecting: false,
        connectionError: null,
        reconnectAttempts: 0,
        latency: 0
      });

      // Start pinging for latency measurement
      const pingInterval = setInterval(() => {
        if (socketRef.current?.connected && !isCleaningUpRef.current) {
          pingStartTime.current = Date.now();
          socketRef.current.emit('evt', {
            t: 'PING',
            ts: pingStartTime.current
          });
        }
      }, 10000);
      
      socket.on('disconnect', () => clearInterval(pingInterval));
    });

    // Connection failed
    socket.on('connect_error', (error) => {
      if (isCleaningUpRef.current) return;
      
      reconnectAttemptsRef.current++;
      log('error', 'Realtime connection failed', {
        error: error.message,
        type: (error as any).type || 'unknown',
        description: (error as any).description || 'Connection failed',
        context: (error as any).context || null,
        serverUrl,
        sceneId,
        hasToken: !!token,
        attempts: reconnectAttemptsRef.current
      });
      
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        connectionError: error.message,
        reconnectAttempts: reconnectAttemptsRef.current
      }));
      
      // Attempt reconnection if not at max attempts
      if (reconnectAttemptsRef.current < 5 && !isCleaningUpRef.current) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        log('info', `Scheduling reconnection attempt ${reconnectAttemptsRef.current + 1} in ${delay}ms`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isCleaningUpRef.current && enabled && token && sceneId) {
            log('info', `Attempting to reconnect (attempt ${reconnectAttemptsRef.current + 1})`);
            // Trigger the effect to create a new connection
            socketRef.current = null;
            setConnectionState(prev => ({ ...prev, isConnecting: true }));
          }
        }, delay);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      if (isCleaningUpRef.current) return;
      
      log('warn', 'Realtime connection lost', reason);
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        connectionError: `Disconnected: ${reason}`
      }));

      // Don't reconnect if server disconnected us (auth issues) or if we're cleaning up
      if (reason === 'io server disconnect') {
        log('warn', 'Server disconnected client, possible auth issue');
      } else if (!isCleaningUpRef.current && enabled && token && sceneId) {
        // Only reconnect for unexpected disconnections
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isCleaningUpRef.current) {
            log('info', 'Attempting to reconnect after disconnect');
            socketRef.current = null;
            setConnectionState(prev => ({ ...prev, isConnecting: true }));
          }
        }, delay);
      }
    });

    // Handle incoming events
    socket.on('evt', (data: RealtimeEvent) => {
      log('debug', 'Received realtime event', data);

      switch (data.t) {
        case 'HELLO':
          log('info', 'Realtime session joined', {
            sceneId: data.sceneId,
            version: data.version,
            serverTime: data.serverTime
          });
          break;

        case 'PRESENCE':
          const presenceData = data as PresenceEvent;
          const updatedUsers = presenceData.users.map((user, index) => ({
            ...user,
            userId: user.userId || user.id, // Map id to userId for compatibility
            color: user.color || USER_COLORS[index % USER_COLORS.length],
            status: user.status || 'online', // Default to online if not provided
            isCurrentUser: user.userId === 'current-user' || user.id === 'current-user' // TODO: Get from auth
          }));
          setUsers(updatedUsers);
          log('info', `🟢 Presence update: ${updatedUsers.length} users online`, updatedUsers);
          break;

        case 'CHAT':
          const chatMessage: ChatMessage = {
            id: `remote-${Date.now()}-${Math.random()}`,
            userId: data.from || 'unknown',
            author: data.from || 'Unknown User',
            content: data.msg || '',
            timestamp: data.ts || Date.now(),
            type: 'text'
          };
          setMessages(prev => [...prev, chatMessage]);
          break;

        case 'CAMERA':
          // Update user camera positions
          const cameraData = data as CameraUpdateEvent;
          if (data.from) {
            setUsers(prev => prev.map(user => 
              user.userId === data.from
                ? {
                    ...user,
                    camera: {
                      position: cameraData.pose.p,
                      rotation: [0, 0, 0], // TODO: Convert quaternion to euler
                    }
                  }
                : user
            ));
          }
          break;

        case 'PONG':
          if (pingStartTime.current > 0) {
            const latency = Date.now() - pingStartTime.current;
            setConnectionState(prev => ({ ...prev, latency }));
            pingStartTime.current = 0;
          }
          break;

        case 'INVITE_RECEIVED':
          const inviteEvent = data as InviteReceivedEvent;
          onInviteReceived?.(inviteEvent);
          log('info', 'Invitation received', inviteEvent.invitation);
          break;

        case 'INVITE_ACCEPTED':
        case 'INVITE_DECLINED':
          const responseEvent = data as InviteResponseEvent;
          onInviteResponse?.(responseEvent);
          log('info', 'Invitation response received', {
            type: data.t,
            userId: responseEvent.userId,
            userName: responseEvent.userName
          });
          break;

        case 'SESSION_STARTED':
        case 'SESSION_ENDED':
          const sessionEvent = data as SessionEvent;
          onSessionEvent?.(sessionEvent);
          log('info', 'Session event received', {
            type: data.t,
            session: sessionEvent.session
          });
          break;

        case 'VIEWPORT_SYNC':
          const viewportEvent = data as ViewportSyncEvent;
          onViewportSync?.(viewportEvent);
          log('debug', 'Viewport sync received', {
            from: viewportEvent.from,
            viewport: viewportEvent.viewport
          });
          break;

        case 'NOTIFICATION':
          const notificationEvent = data as NotificationEvent;
          onNotification?.(notificationEvent);
          log('info', 'Notification received', notificationEvent.notification);
          break;

        default:
          log('debug', 'Unhandled realtime event type', data);
      }
    });

    socketRef.current = socket;

    return cleanup;
  }, [token, sceneId, enabled, cleanup]);

  // Reset state when sceneId changes
  useEffect(() => {
    setUsers([]);
    setMessages([]);
    reconnectAttemptsRef.current = 0;
  }, [sceneId]);

  return {
    connectionState,
    users,
    messages,
    sendMessage,
    sendCameraUpdate,
    sendChatMessage
  };
};