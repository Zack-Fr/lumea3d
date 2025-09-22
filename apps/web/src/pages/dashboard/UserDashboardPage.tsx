import React, { memo, useCallback, useEffect, useState } from "react";
import { once as logOnce } from '../../utils/logger';
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { 
  // Settings, 
  LogOut, 
  ArrowRight, 
  Sparkles, 
  Plus, 
  Activity,
  Clock,
  TrendingUp,
  Star,
  Trophy,
  Zap,
  Users,
  CheckCircle
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/Avatar";
import { Progress } from "../../components/ui/Progress";
import { Separator } from "../../components/ui/Separator";
import { ScrollArea } from "../../components/ui/ScrollArea";
import { PATHS, ROUTES } from "@/app/paths";
import { useAuth } from "../../providers/AuthProvider";

// Custom hooks
import { useProjects } from "../../hooks/useProjects";
// import { useActivity, useDeadlines } from "../../hooks/useActivityAndDeadlines";
import { useAchievements, useQuickActions } from "../../hooks/useAchievementsAndActions";

// API hooks and utilities
import { useDashboardData } from "../../hooks/useDashboardApi";
import { useUserProfile } from "../../hooks/useDashboardApi";
import {
  transformProjectsForDashboard,
  calculateUserStatsFromProjects,
  calculatePipelineStagesFromProjects
} from "../../utils/dashboardTransformers";

// Data and types
import { QUICK_ACTIONS } from "../../data/dashboardData";

// Atomic components
import ProjectCard from "../../components/dashboard/ProjectCard";
import AchievementItem from "../../components/dashboard/AchievementItem";
import ActivityItem from "../../components/dashboard/ActivityItem";
import DeadlineItem from "../../components/dashboard/DeadlineItem";
import QuickActionButton from "../../components/dashboard/QuickActionButton";
import PipelineStageCard from "../../components/dashboard/PipelineStageCard";

import styles from "./UserDashboard.module.css";

const UserDashboardPage = memo(() => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Fetch dashboard data from API
  const { userProfile, projects: apiProjects, isLoading, error, isAuthenticationError, refetch } = useDashboardData();

  // State for thumbnail updates (to override project thumbnails locally)
  const [thumbnailUpdates, setThumbnailUpdates] = useState<Record<string, string>>({});

  // Transform API data to dashboard format and apply thumbnail updates
  const baseTransformedProjects = transformProjectsForDashboard(apiProjects);
  const transformedProjects = baseTransformedProjects.map(project => {
    const projectId = project.originalId || project.id.toString();
    const updatedThumbnail = thumbnailUpdates[projectId];
    return updatedThumbnail ? { ...project, thumbnail: updatedThumbnail } : project;
  });
  
  const calculatedUserStats = calculateUserStatsFromProjects(apiProjects, userProfile);
  const pipelineStages = calculatePipelineStagesFromProjects(apiProjects);

  // Handle authentication errors - automatically logout and redirect
  useEffect(() => {
    if (isAuthenticationError) {
      logOnce('userdash:auth-failed', 'warn', 'Authentication failed, logging out and redirecting to login...');
      logout();
      navigate(PATHS.landing);
    }
  }, [isAuthenticationError, logout, navigate]);

  // Combine API stats with calculated stats
  const userStats = {
    ...calculatedUserStats,
    achievements: [], // Keep static for now
    recentActivity: [], // Keep static for now
    quickActions: QUICK_ACTIONS, // Restore quick actions
    upcomingDeadlines: [], // Keep static for now
  };

  // Navigation handlers
  const handleNavigate = useCallback((page: any, projectId?: string | number) => {
    switch (page) {
      case "landing":
        navigate(PATHS.landing);
        break;
      case "project":
        if (projectId) {
          // Navigate to existing project
          navigate(ROUTES.project(String(projectId)));
        } else {
          // Create new project
          navigate(ROUTES.projectNew('new'));
        }
        break;
      default:
        logOnce('userdash:unknown-nav', 'warn', 'Unknown navigation target:', page);
    }
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate(PATHS.landing);
  }, [logout, navigate]);

  // Custom hooks for clean state management
  const { onProjectClick } = useProjects();
  // const { viewAllActivity, toggleViewAll } = useActivity();
  // const { onDeadlineClick } = useDeadlines();
  const { onAchievementClick } = useAchievements();
  const { handleQuickAction } = useQuickActions();

  const handleProjectCardClick = useCallback((project: any) => {
    onProjectClick(project);
    handleNavigate("project", project.originalId || project.id);
  }, [onProjectClick, handleNavigate]);

  const handleQuickActionClick = useCallback((action: string) => {
    handleQuickAction(action, undefined);
  }, [handleQuickAction]);

  // Handle thumbnail update
  const handleThumbnailUpdate = useCallback((project: any, thumbnailUrl: string) => {
    console.log(`📷 Thumbnail updated for project ${project.name}:`, thumbnailUrl);
    
    // Update local state to immediately show the new thumbnail
    const projectId = project.originalId || project.id.toString();
    setThumbnailUpdates(prev => ({
      ...prev,
      [projectId]: thumbnailUrl
    }));
    
    // Show success message
    toast.success('Thumbnail updated successfully!');
  }, []);

  // Handle project deletion
  const handleProjectDelete = useCallback(async (project: any) => {
    try {
      const projectId = project.originalId || project.id.toString();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access_token') || ''}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete failed with status:', response.status, errorText);
        throw new Error(`Failed to delete project: ${response.status} ${errorText}`);
      }

      console.log(`🗑️ Project deleted: ${project.name}`);
      
      // Refresh the data without full page reload
      await refetch();
      toast.success('Project deleted successfully!');
    } catch (error) {
      console.error('❌ Project deletion failed:', error);
      toast.error('Failed to delete project. Please try again.');
    }
  }, [refetch]);

  // Show loading state
  if (isLoading) {
    return (
      <div className={styles.dashboard} role="main">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-lg">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !isAuthenticationError) {
    return (
      <div className={styles.dashboard} role="main">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-red-400 text-lg">
            Error loading dashboard: {error}
            <button
              onClick={() => window.location.reload()}
              className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.dashboard}
      role="main"
    >
      {/* Background Effects */}
      <BackgroundEffects />

      {/* Left Sidebar - User Profile & Stats */}
      <LeftSidebar 
        userStats={userStats}
        onAchievementClick={onAchievementClick}
        onQuickActionClick={handleQuickActionClick}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <TopNavigation 
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />

        <MainContent 
          projects={transformedProjects}
          pipelineStages={pipelineStages}
          onProjectClick={handleProjectCardClick}
          onNavigate={handleNavigate}
          onThumbnailUpdate={handleThumbnailUpdate}
          onProjectDelete={handleProjectDelete}
        />

        {/* Right Sidebar - Activity & Deadlines */}
        {/* <RightSidebar 
          recentActivity={USER_STATS.recentActivity}
          upcomingDeadlines={USER_STATS.upcomingDeadlines}
          viewAllActivity={viewAllActivity}
          onToggleViewAll={toggleViewAll}
          onDeadlineClick={onDeadlineClick}
        /> */}
      </div>
    </div>
  );
});

// Memoized sub-components for performance
const BackgroundEffects = memo(() => (
  <div className={styles.backgroundEffects}>
    <div></div>
    <div></div>
    <div></div>
  </div>
));

interface LeftSidebarProps {
  userStats: {
    totalProjects: number;
    completedProjects: number;
    activeClients: number;
    totalEarnings: string;
    rating: number;
    experience: number;
    level: number;
    nextLevelExp: number;
    achievements: any[];
    recentActivity: any[];
    quickActions: any[];
    upcomingDeadlines: any[];
  };
  onAchievementClick: (achievement: any) => void;
  onQuickActionClick: (action: string) => void;
}

const LeftSidebar = memo(({ userStats, onAchievementClick, onQuickActionClick }: LeftSidebarProps) => (
  <aside
    className={styles.sidebar}
    aria-label="User profile and statistics sidebar"
    role="complementary"
  >
    <ScrollArea className={styles.sidebarScroll}>
      <div className="space-y-6">
        {/* User Profile Card */}
        <UserProfileCard userStats={userStats} />

        {/* Achievements */}
        <AchievementsSection 
          achievements={userStats.achievements}
          onAchievementClick={onAchievementClick}
        />

        {/* Quick Actions */}
        <QuickActionsSection 
          quickActions={userStats.quickActions}
          onQuickActionClick={onQuickActionClick}
        />
      </div>
    </ScrollArea>
  </aside>
));

interface UserProfileCardProps {
  userStats: {
    totalProjects: number;
    completedProjects: number;
    activeClients: number;
    totalEarnings: string;
    rating: number;
    experience: number;
    level: number;
    nextLevelExp: number;
    achievements: any[];
    recentActivity: any[];
    quickActions: any[];
    upcomingDeadlines: any[];
  };
}

const UserProfileCard = memo(({ userStats }: UserProfileCardProps) => {
  // Get user profile from API
  const { userProfile, isAuthenticationError } = useUserProfile();
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Handle authentication errors in this component
  useEffect(() => {
    if (isAuthenticationError) {
      logOnce('userdash:userprofile-auth-failed', 'warn', 'Authentication failed in UserProfileCard, logging out...');
      logout();
      navigate(PATHS.landing);
    }
  }, [isAuthenticationError, logout, navigate]);

  const displayName = userProfile?.displayName || userProfile?.email?.split('@')[0] || 'User';
  const userRole = userProfile?.role === 'DESIGNER' ? 'Interior Designer' :
                   userProfile?.role === 'CLIENT' ? 'Client' :
                   userProfile?.role === 'ADMIN' ? 'Administrator' : 'User';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={styles.userProfileCard}
    >
      <div className={styles.userProfileHeader}>
        <div className={styles.userAvatar}>
          <Avatar className="w-12 h-12 ring-2 ring-[var(--glass-yellow)]">
            <AvatarImage src="https://avatar.iran.liara.run/public/27" />
            <AvatarFallback>
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className={styles.userOnlineIndicator}>
            <div className={styles.userOnlineDot}></div>
          </div>
        </div>
        <div className={styles.userInfo}>
          <h3 className={styles.userName}>{displayName}</h3>
          <p className={styles.userRole}>{userRole}</p>
          <div className={styles.userRating}>
            <div className={styles.userRatingStars}>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={styles.userRatingStar}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className={styles.userRatingValue}>{userStats.rating}</span>
            <span className={styles.userRatingCount}>(127 reviews)</span>
          </div>
        </div>
      </div>

      <div className={styles.userStats}>
        <div className={styles.userLevel}>
          <span className={styles.userLevelLabel}>Level {userStats.level}</span>
          <span className={styles.userLevelValue}>{userStats.experience} XP</span>
        </div>
        <Progress
          value={(userStats.experience % 1000) / 10}
          className={styles.userProgressBar}
          aria-label={`Experience progress: ${userStats.experience} XP`}
        />
        <p className={styles.userProgressText}>
          {userStats.nextLevelExp} XP to next level
        </p>
      </div>

      <Separator className="my-4 bg-[var(--glass-border-dim)]" />

      <div className={styles.userStatsGrid}>
        <div className={styles.userStatItem}>
          <span className={styles.userStatValue}>{userStats.totalProjects}</span>
          <span className={styles.userStatLabel}>Total Projects</span>
        </div>
        <div className={styles.userStatItem}>
          <span className={styles.userStatValue}>{userStats.totalEarnings}</span>
          <span className={styles.userStatLabel}>Total Earnings</span>
        </div>
      </div>
    </motion.div>
  );
});

interface AchievementsSectionProps {
  achievements: any[];
  onAchievementClick: (achievement: any) => void;
}

const AchievementsSection = memo(({ achievements, onAchievementClick }: AchievementsSectionProps) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.1 }}
    className={styles.achievementsCard}
  >
    <div className={styles.achievementsHeader}>
      <Trophy className="w-5 h-5 text-[var(--glass-yellow)]" aria-hidden="true" />
      <h4 className={styles.achievementsTitle}>Achievements</h4>
    </div>
    <div className={styles.achievementsGrid}>
      {achievements.map((achievement, index) => (
        <AchievementItem
          key={index}
          achievement={achievement}
          onClick={onAchievementClick}
        />
      ))}
    </div>
  </motion.div>
));

interface QuickActionsSectionProps {
  quickActions: any[];
  onQuickActionClick: (action: string) => void;
}

const QuickActionsSection = memo(({ quickActions, onQuickActionClick }: QuickActionsSectionProps) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.2 }}
    className={styles.quickActionsCard}
  >
    <div className={styles.quickActionsHeader}>
      <Zap className="w-5 h-5 text-[var(--glass-yellow)]" aria-hidden="true" />
      <h4 className={styles.quickActionsTitle}>Quick Actions</h4>
    </div>
    <div className={styles.quickActionsList}>
      {quickActions.map((action, index) => (
        <QuickActionButton
          key={index}
          action={action}
          onClick={onQuickActionClick}
        />
      ))}
    </div>
  </motion.div>
));

interface TopNavigationProps {
  onNavigate: (page: any) => void;
  onLogout: () => void;
}

const TopNavigation = memo(({ onNavigate, onLogout }: TopNavigationProps) => {
  // const { userProfile } = useUserProfile();
  // const displayName = userProfile?.displayName || userProfile?.email?.split('@')[0] || 'User';

  return (
    <header className="relative z-50 px-6 py-4 border-b border-[var(--glass-border-dim)]">
      <div className="glass-strong rounded-2xl px-6 py-4 flex items-center justify-between">
        <button
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => onNavigate("landing")}
          aria-label="Navigate to landing page"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-[var(--glass-yellow)] to-[var(--glass-yellow-dark)] rounded-xl flex items-center justify-center glow-yellow group-hover:glow-yellow-strong transition-all duration-300">
            <div className={styles.logoIcon} />
          </div>
          <span className="text-2x1 font-bold text-white group-hover:text-[var(--glass-yellow)] transition-colors">Lumea 3D</span>
        </button>

        <div className="flex items-center space-x-4">
          <Avatar className="cursor-pointer ring-2 ring-[var(--glass-border-light)]">
            <AvatarImage src="https://avatar.iran.liara.run/public/27" />
            {/* <AvatarFallback className="bg-[var(--glass-yellow)] text-[var(--glass-black)]">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback> */}
          </Avatar>
          <Button
            variant="ghost"
            onClick={onLogout}
            className="text-[var(--glass-gray)] hover:text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
});

interface MainContentProps {
  projects: any[];
  pipelineStages: any[];
  onProjectClick: (project: any) => void;
  onNavigate: (page: any) => void;
  onThumbnailUpdate: (project: any, thumbnailUrl: string) => void;
  onProjectDelete: (project: any) => void;
}

const MainContent = memo(({ projects, pipelineStages, onProjectClick, onNavigate, onThumbnailUpdate, onProjectDelete }: MainContentProps) => (
  <main className="flex-1 flex">
    <section className="flex-1 p-6 relative z-10" aria-label="Main dashboard content">
      {/* Welcome Section */}
      <WelcomeSection />

      {/* Pipeline Section */}
      <PipelineSection pipelineStages={pipelineStages} />

      {/* Projects Section */}
      <ProjectsSection 
        projects={projects}
        onProjectClick={onProjectClick}
        onNavigate={onNavigate}
        onThumbnailUpdate={onThumbnailUpdate}
        onProjectDelete={onProjectDelete}
      />

      {/* Stats Section */}
      <StatsSection />
    </section>
  </main>
));

const WelcomeSection = memo(() => {
  const { userProfile } = useUserProfile();
  const displayName = userProfile?.displayName || userProfile?.email?.split('@')[0] || 'User';

  return (
    <div className="mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-6 glow-yellow"
      >
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          Welcome back, {displayName}! 👋
        </h1>
        <p className="text-[var(--glass-gray)] text-lg">
          Here's what's happening with your projects today.
        </p>
      </motion.div>
    </div>
  );
});

interface PipelineSectionProps {
  pipelineStages: any[];
}

const PipelineSection = memo(({ pipelineStages }: PipelineSectionProps) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className="mb-8"
  >
    <Card className="glass-strong glow-yellow border-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <ArrowRight className="w-5 h-5 text-[var(--glass-yellow)]" />
          Project Lifecycle
        </CardTitle>
        <CardDescription className="text-[var(--glass-gray)]">
          Track your projects through each stage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={styles.pipelineGrid}>
          {pipelineStages.map((stage, index) => (
            <PipelineStageCard
              key={stage.key}
              stage={stage}
              index={index}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  </motion.div>
));

interface ProjectsSectionProps {
  projects: any[];
  onProjectClick: (project: any) => void;
  onNavigate: (page: string) => void;
  onThumbnailUpdate: (project: any, thumbnailUrl: string) => void;
  onProjectDelete: (project: any) => void;
}

const ProjectsSection = memo(({ projects, onProjectClick, onNavigate, onThumbnailUpdate, onProjectDelete }: ProjectsSectionProps) => (
  <div>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Sparkles className="text-[var(--glass-yellow)]" />
        Your Projects
      </h2>
      <Button 
        className="bg-[var(--glass-yellow)] text-[var(--glass-black)] hover:bg-[var(--glass-yellow-dark)] glow-yellow"
        onClick={() => onNavigate("project")}
      >
        <Plus className="w-4 h-4 mr-2" />
        New Project
      </Button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {projects.map((project) => (
        <ProjectCard
          key={project.originalId ?? project.id}
          project={project}
          onClick={onProjectClick}
          onThumbnailUpdate={onThumbnailUpdate}
          onProjectDelete={onProjectDelete}
        />
      ))}
    </div>
  </div>
));

const StatsSection = memo(() => {
  const { userStats } = useDashboardData();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatsCard
        icon={Users}
        label="Active Clients"
        value={userStats?.activeClients?.toString() || "0"}
        trend="+2 this month"
        iconColor="blue"
      />
      <StatsCard
        icon={CheckCircle}
        label="Completed Projects"
        value={userStats?.completedProjects?.toString() || "0"}
        trend="+4 this month"
        iconColor="green"
      />
      <StatsCard
        icon={ArrowRight}
        label="Total Earnings"
        value={userStats?.totalEarnings || "$0"}
        trend="+$12.5k this month"
        iconColor="orange"
      />
    </div>
  );
});

interface StatsCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend: string;
  iconColor: 'blue' | 'green' | 'orange';
}

const StatsCard = memo(({ icon: Icon, label, value, trend, iconColor }: StatsCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className={styles.statCard}
  >
    <div className={styles.statContent}>
      <div className={styles.statInfo}>
        <p className={styles.statLabel}>{label}</p>
        <h3 className={styles.statValue}>{value}</h3>
        <p className={styles.statTrend}>
          <TrendingUp className="w-3 h-3" />
          {trend}
        </p>
      </div>
      <div className={`${styles.statIcon} ${styles[iconColor]}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </motion.div>
));

interface RightSidebarProps {
  recentActivity: any[];
  upcomingDeadlines: any[];
  viewAllActivity: boolean;
  onToggleViewAll: () => void;
  onDeadlineClick: (deadline: any) => void;
}

const RightSidebar = memo(({ 
  recentActivity, 
  upcomingDeadlines, 
  viewAllActivity, 
  onToggleViewAll, 
  onDeadlineClick 
}: RightSidebarProps) => (
  <aside
    className={styles.rightSidebar}
    aria-label="Activity and deadlines sidebar"
    role="complementary"
  >
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        {/* Recent Activity */}
        <ActivitySection 
          recentActivity={recentActivity}
          viewAllActivity={viewAllActivity}
          onToggleViewAll={onToggleViewAll}
        />

        {/* Upcoming Deadlines */}
        <DeadlinesSection 
          upcomingDeadlines={upcomingDeadlines}
          onDeadlineClick={onDeadlineClick}
        />

        {/* Performance Summary */}
        <PerformanceSection />
      </div>
    </ScrollArea>
  </aside>
));

interface ActivitySectionProps {
  recentActivity: any[];
  viewAllActivity: boolean;
  onToggleViewAll: () => void;
}

const ActivitySection = memo(({ recentActivity, viewAllActivity, onToggleViewAll }: ActivitySectionProps) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className={styles.activityCard}
  >
    <div className={styles.activityHeader}>
      <Activity className="w-5 h-5 text-[var(--glass-yellow)]" aria-hidden="true" />
      <h4 className={styles.activityTitle}>Recent Activity</h4>
    </div>
    <div className={styles.activityList}>
      {recentActivity.slice(0, viewAllActivity ? recentActivity.length : 3).map((activity, index) => (
        <ActivityItem
          key={index}
          activity={activity}
        />
      ))}
    </div>
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggleViewAll}
      className={styles.viewAllButton}
    >
      {viewAllActivity ? 'Show Less' : 'View All'}
    </Button>
  </motion.div>
));

interface DeadlinesSectionProps {
  upcomingDeadlines: any[];
  onDeadlineClick: (deadline: any) => void;
}

const DeadlinesSection = memo(({ upcomingDeadlines, onDeadlineClick }: DeadlinesSectionProps) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.1 }}
    className={styles.deadlinesCard}
  >
    <div className={styles.deadlinesHeader}>
      <Clock className="w-5 h-5 text-[var(--glass-yellow)]" aria-hidden="true" />
      <h4 className={styles.deadlinesTitle}>Upcoming Deadlines</h4>
    </div>
    <div className={styles.deadlinesList}>
      {upcomingDeadlines.map((deadline, index) => (
        <DeadlineItem
          key={index}
          deadline={deadline}
          onClick={onDeadlineClick}
        />
      ))}
    </div>
  </motion.div>
));

const PerformanceSection = memo(() => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.2 }}
    className={styles.performanceCard}
  >
    <div className={styles.performanceHeader}>
      <TrendingUp className="w-5 h-5 text-[var(--glass-yellow)]" aria-hidden="true" />
      <h4 className={styles.performanceTitle}>This Month</h4>
    </div>
    <div className={styles.performanceStats}>
      <div className={styles.performanceStat}>
        <span className={styles.performanceLabel}>Projects Completed</span>
        <span className={styles.performanceValue}>4</span>
      </div>
      <div className={styles.performanceStat}>
        <span className={styles.performanceLabel}>Revenue Generated</span>
        <span className={`${styles.performanceValue} ${styles.highlight}`}>$12,500</span>
      </div>
      <div className={styles.performanceStat}>
        <span className={styles.performanceLabel}>Client Satisfaction</span>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-[var(--glass-yellow)] fill-current" aria-hidden="true" />
          <span className={styles.performanceValue}>4.8</span>
        </div>
      </div>
    </div>
    <Separator className={styles.performanceSeparator} />
    <div className={styles.performanceScore}>
      <p className={styles.performanceScoreLabel}>Performance Score</p>
      <div className={styles.performanceScoreContainer}>
        <div className={styles.performanceScoreBadge}>
          <span className={styles.performanceScoreText}>A+</span>
        </div>
        <div className={styles.performanceScoreInfo}>
          <p className={styles.performanceScoreGrade}>Excellent</p>
          <p className={styles.performanceScoreDesc}>Top 5% of designers</p>
        </div>
      </div>
    </div>
  </motion.div>
));

// Set display names for debugging
BackgroundEffects.displayName = 'BackgroundEffects';
LeftSidebar.displayName = 'LeftSidebar';
UserProfileCard.displayName = 'UserProfileCard';
AchievementsSection.displayName = 'AchievementsSection';
QuickActionsSection.displayName = 'QuickActionsSection';
TopNavigation.displayName = 'TopNavigation';
MainContent.displayName = 'MainContent';
WelcomeSection.displayName = 'WelcomeSection';
PipelineSection.displayName = 'PipelineSection';
ProjectsSection.displayName = 'ProjectsSection';
StatsSection.displayName = 'StatsSection';
StatsCard.displayName = 'StatsCard';
RightSidebar.displayName = 'RightSidebar';
ActivitySection.displayName = 'ActivitySection';
DeadlinesSection.displayName = 'DeadlinesSection';
PerformanceSection.displayName = 'PerformanceSection';
UserDashboardPage.displayName = 'UserDashboardPage';

export default UserDashboardPage;