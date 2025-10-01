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
    image: "/brand/BoseSpeaker_MO_20.0.karmarendersettings.0240.jpg",
  },
  { 
    name: "Scandinavian", 
    popularity: 76, 
    image: "/brand/LebaneseJetInteroir-3.jpg",
  },
  { 
    name: "Minimalist", 
    popularity: 92, 
    image: "/brand/handbag-topology.gif",
  },
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