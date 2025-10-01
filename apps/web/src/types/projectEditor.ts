export interface AssetItem {
  id: number;
  name: string;
  category?: string;
  type?: string;
  xp?: number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  roughness?: number;
  metallic?: number;
  resolution?: string;
  seamless?: boolean;
}

export interface AssetCategory {
  id: string;
  name: string;
  icon: any;
  items: AssetItem[];
}

export interface Achievement {
  id: number;
  name: string;
  unlocked: boolean;
  icon: string;
}

export interface GamificationData {
  level: number;
  xp: number;
  nextLevelXp: number;
  achievements: Achievement[];
  streak: number;
}

export interface ViewportMovement {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export interface ProjectEditorProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onShowState?: (state: "loading" | "success" | "error" | "ai-processing") => void;
}

export interface LayerItem {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface MaterialProperty {
  id: string;
  name: string;
  color: string;
  roughness: number;
  metallic: number;
  emission: number;
}

export interface TransformData {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export interface LightingSettings {
  intensity: number;
  shadow: number;
  castShadows: boolean;
}