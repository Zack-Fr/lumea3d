import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ROUTES } from "@/app/paths";
import { CtaLink } from "@/shared/ui/CtaLink";
import { Sparkles, Play, ArrowRight } from "lucide-react";
import s from "./Hero.module.css";

export default function HeroSection() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  return (
    <section className={s.heroRoot} aria-label="Hero">
      {/* Background gradients (contained & pointer-events:none) */}
      <div className={s.bg}>
        <div className={`${s.blob} ${s.blobGold}`} />
        <div className={`${s.blob} ${s.blobPlum}`} />
        <div className={s.heroVignette} />
      </div>

      {/* 3D Room Scene Placeholder with Glass Effect */}
      <div className={s.scene}>
        <motion.div
          className={s.sceneCard}
          style={{
            transform: `rotateX(${mousePos.y * 2}deg) rotateY(${mousePos.x * 2}deg)`,
          }}
          transition={{ type: "spring", damping: 30, stiffness: 200 }}
        >
          <div className={s.sceneInner}>
            <div className={s.sceneIconWrap}>
              <Play className={s.sceneIcon} />
            </div>
            <p className={s.sceneLine1}>Interactive 3D Room</p>
            <p className={s.sceneLine2}>Your 3D scene integration here</p>
          </div>
        </motion.div>
      </div>

      {/* Floating Glass Particles (transform-only animations) */}
      <motion.div
        className={`${s.particle} ${s.p1}`}
        animate={{ y: [0, -30, 0], scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`${s.particleRing} ${s.p2}`}
        animate={{ y: [0, 20, 0], rotate: [0, 180, 360], scale: [1, 1.5, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Main Content */}
      <div className={s.content}>
        <div className={s.contentInner}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={s.badge}
          >
            <Sparkles className={s.badgeIcon} />
            <span className={s.badgeText}>AI-Powered Interior Design</span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className={s.fadeInUp}
          >
            <h1 className={s.title}>
              Design Your
              <span className={s.titleHighlight}>Dream Space</span>
            </h1>
          </motion.div>

          {/* Subtext */}
          <motion.p
            className={s.subtitle}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Transform your vision into reality with AI-powered interior design.
            Create stunning spaces that reflect your unique style and personality.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className={s.ctas}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <CtaLink to={ROUTES.dashboard()} variant="primary" className={s.ctaPrimary}>
              Start Designing Now
              <ArrowRight className={s.ctaArrow} />
            </CtaLink>

            <CtaLink to={ROUTES.how()} variant="outline" className={s.ctaSecondary}>
              <Play className={s.ctaPlay} />
              View Demo
            </CtaLink>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            className={s.pills}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            {["3D Visualization", "AI Assistant", "Real-time Collaboration"].map((feature) => (
              <div key={feature} className={s.pill}>
                <span className={s.pillText}>{feature}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className={s.scroll}
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className={s.scrollShell}>
          <div className={s.scrollDot} />
        </div>
      </motion.div>
    </section>
  );
}
