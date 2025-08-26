import Hero from '@/marketing/Hero'
// import Carousel from '@/marketing/Carousel'
import Footer from '@/marketing/Footer'
import Navbar from '@/marketing/Navbar'

export default function LandingPage(){
  return (
    <div className="min-h-screen bg-brand-black text-white">
      <Navbar />
      <Hero />
    {/* <Carousel items={[
          { title: 'Explainable rules', text: 'See exactly why each placement was chosen.', tag: 'XAI' },
          { title: 'Fast iterations', text: 'Best-of-3 results under 8s p95.', tag: 'Speed' },
          { title: 'View-only sessions', text: 'Share live camera + chat, safely.', tag: 'Collab' },
        ]}/> */}

      {/* <section id="how" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-semibold mb-4">From rules to a layout</h2>
        <p className="text-brand-stone">
          Rules → Solver (time-boxed) → Best-of-3 → Checks → Human insight.
        </p>
      </section> */}
      <Footer />
    </div>
  )
}
