import { ROUTES } from "@/app/paths";
import { CtaLink } from "@/shared/ui/CtaLink";
import s from "./Navbar.module.css";

export default function Navbar() {
  return (
    <header className={s.header}>
      <div className={s.brand}>
        <CtaLink to={ROUTES.landing()} variant="custom" className={s.brandLink}>
          <div className={s.logo}></div>
          <span className={s.wordmark}>Lumea</span>
        </CtaLink>
      </div>

      <nav className={s.nav} aria-label="Primary">
        <CtaLink to={ROUTES.how()} variant="custom" className={s.link}>
          How it works
        </CtaLink>
      </nav>

      <div className={s.actionGroup}>
        <CtaLink to={ROUTES.dashboard()} variant="custom" className={`${s.button} ${s.ghost}`}>
          Try Demo
        </CtaLink>
        <CtaLink to={ROUTES.login()} variant="custom" className={`${s.button} ${s.ghost}`}>
          Login
        </CtaLink>
        <CtaLink to={ROUTES.signup()} variant="custom" className={`${s.button} ${s.primary}`}>
          Sign Up
        </CtaLink>

        {/* Mobile menu placeholder (hidden on md+) */}
        <button className={s.menuButton} aria-label="Open menu">
          ☰
        </button>
      </div>
    </header>
  );
}
