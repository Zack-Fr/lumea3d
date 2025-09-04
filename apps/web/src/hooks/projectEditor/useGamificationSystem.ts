import { useState, useCallback } from 'react';

interface Achievement {
  id: number;
  name: string;
  unlocked: boolean;
  icon: string;
}

interface GamificationData {
  level: number;
  xp: number;
  nextLevelXp: number;
  achievements: Achievement[];
  streak: number;
}

interface GamificationSystem {
  gamificationData: GamificationData;
  showGamification: boolean;
  setShowGamification: (show: boolean) => void;
  showAchievement: boolean;
  achievementMessage: string;
  triggerAchievement: (message: string) => void;
  handleAssetAdd: (assetName: string) => void;
}

export const useGamificationSystem = (): GamificationSystem => {
  const [gamificationData] = useState<GamificationData>({
    level: 12,
    xp: 2340,
    nextLevelXp: 2500,
    achievements: [
      { id: 1, name: "First Scene", unlocked: true, icon: "🎯" },
      { id: 2, name: "Material Master", unlocked: true, icon: "🎨" },
      { id: 3, name: "Speed Builder", unlocked: false, icon: "⚡" },
    ],
    streak: 7
  });

  const [showGamification, setShowGamification] = useState(true);
  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementMessage, setAchievementMessage] = useState("");

  const triggerAchievement = useCallback((message: string) => {
    setAchievementMessage(message);
    setShowAchievement(true);
    setTimeout(() => setShowAchievement(false), 3000);
  }, []);

  const handleAssetAdd = useCallback((assetName: string) => {
    triggerAchievement(`✨ +15 XP - Added ${assetName} to scene!`);
  }, [triggerAchievement]);

  return {
    gamificationData,
    showGamification,
    setShowGamification,
    showAchievement,
    achievementMessage,
    triggerAchievement,
    handleAssetAdd
  };
};