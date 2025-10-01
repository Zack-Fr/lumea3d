import { LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  level: number;
  unlocked: boolean;
  description: string;
  action: string | null;
}

export interface Achievement {
  name: string;
  icon: LucideIcon;
  completed: boolean;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface DesignStyle {
  name: string;
  popularity: number;
  image: string;
}

export interface CommunityStats {
  activeDesigners: number;
  projectsCreated: string;
  stylesAvailable: number;
}