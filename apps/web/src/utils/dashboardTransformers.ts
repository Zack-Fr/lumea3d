import { Home, Palette, Users, CheckCircle } from 'lucide-react';
import { DashboardProject, UserProfile } from '../services/dashboardApi';
import { Project, PipelineStage } from '../types/dashboard';
import { log } from '../utils/logger';

/**
 * Transform API project data to dashboard project format
 */
export const transformProjectsForDashboard = (apiProjects: DashboardProject[]): Project[] => {
  // Defensive: deduplicate incoming projects by their string id to avoid duplicate React keys
  const beforeCount = apiProjects.length;
  const uniqueById = Array.from(new Map(apiProjects.map(p => [p.id, p])).values());
  if (uniqueById.length !== beforeCount) {
    log('warn', 'Duplicate projects detected in API response; removed duplicates before transforming', { before: beforeCount, after: uniqueById.length });
  }

  return uniqueById.map(apiProject => {
    // Determine project stage based on scenes and dates
    const hasScenes = apiProject.scenes3D && apiProject.scenes3D.length > 0;
    const createdDate = new Date(apiProject.createdAt);
    const updatedDate = new Date(apiProject.updatedAt);
    const daysSinceUpdate = Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));

    let stage: Project['stage'] = 'concept';
    let progress = 0;

    if (hasScenes) {
      if (daysSinceUpdate < 7) {
        stage = 'design';
        progress = 65;
      } else if (daysSinceUpdate < 14) {
        stage = 'feedback';
        progress = 40;
      } else {
        stage = 'delivery';
        progress = 90;
      }
    }

    // Generate due date (mock data - in real app this would come from API)
    const dueDate = new Date(createdDate);
    dueDate.setDate(dueDate.getDate() + 30); // 30 days from creation
    const dueDateStr = dueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });

    // Use first scene name or project name as client (mock data)
    const clientName = apiProject.scenes3D?.[0]?.name || apiProject.name;

    // Use real thumbnail URL from API, prefer custom over auto, fallback to placeholder
    const thumbnail = apiProject.customThumbnailUrl || 
                     apiProject.thumbnailUrl || 
                     `https://images.unsplash.com/photo-1586023492125-27b2c045efd7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MXwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBpbnRlcmlvciUyMGxpdmluZyUyMHJvb218ZW58MXx8fHwxNjA5NDU5MjAwMA&ixlib=rb-4.1.0&q=80&w=400&h=300`;

    return {
      // Keep original string id for stable keys; numeric id preserved for legacy uses
      originalId: apiProject.id,
      id: parseInt(apiProject.id, 10) || Math.floor(Math.random() * 1000), // Convert string ID to number
      name: apiProject.name,
      client: clientName,
      stage,
      progress,
      dueDate: dueDateStr,
      thumbnail,
    };
  });
};

/**
 * Calculate user statistics from projects data
 */
export const calculateUserStatsFromProjects = (
  projects: DashboardProject[],
  userProfile: UserProfile | null
): {
  totalProjects: number;
  completedProjects: number;
  activeClients: number;
  totalEarnings: string;
  rating: number;
  experience: number;
  level: number;
  nextLevelExp: number;
} => {
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.scenes3D && p.scenes3D.length > 0).length;
  const activeClients = new Set(projects.map(p => p.userId)).size;

  // Calculate experience based on projects and scenes
  const totalScenes = projects.reduce((sum, p) => sum + (p.scenes3D?.length || 0), 0);
  const experience = totalScenes * 100 + completedProjects * 200;

  // Calculate level based on experience
  const level = Math.floor(experience / 1000) + 1;
  const nextLevelExp = level * 1000;

  // Mock data for fields not available in current API
  const totalEarnings = `$${(completedProjects * 2500).toLocaleString()}`;
  const rating = userProfile ? 4.9 : 0; // Mock rating

  return {
    totalProjects,
    completedProjects,
    activeClients,
    totalEarnings,
    rating,
    experience,
    level,
    nextLevelExp,
  };
};

/**
 * Transform API user profile to dashboard format
 */
export const transformUserProfileForDashboard = (userProfile: UserProfile) => {
  return {
    id: userProfile.id,
    email: userProfile.email,
    displayName: userProfile.displayName || userProfile.email.split('@')[0],
    role: userProfile.role,
    isActive: userProfile.isActive,
    createdAt: userProfile.createdAt,
    updatedAt: userProfile.updatedAt,
  };
};

/**
 * Calculate pipeline stages from projects data
 */
export const calculatePipelineStagesFromProjects = (projects: DashboardProject[]): PipelineStage[] => {
  const stages = {
    concept: 0,
    design: 0,
    feedback: 0,
    delivery: 0,
  };

  projects.forEach(project => {
    const hasScenes = project.scenes3D && project.scenes3D.length > 0;
    const updatedDate = new Date(project.updatedAt);
    const daysSinceUpdate = Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (!hasScenes) {
      stages.concept++;
    } else if (daysSinceUpdate < 7) {
      stages.design++;
    } else if (daysSinceUpdate < 14) {
      stages.feedback++;
    } else {
      stages.delivery++;
    }
  });

  return [
    { key: 'concept', label: 'Concept', icon: Home, count: stages.concept },
    { key: 'design', label: 'Design', icon: Palette, count: stages.design },
    { key: 'feedback', label: 'Feedback', icon: Users, count: stages.feedback },
    { key: 'delivery', label: 'Delivery', icon: CheckCircle, count: stages.delivery },
  ];
};