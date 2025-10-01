import { useState, useCallback } from 'react';

export interface RecentActivity {
  type: string;
  message: string;
  time: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'yellow' | 'blue' | 'purple' | 'gold';
}

export interface UpcomingDeadline {
  project: string;
  client: string;
  dueDate: string;
  daysLeft: number;
  priority: 'high' | 'medium' | 'low';
}

export const useActivity = () => {
  const [viewAllActivity, setViewAllActivity] = useState<boolean>(false);

  const toggleViewAll = useCallback(() => {
    setViewAllActivity(prev => !prev);
  }, []);

  return {
    viewAllActivity,
    toggleViewAll,
  };
};

export const useDeadlines = () => {
  const [selectedDeadline, setSelectedDeadline] = useState<UpcomingDeadline | null>(null);

  const handleDeadlineClick = useCallback((deadline: UpcomingDeadline) => {
    setSelectedDeadline(deadline);
  }, []);

  return {
    selectedDeadline,
    onDeadlineClick: handleDeadlineClick,
  };
};