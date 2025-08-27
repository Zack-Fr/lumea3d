// src/app/guards.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { ROUTES } from "@/app/paths";

export function GuestOnly() {
  const loc = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;                       // or a spinner
  if (isAuthenticated) {
    // Redirect authenticated users away from /login|/signup
    const to = (loc.state as any)?.from?.pathname || ROUTES.dashboard();
    return <Navigate to={to} replace />;
  }
  return <Outlet />;
}

export function Protected() {
  const loc = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login()} state={{ from: loc }} replace />;
  }
  return <Outlet />;
}
