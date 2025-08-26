import React from "react";
import { Link } from "react-router-dom";

type CtaLinkProps = {
  to: string;
  children: React.ReactNode;
  className?: string;
  /**
   * 'primary' and 'outline' keep the previous landing-hero defaults.
   * 'custom' lets you style entirely via CSS Modules (Navbar use-case).
   */
  variant?: "primary" | "outline" | "custom";
};

export const CtaLink = ({
  to,
  children,
  className = "",
  variant = "primary",
}: CtaLinkProps) => {
  const isAnchor = to.startsWith("#") || to.includes("#");
  const isExternal = to.startsWith("http");

  const base =
    variant === "custom"
      ? "" // no default styles; CSS Module will handle everything
      : "inline-flex items-center justify-center px-6 py-3 rounded-xl text-lg transition-all duration-300 group";

  const styles =
    variant === "custom"
      ? ""
      : variant === "primary"
      ? "bg-[var(--glass-yellow)] text-[var(--glass-black)] hover:bg-[var(--glass-yellow-dark)] glow-yellow hover:glow-yellow-strong"
      : "glass border border-[var(--glass-border-light)] text-white hover:bg-white/10";

  const classes = [base, styles, className].filter(Boolean).join(" ");

  if (isExternal || isAnchor) {
    return (
      <a href={to} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={classes}>
      {children}
    </Link>
  );
};
