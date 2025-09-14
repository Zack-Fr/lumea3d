import { useState, useEffect } from 'react';
import { transformHistoryManager } from './TransformHistoryManager';

interface TransformFeedbackProps {
  className?: string;
}

export function TransformFeedback({ className }: TransformFeedbackProps) {
  const [message, setMessage] = useState<string>('');
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState(transformHistoryManager.getStats());

  useEffect(() => {
    // Update stats periodically
    const interval = setInterval(() => {
      setStats(transformHistoryManager.getStats());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Listen for transform history changes
    let timeoutId: number;

    const checkForChanges = () => {
      const newStats = transformHistoryManager.getStats();
      
      // Show feedback when there are operations available
      if (newStats.totalEntries > 0 && (newStats.canUndo || newStats.canRedo)) {
        if (newStats.isUndoing) {
          setMessage('↶ Transform undone');
          setVisible(true);
        } else if (newStats.isRedoing) {
          setMessage('↷ Transform redone');
          setVisible(true);
        }
        
        // Auto-hide after 2 seconds
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          setVisible(false);
        }, 2000);
      }
      
      setStats(newStats);
    };

    const interval = setInterval(checkForChanges, 50);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, []);

  if (!visible && stats.totalEntries === 0) {
    return null;
  }

  return (
    <div className={className}>
      {/* Undo/Redo Status */}
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm"
        style={{
          backgroundColor: 'var(--glass-bg-card)',
          border: '1px solid var(--glass-border)',
          color: 'var(--glass-white)',
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* History Status */}
        <div className="flex items-center gap-1">
          <span 
            style={{ 
              color: stats.canUndo ? 'var(--glass-yellow)' : 'var(--glass-gray)' 
            }}
            title="Ctrl+Z to undo"
          >
            ↶
          </span>
          <span style={{ color: 'var(--glass-gray)' }}>
            {stats.currentIndex + 1}/{stats.totalEntries}
          </span>
          <span 
            style={{ 
              color: stats.canRedo ? 'var(--glass-yellow)' : 'var(--glass-gray)' 
            }}
            title="Ctrl+Y to redo"
          >
            ↷
          </span>
        </div>

        {/* Feedback Message */}
        {visible && message && (
          <>
            <div 
              style={{ 
                width: '1px', 
                height: '16px', 
                backgroundColor: 'var(--glass-border)' 
              }} 
            />
            <span 
              className="transition-opacity duration-200"
              style={{ 
                color: 'var(--glass-yellow)',
                opacity: visible ? 1 : 0
              }}
            >
              {message}
            </span>
          </>
        )}
      </div>
    </div>
  );
}