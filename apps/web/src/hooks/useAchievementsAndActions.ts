import { useState, useCallback } from 'react';

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
        console.log('Creating new project...');
        onShowState?.('ai-processing');
        break;
      case 'upload':
        console.log('Uploading asset...');
        onShowState?.('loading');
        break;
      case 'messages':
        console.log('Opening messages...');
        break;
      case 'settings':
        console.log('Opening settings...');
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, []);

  return {
    handleQuickAction,
  };
};