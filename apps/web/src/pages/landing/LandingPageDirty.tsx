import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { ScrollArea } from "../../components/ui/scrollArea";
import { ImageWithFallback } from "../../components/ui/ImageWithFallback";
import s from "./Landing.module.css";
import { 
  Play, 
  ArrowRight, 
  Sparkles, 
  Palette, 
  Zap,
  Star,
  Trophy,
  Target,
  Users,
  Gamepad2,
  Crown,
  Gem,
  Shield,
  ChevronRight,
  Settings,
  LogIn,
  UserPlus,
  Home,
  Layers,
  Compass,
  Volume2,
  VolumeX,
  Menu,
  X,
  Info
} from "lucide-react";

interface CinematicLandingProps {
  onNavigate?: (page: string) => void;
  onLogin?: () => void;
}

const menuItems = [
  { 
    id: "home", 
    label: "Home Base", 
    icon: Home, 
    level: 1, 
    unlocked: true, 
    description: "Your command center",
    action: "landing"
  },
  { 
    id: "design", 
    label: "Design Studio", 
    icon: Palette, 
    level: 3, 
    unlocked: true, 
    description: "Create & customize",
    action: "project"
  },
  { 
    id: "explore", 
    label: "Style Explorer", 
    icon: Compass, 
    level: 2, 
    unlocked: true, 
    description: "Discover new aesthetics",
    action: null
  },
  { 
    id: "gallery", 
    label: "Inspiration Gallery", 
    icon: Layers, 
    level: 5, 
    unlocked: false, 
    description: "Browse masterpieces",
    action: "guest"
  },
  { 
    id: "community", 
    label: "Designer's Guild", 
    icon: Users, 
    level: 7, 
    unlocked: false, 
    description: "Connect with creators",
    action: null
  }
];

const achievements = [
  { name: "First Steps", icon: Target, completed: true, rarity: "common" },
  { name: "Style Seeker", icon: Sparkles, completed: true, rarity: "uncommon" },
  { name: "Design Master", icon: Crown, completed: false, rarity: "legendary" },
  { name: "Trendsetter", icon: Gem, completed: false, rarity: "rare" }
];

const designStyles = [
  { name: "Modern", popularity: 89, image: "https://images.unsplash.com/photo-1720247520862-7e4b14176fa8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBpbnRlcmlvciUyMGxpdmluZyUyMHJvb218ZW58MXx8fHwxNzU1ODEyOTIyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" },
  { name: "Scandinavian", popularity: 76, image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2FuZGluYXZpYW4lMjBpbnRlcmlvciUyMGRlc2lnbnxlbnwxfHx8fDE3NTU4NzQ2MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" },
  { name: "Minimalist", popularity: 92, image: "https://images.unsplash.com/photo-1705321963943-de94bb3f0dd3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwaW50ZXJpb3IlMjBkZXNpZ258ZW58MXx8fHwxNzU1ODA1NzM0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" }
];

export default function CinematicLanding({ onNavigate, onLogin }: CinematicLandingProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedMenuItem, setSelectedMenuItem] = useState<string | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStyleIndex((prev) => (prev + 1) % designStyles.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleMenuItemClick = (item: typeof menuItems[0]) => {
    if (!item.unlocked) return;
    setSelectedMenuItem(item.id);
    if (item.action && onNavigate) {
      onNavigate(item.action);
    }
  };

  return (
    <div className={s.root}>
      {/* Enhanced Background Effects */}
      <div className={s.backgroundEffects} aria-hidden>
        <div className={s.backgroundCircle1}></div>
        <div className={s.backgroundCircle2}></div>
        <div className={s.backgroundGradient}></div>
      </div>

      {/* Floating Particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className={s.floatingParticle}
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            scale: [1, 1.5, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Left Game Menu Panel */}
      <AnimatePresence>
        {leftPanelOpen && (
          <motion.div
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            transition={{ type: "spring", damping: 20 }}
            className={s.leftPanel}
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
                    onClick={() => setLeftPanelOpen(false)}
                    className="text-[var(--glass-gray)] hover:text-white"
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
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant="ghost"
                          className={`w-full justify-start p-4 h-auto glass hover:glow-yellow transition-all duration-300 group ${
                            !item.unlocked ? 'opacity-50 cursor-not-allowed' : ''
                          } ${selectedMenuItem === item.id ? s.menuItemSelected : 'border-[var(--glass-border-dim)]'}`}
                          onClick={() => handleMenuItemClick(item)}
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

      {/* Central 3D Scene Area */}
      <div className={s.centralViewport}>
        <motion.div 
          className={s.glassViewport}
          style={{
            transform: `perspective(1000px) rotateX(${mousePos.y * 1}deg) rotateY(${mousePos.x * 1}deg)`,
          }}
          transition={{ type: "spring", damping: 30, stiffness: 200 }}
        >
          <div className={s.scene3d}>
            {/* 3D Scene Placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0] 
                }}
                transition={{ 
                  duration: 6, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className={s.gameIcon}
              >
                <Gamepad2 className="w-10 h-10 text-[var(--glass-black)]" />
              </motion.div>
              
              <h1 className="text-6xl font-bold text-white mb-4 leading-tight">
                Design Your
                <span className={s.titleGradient + " block"}>
                  Dream Space
                </span>
              </h1>
              
              <p className="text-xl text-[var(--glass-gray)] mb-8 max-w-lg leading-relaxed">
                Immersive 3D interior design powered by AI. Create, explore, and bring your vision to life.
              </p>

              <div className="flex gap-4">
                <Button 
                  size="lg"
                  className={s.ctaGlow + " px-8 py-6 text-lg hover:glow-yellow-strong transition-all duration-300 group"}
                  onClick={() => onNavigate?.("dashboard")}
                >
                  Start Creating
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  className="glass border-glow text-white hover:bg-white/10 px-8 py-6 text-lg group"
                  onClick={() => onNavigate?.("guest")}
                >
                  <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Watch Demo
                </Button>
              </div>
            </div>

            {/* Floating UI Elements */}
            <motion.div
              className={s.floatingUi + " absolute top-6 right-6"}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--glass-yellow)]" />
                <span className="text-sm text-white">AI Assistant Active</span>
              </div>
            </motion.div>

            <motion.div
              className={s.floatingUi + " absolute bottom-6 left-6"}
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white">Real-time Rendering</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Achievements & Gallery */}
      <AnimatePresence>
        {rightPanelOpen && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: "spring", damping: 20 }}
            className={s.rightPanel}
          >
            <Card className={s.glassStrong}>
              <div className="p-6 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[var(--glass-yellow)]" />
                    <h3 className="font-bold text-white">Progress</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRightPanelOpen(false)}
                    className="text-[var(--glass-gray)] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-6">
                    {/* Achievements */}
                    <div>
                      <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[var(--glass-yellow)]" />
                        Achievements
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {achievements.map((achievement, index) => (
                          <motion.div
                            key={achievement.name}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-3 rounded-lg border transition-all duration-300 ${
                              achievement.completed 
                                ? s.achievementGlow 
                                : 'bg-gray-500/10 border-gray-500/20 opacity-60'
                            }`}
                          >
                            <achievement.icon className={`w-6 h-6 mb-2 ${
                              achievement.completed 
                                ? achievement.rarity === 'legendary' ? 'text-purple-400' :
                                  achievement.rarity === 'rare' ? 'text-blue-400' :
                                  achievement.rarity === 'uncommon' ? 'text-green-400' :
                                  'text-[var(--glass-yellow)]'
                                : 'text-gray-500'
                            }`} />
                            <p className="text-xs text-white font-medium">{achievement.name}</p>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs mt-1 ${
                                achievement.rarity === 'legendary' ? 'bg-purple-500/20 text-purple-400' :
                                achievement.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                                achievement.rarity === 'uncommon' ? 'bg-green-500/20 text-green-400' :
                                'bg-[var(--glass-yellow)]/20 text-[var(--glass-yellow)]'
                              }`}
                            >
                              {achievement.rarity}
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-[var(--glass-border-dim)]" />

                    {/* Trending Styles */}
                    <div>
                      <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[var(--glass-yellow)]" />
                        Trending Styles
                      </h4>
                      <div className="space-y-3">
                        {designStyles.map((style, index) => (
                          <motion.div
                            key={style.name}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative rounded-lg overflow-hidden border transition-all duration-300 cursor-pointer hover:glow-yellow ${
                              index === currentStyleIndex ? 'border-[var(--glass-yellow)] glow-yellow' : 'border-[var(--glass-border-dim)]'
                            }`}
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
                          <span className="text-sm font-medium text-white">12,847</span>
                        </div>
                        <div className="flex items-center justify-between p-3 glass rounded-lg">
                          <span className="text-sm text-[var(--glass-gray)]">Projects Created</span>
                          <span className="text-sm font-medium text-[var(--glass-yellow)]">2.1M+</span>
                        </div>
                        <div className="flex items-center justify-between p-3 glass rounded-lg">
                          <span className="text-sm text-[var(--glass-gray)]">Styles Available</span>
                          <span className="text-sm font-medium text-white">47</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Controls */}
      <div className={s.floatingControls}>
        <div className="flex items-center gap-2">
          {!leftPanelOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLeftPanelOpen(true)}
              className="glass border-glow text-[var(--glass-gray)] hover:text-white"
            >
              <Menu className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="glass border-glow text-[var(--glass-gray)] hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {!rightPanelOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRightPanelOpen(true)}
              className="glass border-glow text-[var(--glass-gray)] hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Feature Pills at Bottom */}
      <motion.div
        className={s.featurePills}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <div className="flex gap-4">
          {["3D Immersion", "AI-Powered", "Real-time Collaboration"].map((feature, index) => (
            <motion.div 
              key={feature}
              className={s.featurePill}
              whileHover={{ scale: 1.05 }}
              transition={{ delay: index * 0.1 }}
            >
              <span className="text-[var(--glass-gray)] text-sm">{feature}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}