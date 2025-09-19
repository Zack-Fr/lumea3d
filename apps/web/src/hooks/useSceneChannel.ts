import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '../providers/AuthProvider'
import { log } from '../utils/logger'
import type { SceneDelta } from '@/api/sdk'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
 * - Automatic SSE fallback when WebSocket fails
 * - Automatic query cache invalidation on deltas
 * - Connection state management and error handling
 * - Graceful reconnection with exponential backoff
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
  
  // Refs for cleanup
  const socketRef = useRef<Socket | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const lastEventIdRef = useRef<string | null>(null)
  
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
  
  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!token || !sceneId) return null
    
    const socket = io('/scenes', {
      query: { sceneId, token }, // Pass both sceneId and token in query for WsSceneGuard
      transports: ['websocket'],
      timeout: 10000,
      reconnection: false // We handle reconnection manually
    })
    
    socket.on('connect', () => {
      log('info', `WebSocket connected to scene: ${sceneId}`);
      reconnectAttemptsRef.current = 0
      updateState({
        connected: true,
        connectionType: 'websocket',
        error: null,
        reconnecting: false
      })
    })
    
    socket.on('scene:delta', handleDelta)
    
    socket.on('disconnect', (reason) => {
      log('warn', `WebSocket disconnected: ${reason}`)
      updateState({
        connected: false,
        error: `Disconnected: ${reason}`
      })
    })
    
    socket.on('connect_error', (error) => {
      log('warn', 'WebSocket connection failed, trying SSE fallback:', error as any)
      handleError(error, 'websocket')
      socket.disconnect()
      // Don't set reconnecting here - we'll fall back to SSE
    })
    
    return socket
  }, [token, sceneId, handleDelta, handleError, updateState])
  
  // SSE connection
  const connectSSE = useCallback(() => {
    if (!token || !sceneId) return null
    
    // Use flat SSE route: /scenes/:sceneId/events
    // Build URL with proper base path and token auth via query parameter
    // Include Last-Event-ID for reconnection if we have one
    let url = `${API_BASE_URL}/scenes/${sceneId}/events?token=${encodeURIComponent(token)}`
    
    // Create EventSource with custom headers if we need to resume
    let eventSource: EventSource
    if (lastEventIdRef.current) {
      // For browsers that support it, we can try to set Last-Event-ID
      // Note: Most browsers handle this automatically, but we track it for manual reconnection
      log('debug', `Reconnecting SSE with Last-Event-ID: ${lastEventIdRef.current}`)
      url += `&lastEventId=${encodeURIComponent(lastEventIdRef.current)}`
    }
    
    eventSource = new EventSource(url)
    
    eventSource.onopen = () => {
      log('info', `SSE connected to scene: ${sceneId}`)
      reconnectAttemptsRef.current = 0
      updateState({
        connected: true,
        connectionType: 'sse',
        error: null,
        reconnecting: false
      })
    }
    
    eventSource.onmessage = (event) => {
      try {
        // Store the event ID for reconnection
        if (event.lastEventId) {
          lastEventIdRef.current = event.lastEventId
        }
        
        const delta = JSON.parse(event.data) as SceneDelta
        handleDelta(delta)
      } catch (error) {
        log('error', 'Failed to parse SSE delta:', error as any)
      }
    }
    
    eventSource.onerror = (error) => {
      log('error', 'SSE connection error:', error as any)
      updateState({
        connected: false,
        error: 'SSE connection failed'
      })
      handleError(new Error('SSE connection failed'), 'sse')
    }
    
    return eventSource
  }, [token, sceneId, handleDelta, handleError, updateState])
  
  // Reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    const maxAttempts = 5
    const baseDelay = 1000 // 1 second
    
    if (reconnectAttemptsRef.current >= maxAttempts) {
      updateState({
        error: 'Maximum reconnection attempts reached',
        reconnecting: false
      })
      return
    }
    
    const delay = baseDelay * Math.pow(2, reconnectAttemptsRef.current)
    reconnectAttemptsRef.current++
    
    updateState({ reconnecting: true })
    
    reconnectTimeoutRef.current = window.setTimeout(() => {
      log('debug', `Reconnecting attempt ${reconnectAttemptsRef.current}...`)
      
      // For SSE reconnection, we prefer to use the same connection type
      // unless explicitly requested to try WebSocket first
      if (state.connectionType === 'sse') {
        const eventSource = connectSSE()
        if (eventSource) {
          eventSourceRef.current = eventSource
        }
      } else {
        // Try WebSocket first, then fallback will happen automatically
        const socket = connectWebSocket()
        if (socket) {
          socketRef.current = socket
        }
      }
    }, delay)
  }, [updateState, state.connectionType, connectSSE, connectWebSocket])
  
  // Main connection logic
  const connect = useCallback(() => {
    if (!enabled || !token || !sceneId) return
    
    // Clear any existing connections
    disconnect()
    
    // Try WebSocket first
    const socket = connectWebSocket()
    if (socket) {
      socketRef.current = socket
      
      // Set up fallback to SSE if WebSocket fails
      const fallbackTimeout = window.setTimeout(() => {
        if (!state.connected || state.connectionType !== 'websocket') {
          log('warn', 'WebSocket failed, falling back to SSE')
          socket.disconnect()
          socketRef.current = null
          
          const eventSource = connectSSE()
          if (eventSource) {
            eventSourceRef.current = eventSource
          }
        }
      }, 5000) // 5 second timeout for WebSocket
      
      socket.on('connect', () => {
        clearTimeout(fallbackTimeout)
      })
      
      socket.on('disconnect', () => {
        if (enabled) {
          scheduleReconnect()
        }
      })
    }
  }, [enabled, token, sceneId, connectWebSocket, connectSSE, scheduleReconnect, state.connected, state.connectionType])
  
  // Disconnect helper
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
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
      reconnecting: false
    })
  }, [updateState])
  
  // Manual reconnect function
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])
  
  // Effect for connection management
  useEffect(() => {
    if (enabled && token && sceneId) {
      connect()
    } else {
      disconnect()
    }
    
    return disconnect
  }, [enabled, token, sceneId, connect, disconnect])
  
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