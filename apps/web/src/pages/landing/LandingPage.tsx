import { memo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {ArrowRight,Sparkles, Zap, Menu, Settings, Volume2, VolumeX } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useMouse } from "../../hooks/useMouse";
import { usePanels } from "../../hooks/usePanels";
import { useAudio } from "../../hooks/useAudio";
import { useStyleCarousel } from "../../hooks/useStyleCarousel";
import { useAuth } from "../../providers/AuthProvider";
import { MenuItem } from "../../types/landing";
import { MENU_ITEMS, DESIGN_STYLES, COMMUNITY_STATS, FEATURE_PILLS } from "../../data/landingData";
import MenuPanel from "../../components/landing/MenuPanel";
import ProgressPanel from "../../components/landing/ProgressPanel";
import FeaturePill from "../../components/landing/FeaturePill";
import s from "./Landing.module.css";

interface LandingPageProps {}

const LandingPage = memo(({}: LandingPageProps) => {
  const navigate = useNavigate();
  const [selectedMenuItem, setSelectedMenuItem] = useState<string | null>(null);
  
  // Custom hooks for clean state management
  const mousePos = useMouse();
  const { leftPanelOpen, rightPanelOpen, setLeftPanelOpen, setRightPanelOpen } = usePanels();
  const { soundEnabled, toggleSound } = useAudio();
  const { currentIndex: currentStyleIndex } = useStyleCarousel(DESIGN_STYLES);
  const { isAuthenticated } = useAuth();

  const handleMenuItemClick = useCallback((item: MenuItem) => {
    if (!item.unlocked) return;
    setSelectedMenuItem(item.id);
    if (item.action) {
      if (item.action === 'dashboard') {
        navigate('/app/dashboard');
      } else if (item.action === 'guest') {
        navigate('/app/guest');
      } else {
        navigate(`/${item.action}`);
      }
    }
  }, [navigate]);

  const handleNavigate = useCallback((page: string) => {
    if (page === 'dashboard') {
      navigate('/app/dashboard');
    } else if (page === 'guest') {
      navigate('/app/guest');
    } else {
      navigate(`/${page}`);
    }
  }, [navigate]);

  return (
    <div className={s.root}>
      {/* Enhanced Background Effects */}
      <BackgroundEffects />

      {/* Floating Particles */}
      <FloatingParticles />

      {/* Left Game Menu Panel */}
      <MenuPanel
        isOpen={leftPanelOpen}
        onClose={() => setLeftPanelOpen(false)}
        menuItems={MENU_ITEMS}
        selectedMenuItem={selectedMenuItem}
        onMenuItemClick={handleMenuItemClick}
        isAuthenticated={isAuthenticated}
      />

      {/* Central 3D Scene Area */}
      <CentralViewport 
        mousePos={mousePos} 
        onNavigate={handleNavigate}
      />

      {/* Right Panel - Achievements & Gallery */}
      <ProgressPanel
        isOpen={rightPanelOpen}
        onClose={() => setRightPanelOpen(false)}
        isAuthenticated={isAuthenticated}
        // achievements={ACHIEVEMENTS}
        designStyles={DESIGN_STYLES}
        currentStyleIndex={currentStyleIndex}
        communityStats={COMMUNITY_STATS}
      />

      {/* Floating Controls */}
      <FloatingControls
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        soundEnabled={soundEnabled}
        isAuthenticated={isAuthenticated}
        onToggleLeftPanel={() => setLeftPanelOpen(true)}
        onToggleRightPanel={() => setRightPanelOpen(true)}
        onToggleSound={toggleSound}
      />

      {/* Feature Pills at Bottom */}
      {/* <FeaturePillsRow /> */}
    </div>
  );
});

// Memoized sub-components for performance
const BackgroundEffects = memo(() => (
  <div className={s.backgroundEffects} aria-hidden>
    <div className={s.backgroundCircle1}></div>
    <div className={s.backgroundCircle2}></div>
    <div className={s.backgroundGradient}></div>
  </div>
));

const FloatingParticles = memo(() => (
  <>
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
  </>
));

interface CentralViewportProps {
  mousePos: { x: number; y: number };
  onNavigate: (page: string) => void;
}

const CentralViewport = memo(({ mousePos, onNavigate }: CentralViewportProps) => (
  <div className={s.centralViewport}>
    <motion.div 
      className={s.glassViewport}
      style={{
        transform: `perspective(1000px) rotateX(${mousePos.y * 1}deg) rotateY(${mousePos.x * 1}deg)`,
      }}
      transition={{ type: "spring", damping: 30, stiffness: 200 }}
    >
      <div className={s.scene3d}>
        <HeroContent onNavigate={onNavigate} />
        <FloatingUIElements />
      </div>
    </motion.div>
  </div>
));

interface HeroContentProps {
  onNavigate: (page: string) => void;
}

const HeroContent = memo(({ onNavigate }: HeroContentProps) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
    
    <h1 className="text-6xl font-bold text-black mb-4 leading-tight">
      Your  
      <span className={s.titleGradient}> 3Design </span>
      <span className={s.titleGradient + " block"}>
        In Realtime
      </span>
    </h1>

    <div className="flex gap-4">
      <Button 
        size="lg"
        className={s.ctaGlow + " px-8 py-6 text-lg hover:glow-yellow-strong transition-all duration-300 group"}
        onClick={() => onNavigate("dashboard")}
      >
        Start Creating<ArrowRight className="w-10 h-5 group-hover:translate-x-1 transition-transform" />
      </Button>
      {/* <Button 
        variant="outline"
        size="lg"
        className="glass border-glow text-white hover:bg-white/10 px-8 py-6 text-lg group"
        onClick={() => onNavigate("guest")}
      >
        <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
        Watch Demo
      </Button> */}
    </div>
  </div>
));

const FloatingUIElements = memo(() => (
  <>
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
  </>
));

interface FloatingControlsProps {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  soundEnabled: boolean;
  isAuthenticated: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onToggleSound: () => void;
}

const FloatingControls = memo(({ 
  leftPanelOpen, 
  rightPanelOpen, 
  soundEnabled,
  onToggleLeftPanel, 
  onToggleRightPanel, 
  onToggleSound 
}: FloatingControlsProps) => (
  <div className={s.floatingControls}>
    <div className="flex items-center gap-2">
      {!leftPanelOpen && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleLeftPanel}
          className="glass border-glow text-[var(--glass-gray)] hover:text-white"
          aria-label="Open menu panel"
        >
          <Menu className="w-4 h-4" />
        </Button>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleSound}
        className="glass border-glow text-[var(--glass-gray)] hover:text-white"
        aria-label={soundEnabled ? "Mute sound" : "Enable sound"}
      >
        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </Button>

      {!rightPanelOpen && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleRightPanel}
          className="glass border-glow text-[var(--glass-gray)] hover:text-white"
          aria-label="Open progress panel"
        >
          <Settings className="w-4 h-4" />
        </Button>
      )}
    </div>
  </div>
));

const FeaturePillsRow = memo(() => (
  <motion.div
    className={s.featurePills}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 1 }}
  >
    <div className="flex gap-4">
      {FEATURE_PILLS.map((feature, index) => (
        <FeaturePill 
          key={feature}
          feature={feature}
          index={index}
        />
      ))}
    </div>
  </motion.div>
));

// Set display names for better debugging
BackgroundEffects.displayName = 'BackgroundEffects';
FloatingParticles.displayName = 'FloatingParticles';
CentralViewport.displayName = 'CentralViewport';
HeroContent.displayName = 'HeroContent';
FloatingUIElements.displayName = 'FloatingUIElements';
FloatingControls.displayName = 'FloatingControls';
FeaturePillsRow.displayName = 'FeaturePillsRow';
LandingPage.displayName = 'LandingPage';

export default LandingPage;