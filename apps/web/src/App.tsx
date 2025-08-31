function App() {
  return (
    <div className="min-h-screen bg-brand-black text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-brand-gold mb-4">
          Lumea
        </h1>
        <p className="text-brand-stone text-lg">
          AI-powered interior layout generator with explainable spatial reasoning
        </p>
        <div className="mt-8 p-6 bg-brand-plum rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Development Mode</h2>
          <p className="text-sm">
            Web application is running. API and Solver services need to be started.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App