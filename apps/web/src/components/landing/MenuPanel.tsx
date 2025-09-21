import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, LogIn, UserPlus } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../../components/ui/Button";
import { Separator } from "../../components/ui/Separator";
import { ScrollArea } from "../../components/ui/ScrollArea";
import { CtaLink } from "@/shared/ui/CtaLink";
import { ROUTES } from "@/app/paths";
import { MenuItem } from "../../types/landing";
import MenuItemButton from "./MenuItemButton";
import s from "../../pages/landing/Landing.module.css";

interface MenuPanelProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  selectedMenuItem: string | null;
  onMenuItemClick: (item: MenuItem) => void;
  isAuthenticated?: boolean;
  className?: string;
}

const MenuPanel = memo(({ 
  isOpen, 
  onClose, 
  menuItems, 
  selectedMenuItem, 
  onMenuItemClick,
  isAuthenticated = false,
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
                    
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Lumea 3D </h2>
                    <p className="text-xs text-[var(--glass-gray)]">Virtually Connected!</p>
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

              {/* Quick Actions - Only show for unauthenticated users */}
              {!isAuthenticated && (
                <>
                  <Separator className="my-4 bg-[var(--glass-border-dim)]" />
                  <div className="grid grid-cols-2 gap-2">
                    <CtaLink
                      to={ROUTES.login()}
                      variant="custom"
                      className="glass border-glow text-[var(--glass-gray)] hover:text-white inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background h-9 px-3"
                      aria-label="Go to login page"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </CtaLink>
                    <CtaLink
                      to={ROUTES.signup()}
                      variant="custom"
                      className="bg-[var(--glass-yellow)] hover:bg-[var(--glass-yellow-dark)] text-[var(--glass-black)] glow-yellow inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background h-9 px-3"
                      aria-label="Go to signup page"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Join
                    </CtaLink>
                  </div>
                </>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

MenuPanel.displayName = 'MenuPanel';

export default MenuPanel;