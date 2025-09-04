import { 
  Box, 
  Palette, 
  Image 
} from "lucide-react";
import { AssetCategory, GamificationData, LayerItem, MaterialProperty } from '../types/projectEditor';

export const assetCategories: AssetCategory[] = [
  { 
    id: "models", 
    name: "3D Models", 
    icon: Box, 
    items: [
      { id: 1, name: "Chair Modern", category: "Seating", xp: 10, rarity: "common" as const },
      { id: 2, name: "Tree Oak", category: "Nature", xp: 15, rarity: "common" as const },
      { id: 3, name: "House Villa", category: "Building", xp: 50, rarity: "epic" as const },
      { id: 4, name: "Sports Car", category: "Vehicle", xp: 35, rarity: "rare" as const },
    ]
  },
  { 
    id: "materials", 
    name: "Materials", 
    icon: Palette, 
    items: [
      { id: 1, name: "Metal Red", type: "Metal", roughness: 0.2, metallic: 1.0 },
      { id: 2, name: "Glass Clear", type: "Glass", roughness: 0.0, metallic: 0.0 },
      { id: 3, name: "Wood Oak", type: "Wood", roughness: 0.8, metallic: 0.0 },
      { id: 4, name: "Concrete", type: "Stone", roughness: 0.9, metallic: 0.0 },
    ]
  },
  { 
    id: "textures", 
    name: "Textures", 
    icon: Image, 
    items: [
      { id: 1, name: "Brick Wall", resolution: "2K", seamless: true },
      { id: 2, name: "Marble White", resolution: "4K", seamless: true },
      { id: 3, name: "Grass Field", resolution: "2K", seamless: false },
      { id: 4, name: "Metal Plate", resolution: "4K", seamless: true },
    ]
  }
];

export const gamificationData: GamificationData = {
  level: 12,
  xp: 2340,
  nextLevelXp: 2500,
  achievements: [
    { id: 1, name: "First Scene", unlocked: true, icon: "🎯" },
    { id: 2, name: "Material Master", unlocked: true, icon: "🎨" },
    { id: 3, name: "Speed Builder", unlocked: false, icon: "⚡" },
  ],
  streak: 7
};

export const defaultLayers: LayerItem[] = [
  { id: 'background', name: 'Background', visible: true, locked: false },
  { id: 'objects', name: 'Objects', visible: true, locked: false },
  { id: 'lighting', name: 'Lighting', visible: true, locked: false },
  { id: 'effects', name: 'Effects', visible: true, locked: false }
];

export const defaultMaterialProperties: MaterialProperty[] = [
  { id: 'red', name: 'Metal Red', color: '#ef4444', roughness: 0.2, metallic: 1.0, emission: 0.0 },
  { id: 'blue', name: 'Metal Blue', color: '#3b82f6', roughness: 0.2, metallic: 1.0, emission: 0.0 },
  { id: 'green', name: 'Metal Green', color: '#22c55e', roughness: 0.2, metallic: 1.0, emission: 0.0 },
  { id: 'yellow', name: 'Metal Yellow', color: '#eab308', roughness: 0.2, metallic: 1.0, emission: 0.0 }
];

export const defaultTransform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 }
};

export const defaultLightingSettings = {
  intensity: 100,
  shadow: 50,
  castShadows: true
};