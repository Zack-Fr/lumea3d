import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '../providers/AuthProvider'
import { log } from '../utils/logger'
import type { SceneDelta } from '@/api/sdk'

interface SceneChannelState {
  connected: boolean
  connectionType: 'websocket' | 'sse' | null
  error: string | null
  reconnecting: boolean
}

interface SceneChannelOptions {
  enabled?: boolean
  onDelta?: (delta: SceneDelta) => void
  onError?: (error: Error) => void
  onConnectionChange?: (state: SceneChannelState) => void
}

/**
 * Hook for real-time scene updates via WebSocket (primary) with SSE fallback
 * 
 * Features:
 * - WebSocket connection to /scenes namespace with sceneId + token auth
 * - Robust error handling to prevent infinite loops
 * - Connection throttling and exponential backoff
 * - Automatic query cache invalidation on deltas
 * - Graceful reconnection with circuit breaker pattern
 */
export function useSceneChannel(
  sceneId: string,
  options: SceneChannelOptions = {}
) {
  const { enabled = true, onDelta, onError, onConnectionChange } = options
  const { token } = useAuth()
  const queryClient = useQueryClient()
  
  // Connection state
  const [state, setState] = useState<SceneChannelState>({
    connected: false,
    connectionType: null,
    error: null,
    reconnecting: false
  })
  
  // Refs for cleanup and circuit breaker
  const socketRef = useRef<Socket | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)
  const circuitBreakerOpenRef = useRef(false)
  
  // Circuit breaker constants
  const maxReconnectAttempts = 3 // Reduced from 5 to prevent excessive retries
  const baseReconnectDelay = 2000 // Increased to 2 seconds
  const circuitBreakerTimeout = 30000 // 30 seconds before allowing retry after circuit open
  
  // Update state helper
  const updateState = useCallback((updates: Partial<SceneChannelState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates }
      onConnectionChange?.(newState)
      return newState
    })
  }, [onConnectionChange])
  
  // Handle scene deltas
  const handleDelta = useCallback((delta: SceneDelta) => {
    // Invalidate relevant queries
    queryClient.invalidateQueries({
      queryKey: ['scene', sceneId, 'manifest']
    })
    
    // Call optional delta handler
    onDelta?.(delta)
  }, [queryClient, sceneId, onDelta])
  
  // Handle connection errors
  const handleError = useCallback((error: Error, connectionType: 'websocket' | 'sse') => {
    log('error', `Scene channel ${connectionType} error:`, error as any)
    updateState({ error: error.message })
    onError?.(error)
  }, [updateState, onError])
  
  // WebSocket connection with circuit breaker
  const connectWebSocket = useCallback(() => {
    if (!token || !sceneId) return null
    
    // Circuit breaker: stop trying if already connecting or circuit is open
    if (isConnectingRef.current || circuitBreakerOpenRef.current) {
      log('debug', 'WebSocket connection blocked: already connecting or circuit breaker open');
      return null;
    }
    
    // Circuit breaker: stop trying after max attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      log('warn', `WebSocket connection attempts exceeded (${maxReconnectAttempts}), opening circuit breaker`);
      circuitBreakerOpenRef.current = true;
      
      // Reset circuit breaker after timeout
      setTimeout(() => {
        log('info', 'Circuit breaker reset, allowing new WebSocket attempts');
        circuitBreakerOpenRef.current = false;
        reconnectAttemptsRef.current = 0;
      }, circuitBreakerTimeout);
      
      return null;
    }
    
    isConnectingRef.current = true;
    
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    log('info', `🔌 Connecting WebSocket to: ${serverUrl}/scenes`, { sceneId, hasToken: !!token })
    const socket = io(`${serverUrl}/scenes`, {
      query: { sceneId, token }, // Pass both sceneId and token in query for WsSceneGuard
      transports: ['websocket'],
      timeout: 10000, // Longer timeout to reduce rapid failures
      reconnection: false, // We handle reconnection manually
      forceNew: true // Ensure fresh connection
    })
    
    socket.on('connect', () => {
      log('info', `✅ WebSocket connected to scene: ${sceneId}`);
      isConnectingRef.current = false;
      reconnectAttemptsRef.current = 0; // Reset counter on success
      circuitBreakerOpenRef.current = false; // Close circuit breaker on success
      
      updateState({
        connected: true,
        connectionType: 'websocket',
        error: null,
        reconnecting: false
      })
      
      // Join the scene room
      socket.emit('joinScene', { projectId: 'current-project', sceneId });
    })
    
    socket.on('scene:delta', handleDelta)
    
    socket.on('disconnect', (reason) => {
      log('warn', `🔌 WebSocket disconnected: ${reason}`);
      isConnectingRef.current = false;
      
      updateState({
        connected: false,
        error: null, // Don't treat normal disconnection as error
        reconnecting: false
      })
      
      // Don't auto-reconnect on disconnect - only on connect_error
      // This prevents the infinite loop caused by immediate reconnection
    })
    
    socket.on('connect_error', (error) => {
      isConnectingRef.current = false;
      reconnectAttemptsRef.current += 1;
      
      log('error', `❌ WebSocket connection failed (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}):`, {
        message: error.message,
        type: (error as any).type,
        description: (error as any).description,
        context: (error as any).context,
        sceneId,
        hasToken: !!token,
        tokenLength: token?.length
      });
      
      handleError(error, 'websocket');
      socket.disconnect();
      
      // Only schedule reconnection if we haven't exceeded max attempts
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
        log('info', `🔄 Scheduling WebSocket retry in ${delay}ms...`);
        
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (!circuitBreakerOpenRef.current) {
            updateState({ reconnecting: true });
            const newSocket = connectWebSocket();
            if (newSocket) {
              socketRef.current = newSocket;
            }
          }
        }, delay);
      } else {
        log('warn', '🚫 Max WebSocket reconnection attempts reached - opening circuit breaker');
        circuitBreakerOpenRef.current = true;
        
        // Reset after timeout
        setTimeout(() => {
          log('info', 'Circuit breaker reset after timeout');
          circuitBreakerOpenRef.current = false;
          reconnectAttemptsRef.current = 0;
        }, circuitBreakerTimeout);
      }
    })
    
    return socket
  }, [token, sceneId, handleDelta, handleError, updateState]) // REMOVED 'enabled' to prevent infinite loops
  
  // SSE connection (DISABLED - JWT auth limitations with EventSource)
  // EventSource cannot send Authorization headers, making JWT authentication impossible
  // WebSocket is the primary and only supported real-time method
  
  // DEPRECATED: Removed scheduleReconnect to prevent infinite loops
  // Reconnection is now handled directly in connectWebSocket's connect_error handler
  
  // Main connection logic
  const connect = useCallback(() => {
    if (!enabled || !token || !sceneId) return
    
    // Try WebSocket with circuit breaker protection
    const socket = connectWebSocket()
    if (socket) {
      socketRef.current = socket
      
      // Note: SSE fallback disabled due to JWT auth limitations with EventSource
      // WebSocket is the primary real-time method
      log('debug', 'WebSocket connection initiated - SSE fallback disabled for JWT compatibility')
      
      // Removed disconnect handler that was causing infinite reconnection loop
      // Reconnection is now handled only in connect_error handler with circuit breaker
    }
  }, [enabled, token, sceneId, connectWebSocket])
  
  // Disconnect helper
  const disconnect = useCallback(() => {
    // Clear any pending reconnection timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Reset circuit breaker flags
    isConnectingRef.current = false;
    circuitBreakerOpenRef.current = false;
    reconnectAttemptsRef.current = 0;
    
    // Disconnect WebSocket
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    
    // Close EventSource (even though it's disabled, clean up ref)
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    updateState({
      connected: false,
      connectionType: null,
      reconnecting: false,
      error: null
    })
    
    log('debug', 'WebSocket disconnected and cleaned up');
  }, [updateState])
  
  // Manual reconnect function
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])
  
  // Effect for connection management - FIXED to prevent infinite loops
  useEffect(() => {
    // Cleanup function to run on effect cleanup or unmount
    const cleanup = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      
      // Reset circuit breaker flags
      isConnectingRef.current = false;
      circuitBreakerOpenRef.current = false;
      reconnectAttemptsRef.current = 0;
      
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      
      updateState({
        connected: false,
        connectionType: null,
        reconnecting: false,
        error: null
      })
    }

    if (enabled && token && sceneId) {
      // Clean up any existing connections first
      cleanup();
      
      // Start new connection directly in effect to avoid dependency issues
      const socket = connectWebSocket()
      if (socket) {
        socketRef.current = socket
      }
    } else {
      cleanup()
    }
    
    return cleanup
  }, [enabled, token, sceneId]) // Only depend on the actual values that should trigger reconnection
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])
  
  return {
    ...state,
    reconnect
  }
}

export default useSceneChannel