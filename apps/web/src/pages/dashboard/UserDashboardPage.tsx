import React, { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  Home,
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

// Data and types
import { PROJECTS, PIPELINE_STAGES, USER_STATS } from "../../data/dashboardData";

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

  // Navigation handlers
  const handleNavigate = useCallback((page: any) => {
    switch (page) {
      case "landing":
        navigate(PATHS.landing);
        break;
      case "project":
        navigate(ROUTES.projectNew('new'));
        break;
      default:
        console.log("Unknown navigation target:", page);
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
    handleNavigate("project");
  }, [onProjectClick, handleNavigate]);

  const handleQuickActionClick = useCallback((action: string) => {
    handleQuickAction(action, undefined);
  }, [handleQuickAction]);

  return (
    <div
      className={styles.dashboard}
      role="main"
    >
      {/* Background Effects */}
      <BackgroundEffects />

      {/* Left Sidebar - User Profile & Stats */}
      <LeftSidebar 
        userStats={USER_STATS}
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
          projects={PROJECTS}
          pipelineStages={PIPELINE_STAGES}
          onProjectClick={handleProjectCardClick}
          onNavigate={handleNavigate}
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
  userStats: typeof USER_STATS;
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
  userStats: typeof USER_STATS;
}

const UserProfileCard = memo(({ userStats }: UserProfileCardProps) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className={styles.userProfileCard}
  >
    <div className={styles.userProfileHeader}>
      <div className={styles.userAvatar}>
        <Avatar className="w-12 h-12 ring-2 ring-[var(--glass-yellow)]">
          <AvatarImage src="/placeholder-avatar.jpg" />
          <AvatarFallback className="bg-[var(--glass-yellow)] text-[var(--glass-black)]">
            JD
          </AvatarFallback>
        </Avatar>
        <div className={styles.userOnlineIndicator}>
          <div className={styles.userOnlineDot}></div>
        </div>
      </div>
      <div className={styles.userInfo}>
        <h3 className={styles.userName}>John Doe</h3>
        <p className={styles.userRole}>Interior Designer</p>
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
));

interface AchievementsSectionProps {
  achievements: typeof USER_STATS.achievements;
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
  quickActions: typeof USER_STATS.quickActions;
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

const TopNavigation = memo(({ onNavigate, onLogout }: TopNavigationProps) => (
  <header className="relative z-50 px-6 py-4 border-b border-[var(--glass-border-dim)]">
    <div className="glass-strong rounded-2xl px-6 py-4 flex items-center justify-between">
      <button
        className="flex items-center space-x-3 cursor-pointer group"
        onClick={() => onNavigate("landing")}
        aria-label="Navigate to landing page"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-[var(--glass-yellow)] to-[var(--glass-yellow-dark)] rounded-xl flex items-center justify-center glow-yellow group-hover:glow-yellow-strong transition-all duration-300">
          <Home className="w-5 h-5 text-[var(--glass-black)]" />
        </div>
        <span className="text-2xl font-bold text-white group-hover:text-[var(--glass-yellow)] transition-colors">Lumea</span>
      </button>

      <div className="flex items-center space-x-4">
        <Avatar className="cursor-pointer ring-2 ring-[var(--glass-border-light)]">
          <AvatarImage src="/placeholder-avatar.jpg" />
          <AvatarFallback className="bg-[var(--glass-yellow)] text-[var(--glass-black)]">JD</AvatarFallback>
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
));

interface MainContentProps {
  projects: typeof PROJECTS;
  pipelineStages: typeof PIPELINE_STAGES;
  onProjectClick: (project: any) => void;
  onNavigate: (page: any) => void;
}

const MainContent = memo(({ projects, pipelineStages, onProjectClick, onNavigate }: MainContentProps) => (
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
      />

      {/* Stats Section */}
      <StatsSection />
    </section>
  </main>
));

const WelcomeSection = memo(() => (
  <div className="mb-8">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-6 glow-yellow"
    >
      <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
        Welcome back, John! 👋
      </h1>
      <p className="text-[var(--glass-gray)] text-lg">
        Here's what's happening with your projects today.
      </p>
    </motion.div>
  </div>
));

interface PipelineSectionProps {
  pipelineStages: typeof PIPELINE_STAGES;
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
  projects: typeof PROJECTS;
  onProjectClick: (project: any) => void;
  onNavigate: (page: string) => void;
}

const ProjectsSection = memo(({ projects, onProjectClick, onNavigate }: ProjectsSectionProps) => (
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
          key={project.id}
          project={project}
          onClick={onProjectClick}
        />
      ))}
    </div>
  </div>
));

const StatsSection = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <StatsCard 
      icon={Users}
      label="Active Clients"
      value="8"
      trend="+2 this month"
      iconColor="blue"
    />
    <StatsCard 
      icon={CheckCircle}
      label="Completed Projects"
      value="23"
      trend="+4 this month"
      iconColor="green"
    />
    <StatsCard 
      icon={ArrowRight}
      label="Total Earnings"
      value="$47,500"
      trend="+$12.5k this month"
      iconColor="orange"
    />
  </div>
));

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
  recentActivity: typeof USER_STATS.recentActivity;
  upcomingDeadlines: typeof USER_STATS.upcomingDeadlines;
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
  recentActivity: typeof USER_STATS.recentActivity;
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
  upcomingDeadlines: typeof USER_STATS.upcomingDeadlines;
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