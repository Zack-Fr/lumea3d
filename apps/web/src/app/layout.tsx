import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-brand-black text-white">
      <nav className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <img src="/brand/lumea_Logo_NoBg.svg" alt="Lumea" className="h-8" />
          </a>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-brand-stone hover:text-white transition-colors">
              Dashboard
            </a>
            <a href="/auth/logout" className="px-4 py-2 rounded-lg border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-black transition-colors">
              Sign Out
            </a>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}