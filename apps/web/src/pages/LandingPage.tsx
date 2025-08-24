export default function LandingPage(){
  return (
    <div className="min-h-screen bg-brand-black text-white">
      <header className="relative">
        <div className="absolute inset-0 bg-brand-plum/60 blur-[80px]" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-4 py-24 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <img src="/brand/wordmark.svg" alt="Lumea" className="h-12 mb-6" />
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              Room layouts that explain themselves.
            </h1>
            <p className="mt-4 text-brand-stone">
              Constraint-guided placement with a clear rule checklist and a simple 3D viewer.
            </p>
            <div className="mt-8 flex gap-3">
              <a href="/app/dashboard"
                 className="px-5 py-3 rounded-2xl bg-brand-gold text-black font-medium">
                Try the Demo
              </a>
              <a href="#how" className="px-5 py-3 rounded-2xl border border-brand-gold text-brand-gold">
                How it works
              </a>
            </div>
          </div>
          <div className="h-[340px] md:h-[420px] rounded-2xl border border-white/10 bg-gradient-to-br from-brand-plum/50 to-brand-black/60" />
        </div>
      </header>

      <section id="how" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-semibold mb-4">From rules to a layout</h2>
        <p className="text-brand-stone">
          Rules → Solver (time-boxed) → Best-of-3 → Checks → Human insight.
        </p>
      </section>
    </div>
  )
}
