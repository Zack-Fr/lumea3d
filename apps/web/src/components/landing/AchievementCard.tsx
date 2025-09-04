import { memo } from "react";
import { motion } from "framer-motion";
import { Badge } from "../../components/ui/Badge";
import { Achievement } from "../../types/landing";

interface AchievementCardProps {
  achievement: Achievement;
  index: number;
  className?: string;
}

const AchievementCard = memo(({ achievement, index, className = "" }: AchievementCardProps) => {
  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'legendary': return 'text-purple-400 bg-purple-500/20';
      case 'rare': return 'text-blue-400 bg-blue-500/20';
      case 'uncommon': return 'text-green-400 bg-green-500/20';
      default: return 'text-[var(--glass-yellow)] bg-[var(--glass-yellow)]/20';
    }
  };

  const getIconColor = (rarity: Achievement['rarity'], completed: boolean) => {
    if (!completed) return 'text-gray-500';
    
    switch (rarity) {
      case 'legendary': return 'text-purple-400';
      case 'rare': return 'text-blue-400';
      case 'uncommon': return 'text-green-400';
      default: return 'text-[var(--glass-yellow)]';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className={`p-3 rounded-lg border transition-all duration-300 ${
        achievement.completed 
          ? 'bg-[var(--glass-yellow)]/10 border-[var(--glass-yellow)]/30 shadow-lg' 
          : 'bg-gray-500/10 border-gray-500/20 opacity-60'
      } ${className}`}
    >
      <achievement.icon 
        className={`w-6 h-6 mb-2 ${getIconColor(achievement.rarity, achievement.completed)}`} 
      />
      <p className="text-xs text-white font-medium">{achievement.name}</p>
      <Badge 
        variant="secondary" 
        className={`text-xs mt-1 ${getRarityColor(achievement.rarity)}`}
      >
        {achievement.rarity}
      </Badge>
    </motion.div>
  );
});

AchievementCard.displayName = 'AchievementCard';

export default AchievementCard;