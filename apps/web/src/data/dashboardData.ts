import {
  Home,
  Palette,
  Users,
  CheckCircle,
  Trophy,
  Zap,
  Heart,
  Star,
  MessageCircle,
  Plus,
  Upload,
  Settings,
} from "lucide-react";
import {
  Project,
  PipelineStage,
  Achievement,
  RecentActivity,
  QuickAction,
  UpcomingDeadline,
  UserStats,
} from "../types/dashboard";

export const PROJECTS: Project[] = [
  {
    id: 1,
    name: "Modern Living Room",
    client: "Sarah Johnson",
    stage: "design",
    progress: 65,
    dueDate: "Jan 15, 2025",
    thumbnail: "https://images.unsplash.com/photo-1720247520862-7e4b14176fa8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBpbnRlcmlvciUyMGxpdmluZyUyMHJvb218ZW58MXx8fHwxNzU1ODEyOTIyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: 2,
    name: "Scandinavian Bedroom",
    client: "Michael Chen",
    stage: "feedback",
    progress: 40,
    dueDate: "Jan 20, 2025",
    thumbnail: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2FuZGluYXZpYW4lMjBpbnRlcmlvciUyMGRlc2lnbnxlbnwxfHx8fDE3NTU4NzQ2MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: 3,
    name: "Minimalist Kitchen",
    client: "Emma Wilson",
    stage: "delivery",
    progress: 90,
    dueDate: "Jan 10, 2025",
    thumbnail: "https://images.unsplash.com/photo-1705321963943-de94bb3f0dd3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwaW50ZXJpb3IlMjBkZXNpZ258ZW58MXx8fHwxNzU1ODA1NzM0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
];

export const PIPELINE_STAGES: PipelineStage[] = [
  { key: "concept", label: "Concept", icon: Home, count: 4 },
  { key: "design", label: "Design", icon: Palette, count: 2 },
  { key: "feedback", label: "Feedback", icon: Users, count: 1 },
  { key: "delivery", label: "Delivery", icon: CheckCircle, count: 1 },
];

export const ACHIEVEMENTS: Achievement[] = [
  { name: "First Project", icon: Trophy, color: "yellow", unlocked: true },
  { name: "Speed Demon", icon: Zap, color: "blue", unlocked: true },
  { name: "Client Favorite", icon: Heart, color: "red", unlocked: true },
  { name: "Team Player", icon: Users, color: "green", unlocked: false },
];

export const RECENT_ACTIVITY: RecentActivity[] = [
  { type: "project", message: "Completed 'Modern Living Room'", time: "2 hours ago", icon: CheckCircle, color: "green" },
  { type: "feedback", message: "Received 5-star review from Sarah", time: "4 hours ago", icon: Star, color: "yellow" },
  { type: "message", message: "New message from Michael Chen", time: "6 hours ago", icon: MessageCircle, color: "blue" },
  { type: "project", message: "Started 'Minimalist Office'", time: "1 day ago", icon: Plus, color: "purple" },
  { type: "milestone", message: "Reached 25 completed projects", time: "2 days ago", icon: Trophy, color: "gold" },
];

export const QUICK_ACTIONS: QuickAction[] = [
  { name: "New Project", icon: Plus, action: "project", color: "yellow" },
  { name: "Upload Asset", icon: Upload, action: "upload", color: "blue" },
  { name: "Client Messages", icon: MessageCircle, action: "messages", color: "green" },
  { name: "Profile Settings", icon: Settings, action: "settings", color: "gray" },
];

export const UPCOMING_DEADLINES: UpcomingDeadline[] = [
  { project: "Modern Living Room", client: "Sarah Johnson", dueDate: "Jan 15", daysLeft: 3, priority: "high" },
  { project: "Scandinavian Bedroom", client: "Michael Chen", dueDate: "Jan 20", daysLeft: 8, priority: "medium" },
  { project: "Office Redesign", client: "Tech Corp", dueDate: "Jan 25", daysLeft: 13, priority: "low" },
];

export const USER_STATS: UserStats = {
  totalProjects: 28,
  completedProjects: 23,
  activeClients: 8,
  totalEarnings: "$47,500",
  rating: 4.9,
  experience: 8250,
  level: 12,
  nextLevelExp: 1750,
  achievements: ACHIEVEMENTS,
  recentActivity: RECENT_ACTIVITY,
  quickActions: QUICK_ACTIONS,
  upcomingDeadlines: UPCOMING_DEADLINES,
};