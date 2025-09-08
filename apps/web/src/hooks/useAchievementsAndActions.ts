import { useState, useCallback } from 'react';
import { log } from '../utils/logger';

export interface Achievement {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'yellow' | 'blue' | 'red' | 'green';
  unlocked: boolean;
}

export interface QuickAction {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  action: string;
  color: 'yellow' | 'blue' | 'green' | 'gray';
}

export const useAchievements = () => {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const handleAchievementClick = useCallback((achievement: Achievement) => {
    if (achievement.unlocked) {
      setSelectedAchievement(achievement);
    }
  }, []);

  return {
    selectedAchievement,
    onAchievementClick: handleAchievementClick,
  };
};

export const useQuickActions = () => {
  const handleQuickAction = useCallback((action: string, onShowState?: (state: string) => void) => {
    switch (action) {
      case 'project':
        log('info', 'Creating new project...');
        onShowState?.('ai-processing');
        // Navigate to project creation
        window.location.href = '/app/projects/new';
        break;
      case 'upload':
  log('info', 'Opening asset upload...');
        onShowState?.('loading');
        // Navigate to project editor where asset import is available
        window.location.href = '/app/projects/demo';
        break;
      case 'messages':
        log('info', 'Opening messages...');
        break;
      case 'settings':
        log('info', 'Opening settings...');
        break;
      default:
        log('warn', 'Unknown action:', action);
    }
  }, []);

  return {
    handleQuickAction,
  };
};