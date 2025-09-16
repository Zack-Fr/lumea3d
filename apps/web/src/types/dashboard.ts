export type NavigationPage = "landing" | "admin" | "project";
export type ProjectStage = "concept" | "design" | "feedback" | "delivery";
export type PriorityLevel = "high" | "medium" | "low";
export type ActivityColor = "green" | "yellow" | "blue" | "purple" | "gold";
export type AchievementColor = "yellow" | "blue" | "red" | "green";
export type QuickActionColor = "yellow" | "blue" | "green" | "gray";

export interface DashboardProps {
  onNavigate: (page: NavigationPage) => void;
  onLogout: () => void;
  isAuthenticated: boolean;
  onShowState?: (state: "loading" | "success" | "error" | "ai-processing") => void;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export interface Project {
  id: number;
  originalId?: string; // Original API project ID (UUID string)
  name: string;
  client: string;
  stage: ProjectStage;
  progress: number;
  dueDate: string;
  thumbnail: string;
}

export interface PipelineStage {
  key: ProjectStage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
}

export interface Achievement {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: AchievementColor;
  unlocked: boolean;
}

export interface RecentActivity {
  type: string;
  message: string;
  time: string;
  icon: React.ComponentType<{ className?: string }>;
  color: ActivityColor;
}

export interface QuickAction {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  action: string;
  color: QuickActionColor;
}

export interface UpcomingDeadline {
  project: string;
  client: string;
  dueDate: string;
  daysLeft: number;
  priority: PriorityLevel;
}

export interface UserStats {
  totalProjects: number;
  completedProjects: number;
  activeClients: number;
  totalEarnings: string;
  rating: number;
  experience: number;
  level: number;
  nextLevelExp: number;
  achievements: Achievement[];
  recentActivity: RecentActivity[];
  quickActions: QuickAction[];
  upcomingDeadlines: UpcomingDeadline[];
}