import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "@/app/paths";
import s from "./ProjectEditor.module.css"; // ✅ CSS Module
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Separator } from "../../components/ui/separator";
import {
  Award, ArrowLeft, Sparkles, Zap
} from "lucide-react";

const assetCategories = [
  { id: "models", title: "3D Models", icon: "Box" },
  { id: "props", title: "Props", icon: "Grid3x3" },
  { id: "lights", title: "Lights", icon: "Sun" },
];

const gamificationData = { level: 3, xp: 120, nextLevelXp: 200, streak: 5 };

export default function ProjectEditor() {
  const [selectedTool, setSelectedTool] = useState("models");
  const [showProperties, setShowProperties] = useState(true);
  const [showGamification, setShowGamification] = useState(true);
  const [isWASDActive, setIsWASDActive] = useState(false);
  const [renderMode] = useState("realistic");
  const viewportRef = useRef<HTMLDivElement>(null);
  const [movement, setMovement] = useState({ forward: false, backward: false, left: false, right: false });
  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementMessage, setAchievementMessage] = useState("");

  useEffect(() => {
    const keyMap: Record<string, keyof typeof movement> = { w: "forward", a: "left", s: "backward", d: "right" };

    const handleKey = (e: KeyboardEvent, pressed: boolean) => {
      if (!isWASDActive) return;
      const key = (e.key || "").toLowerCase();
      if (["w", "a", "s", "d"].includes(key)) {
        const field = keyMap[key];
        setMovement(prev => ({ ...prev, [field]: pressed }));
      }
    };

    const down = (e: KeyboardEvent) => handleKey(e, true);
    const up = (e: KeyboardEvent) => handleKey(e, false);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [isWASDActive]);

  const navigate = useNavigate();

  const handleViewportClick = () => {
    setIsWASDActive(true);
    viewportRef.current?.focus();
    if (!showAchievement) {
      setAchievementMessage("🎮 Viewport Activated! Use WASD to navigate");
      setShowAchievement(true);
      setTimeout(() => setShowAchievement(false), 3000);
    }
  };

  const handleAssetAdd = (name: string) => {
    setAchievementMessage(`✨ +15 XP - Added ${name} to scene!`);
    setShowAchievement(true);
    setTimeout(() => setShowAchievement(false), 2000);
  };

  return (
    <div className={s.editorRoot}>
      {showAchievement && (
        <motion.div initial={{ opacity: 0, scale: 0.8, y: -50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: -50 }} className={s.achievementToast}>
          <Award className={s.achievementIcon} />
          <p>{achievementMessage}</p>
        </motion.div>
      )}

      {showGamification && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={s.gamificationBar}>
          <Award className={s.iconSm} />
          <span>Level {gamificationData.level}</span>
          <Progress value={(gamificationData.xp / gamificationData.nextLevelXp) * 100} className={s.progressSm} />
          <span>{gamificationData.xp}/{gamificationData.nextLevelXp}</span>
          <Zap className={s.iconSm} />
          <span>{gamificationData.streak}</span>
          <Button variant="ghost" size="sm" onClick={() => setShowGamification(false)} className={s.closeBtn}>×</Button>
        </motion.div>
      )}

      <header className={s.topBar}>
        <div className={s.topLeft}>
          <Button variant="ghost" size="sm" onClick={() => navigate(PATHS.dashboard)}>
            <ArrowLeft className={s.iconXs} /> Back
          </Button>
          <Separator orientation="vertical" />
          <h1>3D Scene Editor</h1>
          <Badge className={s.liveBadge}>Live</Badge>
        </div>
        <div className={s.topRight}>
          {/* Add your camera toggle buttons */}
          <Button size="sm" onClick={() => { setShowProperties(false); setShowGamification(true); }} className={s.aiAssistBtn}>
            <Sparkles className={s.iconXs} /> AI Assist
          </Button>
        </div>
      </header>

      <div className={s.layout}>
        <aside className={s.sidebarLeft}>
          <Card>
            <CardContent>
              <h3>Assets</h3>
              <div>
                {assetCategories.map((c) => (
                  <Button key={c.id} variant={selectedTool === c.id ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedTool(c.id)}>
                    {c.title}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className={s.viewport} ref={viewportRef} onClick={handleViewportClick} tabIndex={0}>
          <div className={s.viewportInner}>
            <p>Viewport placeholder — 3D canvas goes here.</p>
            <Button onClick={() => handleAssetAdd('Sample Model')}>Add Sample Model</Button>
          </div>
        </main>

        {showProperties && (
          <aside className={s.sidebarRight}>
            <Card>
              <CardContent>
                <h3>Properties</h3>
                <div>
                  <p>Camera: orbit</p>
                  <p>Lighting: day</p>
                  <p>Render: {renderMode}</p>
                </div>
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </div>
  );
}
