import { useState } from 'react'

export function DemoInfo() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 bg-brand-plum/90 backdrop-blur-sm border border-brand-gold/30 rounded-lg p-4 max-w-sm z-50">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-brand-gold">Demo Mode</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-brand-stone hover:text-white text-sm"
        >
          ×
        </button>
      </div>
      <p className="text-xs text-brand-stone mb-2">
        Use these credentials to test the authentication:
      </p>
      <div className="text-xs space-y-1">
        <div>
          <strong>Email:</strong> demo@lumea.com
        </div>
        <div>
          <strong>Password:</strong> demo123
        </div>
      </div>
      <p className="text-xs text-brand-stone/70 mt-2">
        Or create a new account with any email.
      </p>
    </div>
  )
}