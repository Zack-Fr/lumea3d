import { memo } from "react";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ChevronRight, Shield } from "lucide-react";
import { MenuItem } from "../../types/landing";
import s from "../../pages/landing/Landing.module.css";

interface MenuItemButtonProps {
  item: MenuItem;
  index: number;
  isSelected: boolean;
  onClick: (item: MenuItem) => void;
  className?: string;
}

const MenuItemButton = memo(({ item, index, isSelected, onClick, className = "" }: MenuItemButtonProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      <Button
        variant="ghost"
        className={`w-full justify-start p-4 h-auto glass hover:glow-yellow transition-all duration-300 group ${
          !item.unlocked ? 'opacity-50 cursor-not-allowed' : ''
        } ${isSelected ? s.menuItemSelected : 'border-[var(--glass-border-dim)]'}`}
        onClick={() => onClick(item)}
        disabled={!item.unlocked}
      >
        <div className="flex items-center gap-4 w-full">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            item.unlocked 
              ? s.menuItemGlow 
              : 'bg-gray-500/20 text-gray-500'
          }`}>
            <item.icon className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{item.label}</span>
              {!item.unlocked && <Shield className="w-3 h-3 text-gray-500" />}
              <Badge variant="secondary" className="text-xs bg-[var(--glass-yellow)]/20 text-[var(--glass-yellow)] border-[var(--glass-yellow)]/30">
                Lv.{item.level}
              </Badge>
            </div>
            <p className="text-xs text-[var(--glass-gray)]">{item.description}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--glass-gray)] group-hover:text-[var(--glass-yellow)] transition-colors" />
        </div>
      </Button>
    </motion.div>
  );
});

MenuItemButton.displayName = 'MenuItemButton';

export default MenuItemButton;