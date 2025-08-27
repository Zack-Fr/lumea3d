export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <button className="px-4 py-2 rounded-lg bg-brand-gold text-black font-medium hover:bg-brand-gold/90 transition-colors">
          New Project
        </button>
      </div>
      
      <div className="grid gap-6">
        <div className="p-6 rounded-2xl border border-white/10 bg-brand-plum/20">
          <h2 className="text-xl font-semibold mb-4">Recent Projects</h2>
          <p className="text-brand-stone">No projects yet. Create your first project to get started.</p>
        </div>
      </div>
    </div>
  )
}