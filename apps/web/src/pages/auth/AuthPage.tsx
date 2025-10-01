import { useState, useCallback, FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@/app/paths";
import { CtaLink } from "@/shared/ui/CtaLink";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, Sparkles } from "lucide-react";
import s from "./Auth.module.css";
import { useAuth } from "@/providers/AuthProvider";

type Mode = "signin" | "signup";

interface AuthPageProps {
  initialMode?: Mode;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function AuthPage({ initialMode }: AuthPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading, error, clearError, login, register } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const invitationToken = searchParams.get('invitation');

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const mode: Mode = initialMode ?? (location.pathname.endsWith("/signup") ? "signup" : "signin");
  const isSignUp = mode === "signup";

  const setField = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const switchMode = useCallback(() => {
    clearError();
    setLocalError(null);
    setForm({ name: "", email: "", password: "", confirmPassword: "" });
    navigate(isSignUp ? ROUTES.login() : ROUTES.signup(), { replace: true });
  }, [clearError, isSignUp, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    const { email, password, confirmPassword, name } = form;

    if (!email || !password) {
      setLocalError("Please fill in all required fields");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    try {
      if (isSignUp) {
        await register(email, password, name || undefined);
      } else {
        await login(email, password);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setLocalError("Authentication failed. Please try again.");
    }
  };

  const handleGoogleLogin = () => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    if (invitationToken) {
      window.location.href = `${apiBaseUrl}/auth/google/invite/${invitationToken}`;
    } else {
      window.location.href = `${apiBaseUrl}/auth/google`;
    }
  };

  if (isLoading) return null;

  const passwordIcon = showPassword ? <EyeOff width={18} height={18} /> : <Eye width={18} height={18} />;
  const passwordToggleLabel = showPassword ? "Hide password" : "Show password";

  return (
    <div className={s.authWrap}>
      {/* Back Button - positioned at top left of screen */}
      <div className={s.backButtonContainer}>
        <CtaLink to={ROUTES.landing()} variant="custom" className={s.backButton} aria-label="Back to Home">
          <ArrowLeft className={s.backButtonIcon} />
          Back to Home
        </CtaLink>
      </div>

      {/* Cinematic Background Effects */}
      <div className={s.backgroundEffects} aria-hidden="true">
        <div className={s.backgroundOrb1}></div>
        <div className={s.backgroundOrb2}></div>
        <div className={s.backgroundOrb3}></div>
      </div>

      <div className={s.contentWrapper}>

        {/* Logo Header */}
        <header className={s.header}>
          <div className={s.logoContainer}>
            <div className={s.logoCircle} aria-hidden="true"></div>
            <span className={s.title}>Lumea</span>
          </div>
          <p className={s.headerSubtitle}>
            {isSignUp ? "Create your account" : "Welcome back"}
          </p>
        </header>

        <div className={s.card} role="dialog" aria-label={isSignUp ? "Sign Up" : "Sign In"}>
          <form onSubmit={handleSubmit} className={s.form} noValidate>
          {isSignUp && (
            <FormField
              label="Full Name"
              id="name"
              icon={<User width={18} height={18} opacity={0.7} />}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Enter your full name"
            />
          )}

          <FormField
            label="Email"
            id="email"
            icon={<Mail width={18} height={18} opacity={0.7} />}
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="you@example.com"
            type="email"
          />

          <FormField
            label="Password"
            id="password"
            icon={<Lock width={18} height={18} opacity={0.7} />}
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            placeholder="Enter your password"
            type={showPassword ? "text" : "password"}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={passwordToggleLabel}
                title={passwordToggleLabel}
                className={s.eyeButton}
              >
                {passwordIcon}
              </button>
            }
            ariaDescribedBy="pw-hint"
          />
          <div id="pw-hint" className={s.hint}>
            Use 8+ characters, with a mix of letters and numbers.
          </div>

          {isSignUp && (
            <FormField
              label="Confirm Password"
              id="confirmPassword"
              icon={<Lock width={18} height={18} opacity={0.7} />}
              value={form.confirmPassword}
              onChange={(e) => setField("confirmPassword", e.target.value)}
              placeholder="Re-enter your password"
              type="password"
            />
          )}

          {(error || localError) && (
            <div className={s.error} role="alert">
              {localError || error}
            </div>
          )}

          <div className={s.actions}>
            <button type="submit" className={s.submit} disabled={isLoading}>
              <Sparkles width={18} height={18} style={{ marginRight: 8 }} />
              {isLoading ? (isSignUp ? "Creating..." : "Signing in...") : isSignUp ? "Create Account" : "Sign In"}
            </button>

            <button type="button" className={s.secondaryBtn} onClick={switchMode}>
              {isSignUp ? "Have an account? Sign In" : "New here? Sign Up"}
            </button>
          </div>

          <div className={s.divider}>or</div>

          <div className={s.socialRow}>
            <button type="button" className={s.socialBtn} onClick={handleGoogleLogin}>
              Continue with Google
            </button>
            <button type="button" className={s.socialBtn} disabled>
              GitHub (Coming Soon)
            </button>
          </div>

          <p className={`${s.hint} ${s.small}`} style={{ textAlign: "center", marginTop: "0.75rem" }}>
            By continuing, you agree to our{" "}
            <a href="#" style={{ color: "var(--brand-gold)" }}>Terms</a> and{" "}
            <a href="#" style={{ color: "var(--brand-gold)" }}>Privacy</a>.
          </p>
        </form>
        </div>
      </div>
      

      {/* <ApiUrlDebug /> */}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  id: string;
  icon: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
  rightElement?: React.ReactNode;
  ariaDescribedBy?: string;
}

function FormField({
  label,
  id,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  rightElement,
  ariaDescribedBy,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={s.label}>{label}</label>
      <div className={s.row}>
        {icon}
        <input
          id={id}
          type={type}
          className={`${s.input} ${rightElement ? s.withAffix : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          aria-describedby={ariaDescribedBy}
        />
        {rightElement && (
          <span className={s.inputAffixRight}>
            {rightElement}
          </span>
        )}
      </div>
    </div>
  );
}
