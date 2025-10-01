import { Outlet } from 'react-router-dom'
// import { useAuth } from '../providers/AuthProvider'

export default function Layout() {
  // const { logout } = useAuth()

  // const handleLogout = () => {
  //   logout()
  //   // Navigation will happen automatically via auth context
  // }

  return (
    <div className="min-h-screen bg-brand-black text-white">
      {/* <nav className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <img src="/brand/lumea_Logo_NoBg.svg" alt="Lumea" className="h-8" />
          </a>
          <div className="flex items-center gap-4">
            <a href={ROUTES.dashboard()} className="text-brand-stone hover:text-white transition-colors">
              Dashboard
            </a>
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-brand-stone">
                  {user.displayName || user.email}
                </span>
                <span className="text-xs bg-brand-plum px-2 py-1 rounded-full">
                  {user.role}
                </span>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-black transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav> */}
      <main>
        <Outlet />
      </main>
    </div>
  )
}