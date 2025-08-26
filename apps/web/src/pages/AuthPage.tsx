// apps/web/src/pages/AuthPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/app/paths";
import { CtaLink } from "@/shared/ui/CtaLink";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, Sparkles } from "lucide-react";
import s from "../marketing/Auth.module.css";

type Mode = "signin" | "signup";

interface AuthPageProps {
  /** Decides which screen to show by default; route entries can pass this in. */
  initialMode?: Mode;
}

export default function AuthPage({ initialMode = "signin" }: AuthPageProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const isSignUp = mode === "signup";

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const setField = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const switchMode = (next: Mode) => {
    setError(null);
    setForm({ name: "", email: "", password: "", confirmPassword: "" });
    setMode(next);
    // keep URL in sync
    navigate(next === "signup" ? ROUTES.signup() : ROUTES.login());
  };

  const onBack = () => navigate(ROUTES.landing());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.email || !form.password) {
      setError("Please fill in all required fields");
      return;
    }
    if (isSignUp && form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // TODO: wire to real auth API. For now, go to dashboard.
    // You can replace this with your auth call; on success:
    navigate(ROUTES.dashboard());
  };

  return (
    <div className={s.authWrap}>
      <div className={s.card} role="dialog" aria-label={isSignUp ? "Sign Up" : "Sign In"}>
        {/* Header Row: Back + Brand */}
        <div className={s.brandRow}>
          <CtaLink
            to={ROUTES.landing()}
            variant="custom"
            className={s.secondaryBtn}
            aria-label="Back to Home"
            onClick={(e) => {
              // Allow normal SPA navigation; no-op here
            }}
          >
            <ArrowLeft style={{ width: 18, height: 18, marginRight: 8 }} />
            Back
          </CtaLink>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: ".6rem" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, var(--brand-gold,#F8CC3E), #ff7ab6)",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                color: "#071124",
              }}
              aria-hidden
            >
              L
            </div>
            <span className={s.title}>Lumea</span>
          </div>
        </div>

        <p className={s.hint} style={{ marginBottom: "1rem" }}>
          {isSignUp ? "Create your account" : "Welcome back"}
        </p>

        {/* FORM */}
        <form onSubmit={handleSubmit} className={s.form} noValidate>
          {isSignUp && (
            <div>
              <label htmlFor="name" className={s.label}>
                Full Name
              </label>
              <div className={s.row}>
                <User style={{ width: 18, height: 18, opacity: 0.7 }} aria-hidden />
                <input
                  id="name"
                  type="text"
                  className={s.input}
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className={s.label}>
              Email
            </label>
            <div className={s.row}>
              <Mail style={{ width: 18, height: 18, opacity: 0.7 }} aria-hidden />
              <input
                id="email"
                type="email"
                className={s.input}
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className={s.label}>
              Password
            </label>
            <div className={s.row} style={{ position: "relative" }}>
              <Lock style={{ width: 18, height: 18, opacity: 0.7 }} aria-hidden />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={s.input}
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                required
                aria-describedby="pw-hint"
                style={{ paddingRight: "2.25rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                className={s.secondaryBtn}
                style={{ position: "absolute", right: 4, top: 4, padding: ".35rem .5rem" }}
              >
                {showPassword ? (
                  <EyeOff style={{ width: 18, height: 18 }} />
                ) : (
                  <Eye style={{ width: 18, height: 18 }} />
                )}
              </button>
            </div>
            <div id="pw-hint" className={s.hint}>
              Use 8+ characters, with a mix of letters and numbers.
            </div>
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className={s.label}>
                Confirm Password
              </label>
              <div className={s.row}>
                <Lock style={{ width: 18, height: 18, opacity: 0.7 }} aria-hidden />
                <input
                  id="confirmPassword"
                  type="password"
                  className={s.input}
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          {error && (
            <div className={s.error} role="alert">
              {error}
            </div>
          )}

          <div className={s.actions}>
            <button type="submit" className={s.submit}>
              <Sparkles style={{ width: 18, height: 18, marginRight: 8 }} />
              {isSignUp ? "Create Account" : "Sign In"}
            </button>

            <button
              type="button"
              className={s.secondaryBtn}
              onClick={() => switchMode(isSignUp ? "signin" : "signup")}
            >
              {isSignUp ? "Have an account? Sign In" : "New here? Sign Up"}
            </button>
          </div>

          <div className={s.divider}>or</div>

          <div className={s.socialRow}>
            <button type="button" className={s.socialBtn}>
              Continue with Google
            </button>
            <button type="button" className={s.socialBtn}>
              GitHub
            </button>
          </div>

          <p className={`${s.hint} ${s.small}`} style={{ textAlign: "center", marginTop: "0.75rem" }}>
            By continuing, you agree to our{" "}
            <a href="#" style={{ color: "var(--brand-gold)" }}>
              Terms
            </a>{" "}
            and{" "}
            <a href="#" style={{ color: "var(--brand-gold)" }}>
              Privacy
            </a>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
