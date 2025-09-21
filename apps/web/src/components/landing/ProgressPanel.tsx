import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Sparkles, Info } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../../components/ui/Button";
import { Separator } from "../../components/ui/Separator";
import { ScrollArea } from "../../components/ui/ScrollArea";
import { DesignStyle, CommunityStats } from "../../types/landing";
// import AchievementCard from "./AchievementCard";
import StyleCard from "./StyleCard";
import UserProjectsSection from "./UserProjectsSection";
import s from "../../pages/landing/Landing.module.css";

interface ProgressPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  // achievements: Achievement[];
  designStyles: DesignStyle[];
  currentStyleIndex: number;
  communityStats: CommunityStats;
  className?: string;
}

const ProgressPanel = memo(({ 
  isOpen, 
  onClose, 
  isAuthenticated,
  // achievements, 
  designStyles, 
  currentStyleIndex,
  communityStats,
  className = ""
}: ProgressPanelProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ type: "spring", damping: 20 }}
          className={`${s.rightPanel} ${className}`}
        >
          <Card className={s.glassStrong}>
            <div className="p-6 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[var(--glass-yellow)]" />
                  <h3 className="font-bold text-center text-white">{isAuthenticated ? 'Your Projects' : 'Achievements and Gallery (coming soon!)'}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-[var(--glass-gray)] hover:text-white"
                  aria-label="Close progress panel"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 pr-2">
                {isAuthenticated ? (
                  /* User Projects Section */
                  <UserProjectsSection />
                ) : (
                  <div className="space-y-6">
                    {/* Achievements */}
                    {/* <div>
                      <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[var(--glass-yellow)]" />
                        Achievements
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {achievements.map((achievement, index) => (
                          <AchievementCard
                            key={achievement.name}
                            achievement={achievement}
                            index={index}
                          />
                        ))}
                      </div>
                    </div> */}

                    {/* <Separator className="bg-[var(--glass-border-dim)]" /> */}

                    {/* Trending Styles */}
                    <div>
                      <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[var(--glass-yellow)]" />
                        Libraries
                      </h4>
                      <div className="space-y-3">
                        {designStyles.map((style, index) => (
                          <StyleCard
                            key={style.name}
                            style={style}
                            index={index}
                            isActive={index === currentStyleIndex}
                          />
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-[var(--glass-border-dim)]" />

                    {/* Quick Stats */}
                    <div>
                      <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4 text-[var(--glass-yellow)]" />
                        Community Stats
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 glass rounded-lg">
                          <span className="text-sm text-[var(--glass-gray)]">Active Designers</span>
                          <span className="text-sm font-medium text-white">{communityStats.activeDesigners.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 glass rounded-lg">
                          <span className="text-sm text-[var(--glass-gray)]">Projects Created</span>
                          <span className="text-sm font-medium text-[var(--glass-yellow)]">{communityStats.projectsCreated}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 glass rounded-lg">
                          <span className="text-sm text-[var(--glass-gray)]">Styles Available</span>
                          <span className="text-sm font-medium text-white">{communityStats.stylesAvailable}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ProgressPanel.displayName = 'ProgressPanel';

export default ProgressPanel;