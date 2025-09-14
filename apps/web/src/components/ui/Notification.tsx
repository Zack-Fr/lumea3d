import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  message: string;
  type?: NotificationType;
  duration?: number;
  onClose?: () => void;
}

const Notification: React.FC<NotificationProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-[var(--glass-yellow)]" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-400/50';
      case 'error':
        return 'border-red-400/50';
      case 'warning':
        return 'border-yellow-400/50';
      case 'info':
      default:
        return 'border-[var(--glass-yellow)]/50';
    }
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50
        glass
        border ${getBorderColor()}
        rounded-lg
        p-4
        min-w-[320px]
        max-w-[480px]
        shadow-lg
        animate-slide-in-right
        glow-yellow
      `}
      style={{
        background: 'var(--glass-bg-card)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border-light)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--foreground)] leading-relaxed">
            {message}
          </p>
        </div>

        <button
          onClick={handleClose}
          className="
            flex-shrink-0
            p-1
            rounded-md
            hover:bg-[var(--glass-gray)]/20
            transition-colors
            duration-200
          "
          aria-label="Close notification"
        >
          <X className="w-4 h-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" />
        </button>
      </div>
    </div>
  );
};

// Notification Manager Component for managing multiple notifications
interface NotificationManagerProps {
  notifications: Array<{
    id: string;
    message: string;
    type?: NotificationType;
    duration?: number;
  }>;
  onRemove: (id: string) => void;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  notifications,
  onRemove
}) => {
  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            transform: `translateY(${index * 8}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          <Notification
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
            onClose={() => onRemove(notification.id)}
          />
        </div>
      ))}
    </div>
  );
};

// Hook for managing notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type?: NotificationType;
    duration?: number;
  }>>([]);

  const addNotification = (
    message: string,
    type: NotificationType = 'info',
    duration: number = 5000
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type, duration }]);
    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll
  };
};

export default Notification;