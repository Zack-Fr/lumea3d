import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {ArrowRight, Calendar, CheckCircle, Home, LogOut, Palette,Plus, Settings, Sparkles, Users} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { PATHS, ROUTES } from "@/app/paths";
import { useAuth } from "../../providers/AuthProvider";
import s from "./Dashboard.module.css";

interface Project {
  id: number;
  name: string;
  client: string;
  stage: "concept" | "design" | "feedback" | "delivery";
  progress: number;
  dueDate: string;
  thumbnail?: string;
}


function ImageWithFallback({ src, alt, className }: { src?: string; alt?: string; className?: string }) {
  const fallback = "https://via.placeholder.com/640x360?text=No+image";
  const [cur, setCur] = useState(src || fallback);
  return (
    // eslint-disable-next-line jsx-a11y/img-redundant-alt
    <img
      src={cur}
      alt={alt ?? "thumbnail"}
      className={className}
      onError={() => {
        if (cur !== fallback) setCur(fallback);
      }}
    />
  );
}

const projects: Project[] = [
  {
    id: 1,
    name: "Modern Living Room",
    client: "Sarah Johnson",
    stage: "design",
    progress: 65,
    dueDate: "Jan 15, 2025",
    thumbnail: "https://images.unsplash.com/photo-1720247520862-7e4b14176fa8?auto=format&w=1080",
  },
  {
    id: 2,
    name: "Scandinavian Bedroom",
    client: "Michael Chen",
    stage: "feedback",
    progress: 40,
    dueDate: "Jan 20, 2025",
    thumbnail: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&w=1080",
  },
  {
    id: 3,
    name: "Minimalist Kitchen",
    client: "Emma Wilson",
    stage: "delivery",
    progress: 90,
    dueDate: "Jan 10, 2025",
    thumbnail: "https://images.unsplash.com/photo-1705321963943-de94bb3f0dd3?auto=format&w=1080",
  },
];

const pipelineStages = [
  { key: "concept", label: "Concept", icon: Home, count: 4 },
  { key: "design", label: "Design", icon: Palette, count: 2 },
  { key: "feedback", label: "Feedback", icon: Users, count: 1 },
  { key: "delivery", label: "Delivery", icon: CheckCircle, count: 1 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  // filter state is currently unused in the original file; keep it ready for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const [filter] = useState<"all" | string>("all");

  return (
    <div className={s.container}>
      {/* Sidebar */}
      <aside className={s.sidebar}>
        <Avatar className="mb-6 ring-2 ring-[var(--glass-yellow)]">
          <AvatarImage src="/placeholder-avatar.jpg" />
          <AvatarFallback className="bg-[var(--glass-yellow)] text-[var(--glass-black)]">JD</AvatarFallback>
        </Avatar>
        <h2 className={s.title}>Dashboard</h2>
      </aside>

      {/* Main Content */}
      <div className={s.main}>
        {/* Header */}
        <header className={s.header}>
          <div className={s.flexBetween}>
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate(PATHS.landing)}>
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-xl flex items-center justify-center font-bold text-black">
                L
              </div>
              <span className={s.title}>Lumea</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate("PATHS.admin")}>
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
              <Button variant="ghost" onClick={() => { logout(); navigate(PATHS.landing); }}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Body */}
        <main className={s.content}>
          {/* Welcome */}
          <motion.div className={`${s.cardStrong} ${s.glowYellow}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
              Welcome back, John! 👋
            </h1>
            <p className={s.muted}>Here's what's happening with your projects today.</p>
          </motion.div>

          {/* Pipeline */}
          <motion.div className={`${s.cardStrong} ${s.cardGlow} ${s.glowYellow}`} style={{ marginTop: "2rem" }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ArrowRight className="w-5 h-5 text-yellow-300" />
                Project Lifecycle
              </CardTitle>
              <CardDescription className={s.muted}>Track your projects through each stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {pipelineStages.map((stage, i) => (
                  <motion.div key={stage.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={s.card}>
                    <div className="w-10 h-10 bg-yellow-300/30 rounded-lg flex items-center justify-center mb-2">
                      <stage.icon className="text-yellow-300 w-5 h-5" />
                    </div>
                    <div className="text-lg font-bold text-white">{stage.count}</div>
                    <p className={s.muted}>{stage.label}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </motion.div>

          {/* Projects */}
          <section style={{ marginTop: "2rem" }}>
            <div className={s.flexBetween} style={{ marginBottom: "1rem" }}>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-yellow-400" />
                Your Projects
              </h2>
              <Button onClick={() => navigate(ROUTES.projectNew('new'))} className="bg-yellow-400 text-black">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className={s.card} onClick={() => navigate(ROUTES.project(String(project.id)))}>
                  <div className="rounded-md overflow-hidden mb-2">
                    <ImageWithFallback src={project.thumbnail} alt={project.name} className="w-full h-40 object-cover" />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-white">{project.name}</CardTitle>
                    <CardDescription className={s.muted}>Client: {project.client}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={s.flexBetween}>
                      <Badge className={
                        project.stage === "delivery" ? s.badgeGreen :
                        project.stage === "design" ? s.badgeYellow :
                        s.badgeRed
                      }>
                        {project.stage}
                      </Badge>
                      <span className="text-white text-sm">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <div className={`flex items-center gap-2 text-sm mt-2 ${s.muted}`}>
                      <Calendar className="w-4 h-4" />
                      Due {project.dueDate}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}