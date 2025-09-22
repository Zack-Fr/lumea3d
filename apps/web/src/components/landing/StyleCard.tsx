import { memo } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { ImageWithFallback } from "../../components/ui/ImageWithFallback";
import { DesignStyle } from "../../types/landing";
import s from "../../pages/landing/Landing.module.css";

interface StyleCardProps {
  style: DesignStyle;
  index: number;
  isActive: boolean;
  onClick?: () => void;
  className?: string;
}

const StyleCard = memo(({ style, index, isActive, onClick, className = "" }: StyleCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative rounded-lg overflow-hidden border transition-all duration-300 cursor-pointer hover:glow-yellow ${
        isActive ? 'border-[var(--glass-yellow)] glow-yellow' : 'border-[var(--glass-border-dim)]'
      } ${className}`}
      onClick={onClick}
    >
      <div className="aspect-video relative">
        <ImageWithFallback
          src={style.image}
          alt={style.name}
          className="w-full h-full object-cover"
        />
        <div className={s.styleImageOverlay}></div>
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center justify-between">
            <span className="text-white font-medium text-sm">{style.name}</span>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-[var(--glass-yellow)] fill-current" />
              <span className="text-xs text-[var(--glass-yellow)]">{style.popularity}%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

StyleCard.displayName = 'StyleCard';

export default StyleCard;