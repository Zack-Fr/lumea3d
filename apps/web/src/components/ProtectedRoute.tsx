import { ReactNode } from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth, Role } from '../providers/AuthProvider'
import { ROUTES } from '../app/paths'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRoles?: Role[]
  fallbackPath?: string
}

export function ProtectedRoute({ 
  children, 
  requiredRoles,
  fallbackPath = ROUTES.login()
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-stone">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />
  }

  // Check role requirements if specified
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Access Denied</h1>
          <p className="text-brand-stone mb-6">
            You don't have permission to access this area. Required role: {requiredRoles.join(' or ')}.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 rounded-lg bg-brand-gold text-black font-medium hover:bg-brand-gold/90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}


export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;                             // no effects
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login()} state={{ from: location }} replace />;
  }
  return <Outlet/>;
}


export function GuestOnly() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;                             // no effects
  if (isAuthenticated) {
    const to = (location.state as any)?.from?.pathname || ROUTES.dashboard();
    return <Navigate to={to} replace />;                  // pure redirect
  }
  return <Outlet/>;
}