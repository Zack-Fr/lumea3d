import React, { useState } from 'react';
import { Bell, BellRing, X, Check, UserPlus, Clock, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ScrollArea } from '../ui/ScrollArea';
import { useInvitations } from '../../hooks/useInvitations';
import type { Notification, NotificationType } from '../../features/realtime/types/realtime';

interface NotificationCenterProps {
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className = '',
  position = 'top-right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markNotificationAsRead,
    clearNotification,
    clearAllNotifications,
    acceptInvitation,
    declineInvitation,
  } = useInvitations();

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'invitation':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'invitation':
        return 'border-blue-200 bg-blue-50';
      case 'info':
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markNotificationAsRead(notification.id);
    }
  };

  const handleAcceptInvitation = async (notification: Notification) => {
    const { invitation } = notification.data || {};
    if (!invitation) return;

    try {
      await acceptInvitation(invitation.id, invitation.token);
      clearNotification(notification.id);
    } catch (error) {
      console.error('Failed to accept invitation:', error);
    }
  };

  const handleDeclineInvitation = async (notification: Notification) => {
    const { invitationId } = notification.data || {};
    if (!invitationId) return;

    try {
      await declineInvitation(invitationId);
      clearNotification(notification.id);
    } catch (error) {
      console.error('Failed to decline invitation:', error);
    }
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      {/* Notification Button */}
      <div className="relative">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant={isOpen ? "secondary" : "default"}
          size="sm"
          className="rounded-full w-12 h-12 p-0 shadow-lg relative"
        >
          {unreadCount > 0 ? <BellRing size={20} /> : <Bell size={20} />}
          
          {/* Unread badge */}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 min-w-[1.5rem] h-6 text-xs font-semibold flex items-center justify-center px-1"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notifications Panel */}
      {isOpen && (
        <div className="absolute top-16 right-0 w-80 max-h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-gray-500" />
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {/* Mark all as read */}
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    notifications.forEach(n => {
                      if (!n.isRead) markNotificationAsRead(n.id);
                    });
                  }}
                  className="text-xs px-2 py-1 h-auto"
                >
                  Mark all read
                </Button>
              )}
              
              {/* Clear all */}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="text-xs px-2 py-1 h-auto"
                >
                  Clear all
                </Button>
              )}
              
              {/* Close */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="p-1 h-auto"
              >
                <X size={14} />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="max-h-80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`
                      relative p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm
                      ${getNotificationColor(notification.type)}
                      ${!notification.isRead ? 'ring-2 ring-blue-200 ring-opacity-50' : ''}
                    `}
                  >
                    {/* Unread indicator */}
                    {!notification.isRead && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}

                    {/* Content */}
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 pt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Message */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        
                        {/* Timestamp */}
                        <div className="flex items-center gap-1 mt-2">
                          <Clock size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>

                        {/* Invitation Actions */}
                        {notification.type === 'invitation' && notification.data && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptInvitation(notification);
                              }}
                              className="text-xs px-3 py-1 h-auto"
                            >
                              <Check size={12} className="mr-1" />
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeclineInvitation(notification);
                              }}
                              className="text-xs px-3 py-1 h-auto"
                            >
                              <X size={12} className="mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Close button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                        className="p-1 h-auto opacity-50 hover:opacity-100"
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;