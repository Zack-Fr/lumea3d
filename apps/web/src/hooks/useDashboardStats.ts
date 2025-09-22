import { useState, useCallback } from 'react';
import { log } from '../utils/logger';

export interface UserStats {
  totalProjects: number;
  completedProjects: number;
  activeClients: number;
  totalEarnings: string;
  rating: number;
  experience: number;
  level: number;
  nextLevelExp: number;
}

export const useDashboardStats = () => {
  const [stats] = useState<UserStats>({
    totalProjects: 28,
    completedProjects: 23,
    activeClients: 8,
    totalEarnings: "$47,500",
    rating: 4.9,
    experience: 8250,
    level: 12,
    nextLevelExp: 1750,
  });

  const refreshStats = useCallback(() => {
    // Implementation for refreshing stats from API
    log('info', 'Refreshing dashboard stats...');
  }, []);

  return {
    stats,
    refreshStats,
  };
};