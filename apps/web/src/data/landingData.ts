import { 
  Home, 
  Palette, 
  Compass, 
  Layers, 
  Users,
  Target,
  Sparkles,
  Crown,
  Gem
} from "lucide-react";
import { MenuItem, Achievement, DesignStyle, CommunityStats } from '../types/landing';

export const MENU_ITEMS: MenuItem[] = [
  { 
    id: "home", 
    label: "Home Base", 
    icon: Home, 
    level: 1, 
    unlocked: true, 
    description: "Your command center",
    action: "landing"
  },
  { 
    id: "design", 
    label: "Design Studio", 
    icon: Palette, 
    level: 3, 
    unlocked: true, 
    description: "Create & customize",
    action: "project"
  },
  { 
    id: "explore", 
    label: "Style Explorer", 
    icon: Compass, 
    level: 2, 
    unlocked: true, 
    description: "Discover new aesthetics",
    action: null
  },
  { 
    id: "gallery", 
    label: "Inspiration Gallery", 
    icon: Layers, 
    level: 5, 
    unlocked: false, 
    description: "Browse masterpieces",
    action: "guest"
  },
  { 
    id: "community", 
    label: "Designer's Guild", 
    icon: Users, 
    level: 7, 
    unlocked: false, 
    description: "Connect with creators",
    action: null
  }
];

export const ACHIEVEMENTS: Achievement[] = [
  { name: "First Steps", icon: Target, completed: true, rarity: "common" },
  { name: "Style Seeker", icon: Sparkles, completed: true, rarity: "uncommon" },
  { name: "Design Master", icon: Crown, completed: false, rarity: "legendary" },
  { name: "Trendsetter", icon: Gem, completed: false, rarity: "rare" }
];

export const DESIGN_STYLES: DesignStyle[] = [
  { 
    name: "Modern", 
    popularity: 89, 
    image: "https://images.unsplash.com/photo-1720247520862-7e4b14176fa8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBpbnRlcmlvciUyMGxpdmluZyUyMHJvb218ZW58MXx8fHwxNzU1ODEyOTIyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
  },
  { 
    name: "Scandinavian", 
    popularity: 76, 
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2FuZGluYXZpYW4lMjBpbnRlcmlvciUyMGRlc2lnbnxlbnwxfHx8fDE3NTU4NzQ2MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
  },
  { 
    name: "Minimalist", 
    popularity: 92, 
    image: "https://images.unsplash.com/photo-1705321963943-de94bb3f0dd3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwaW50ZXJpb3IlMjBkZXNpZ258ZW58MXx8fHwxNzU1ODA1NzM0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
  }
];

export const COMMUNITY_STATS: CommunityStats = {
  activeDesigners: 12847,
  projectsCreated: "2.1M+",
  stylesAvailable: 47
};

export const FEATURE_PILLS: string[] = [
  "3D Immersion", 
  "AI-Powered", 
  "Real-time Collaboration"
];