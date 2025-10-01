import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X, Users, Minus, Maximize } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useRealtimeConnection } from '../hooks/useRealtimeConnection';
import { useAuth } from '../../../providers/AuthProvider';
import { useSceneContext } from '../../../contexts/SceneContext';
import type { ChatMessage } from '../types/realtime';

interface RealtimeChatProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const RealtimeChat: React.FC<RealtimeChatProps> = ({ 
  className = '', 
  position = 'bottom-right' 
}) => {
  const { token } = useAuth();
  const { sceneId } = useSceneContext();
  const { connectionState, users, messages, sendChatMessage } = useRealtimeConnection({
    token,
    sceneId,
    enabled: true
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Track unread messages when panel is closed
  useEffect(() => {
    if (!isOpen) {
      setUnreadCount(prev => prev + 1);
    } else {
      setUnreadCount(0);
    }
  }, [messages.length, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !connectionState.isConnected) return;
    
    sendChatMessage(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      {/* Chat Toggle Button */}
      <div className="relative">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant={isOpen ? "secondary" : "default"}
          size="sm"
          className="rounded-full w-12 h-12 p-0 shadow-lg"
        >
          {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        </Button>
        
        {/* Connection Status Indicator - moved to top-left */}
        <div 
          className={`absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-white ${
            connectionState.isConnected 
              ? 'bg-green-500' 
              : connectionState.isConnecting 
                ? 'bg-yellow-500 animate-pulse' 
                : 'bg-red-500'
          }`}
          title={
            connectionState.isConnected 
              ? 'Connected' 
              : connectionState.isConnecting 
                ? 'Connecting...' 
                : 'Disconnected'
          }
        />
        
        {/* Unread Messages Badge - moved to top-right since status is now top-left */}
        {!isOpen && unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl" style={{transform: 'translateY(-100%)'}}>
          {/* Chat Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-500" />
              <span className="font-semibold text-sm">
                Team Chat ({users.length})
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Connection Info */}
              <div className="flex items-center gap-2 text-xs text-gray-500 mr-2">
                {connectionState.latency > 0 && (
                  <span>{connectionState.latency}ms</span>
                )}
                <div 
                  className={`w-2 h-2 rounded-full ${
                    connectionState.isConnected 
                      ? 'bg-green-500' 
                      : connectionState.isConnecting
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  title={connectionState.connectionError || 'Connection status'}
                />
              </div>
              
              {/* Minimize/Maximize Button */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title={isMinimized ? 'Expand chat' : 'Minimize chat'}
              >
                {isMinimized ? <Maximize size={14} /> : <Minus size={14} />}
              </button>
              
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Close chat"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages List - hide when minimized */}
          {!isMinimized && (
            <div className="h-64 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p>No messages yet</p>
                <p className="text-xs">Start a conversation with your team!</p>
              </div>
            ) : (
              messages.map((message: ChatMessage) => (
                <div key={message.id} className="mb-2">
                  <div className={`flex ${message.userId === 'current-user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        message.userId === 'current-user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {message.userId !== 'current-user' && (
                        <div className="text-xs font-semibold mb-1 opacity-70">
                          {message.author}
                        </div>
                      )}
                      <div className="text-sm">{message.content}</div>
                      <div 
                        className={`text-xs mt-1 opacity-70 ${
                          message.userId === 'current-user' 
                            ? 'text-blue-100' 
                            : 'text-gray-500'
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
            </div>
          )}

          {/* Chat Input - hide when minimized */}
          {!isMinimized && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  connectionState.isConnected 
                    ? "Type a message..." 
                    : "Connecting..."
                }
                disabled={!connectionState.isConnected}
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md text-sm
                        bg-transparent dark:bg-gray-700 text-gray-900 dark:text-black
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || !connectionState.isConnected}
                size="sm"
                className="px-3"
              >
                <Send size={16} />
              </Button>
            </div>
            
            {/* Status Messages */}
            {connectionState.connectionError && (
              <div className="text-xs text-red-500 mt-1">
                Connection error: {connectionState.connectionError}
              </div>
            )}
            
            {connectionState.isConnecting && (
              <div className="text-xs text-yellow-500 mt-1 flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Connecting to chat...
              </div>
            )}
            

            <div className="text-xs text-gray-400 mt-1 space-y-1">
              <div>Scene: {sceneId || 'None'}</div>
              <div>Token: {token ? 'Available' : 'Missing'}</div>
              <div>Server: {import.meta.env.VITE_API_URL || 'Default'}</div>
              <div>Attempts: {connectionState.reconnectAttempts}</div>
            </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealtimeChat;