import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, LogIn, UserPlus } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { ScrollArea } from "../../components/ui/scrollArea";
import { MenuItem } from "../../types/landing";
import MenuItemButton from "./MenuItemButton";
import s from "../../pages/landing/Landing.module.css";

interface MenuPanelProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  selectedMenuItem: string | null;
  onMenuItemClick: (item: MenuItem) => void;
  onLogin?: () => void;
  className?: string;
}

const MenuPanel = memo(({ 
  isOpen, 
  onClose, 
  menuItems, 
  selectedMenuItem, 
  onMenuItemClick, 
  onLogin,
  className = ""
}: MenuPanelProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -400 }}
          animate={{ x: 0 }}
          exit={{ x: -400 }}
          transition={{ type: "spring", damping: 20 }}
          className={`${s.leftPanel} ${className}`}
        >
          <Card className={s.glassStrong}>
            <div className="p-6 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={s.logoGlow + " w-10 h-10 rounded-xl flex items-center justify-center"}>
                    <span className="text-[var(--glass-black)] font-bold text-lg">L</span>
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Lumea Studio</h2>
                    <p className="text-xs text-[var(--glass-gray)]">Design Platform</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-[var(--glass-gray)] hover:text-white"
                  aria-label="Close menu panel"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Player Level & XP */}
              <div className="glass rounded-lg p-4 mb-6 border border-[var(--glass-border-light)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Designer Level 12</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-[var(--glass-yellow)] fill-current" />
                    <span className="text-xs text-[var(--glass-yellow)]">8,250 XP</span>
                  </div>
                </div>
                <div className="w-full bg-[var(--glass-border-dim)] rounded-full h-2 mb-2">
                  <div className={s.xpBar} style={{ width: '65%' }}></div>
                </div>
                <p className="text-xs text-[var(--glass-gray)]">1,750 XP to next level</p>
              </div>

              {/* Menu Items */}
              <ScrollArea className="flex-1 pr-2">
                <div className="space-y-2">
                  {menuItems.map((item, index) => (
                    <MenuItemButton
                      key={item.id}
                      item={item}
                      index={index}
                      isSelected={selectedMenuItem === item.id}
                      onClick={onMenuItemClick}
                    />
                  ))}
                </div>
              </ScrollArea>

              {/* Quick Actions */}
              <Separator className="my-4 bg-[var(--glass-border-dim)]" />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="glass border-glow text-[var(--glass-gray)] hover:text-white"
                  onClick={onLogin}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
                <Button
                  size="sm"
                  className="bg-[var(--glass-yellow)] hover:bg-[var(--glass-yellow-dark)] text-[var(--glass-black)] glow-yellow"
                  onClick={onLogin}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

MenuPanel.displayName = 'MenuPanel';

export default MenuPanel;