import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryProvider } from './providers/QueryProvider.tsx'
import App from './App.tsx'
import './index.css'

// Removed auto-running auth diagnostics to prevent unwanted API calls on landing page
// import './utils/authDiagnostics';
// import './utils/autoRunDiagnostics';
import { AuthProvider } from './providers/AuthProvider.tsx'
// Import R3F setup
import './r3f-setup'
// Redirect global console to centralized logger
import './consoleBridge'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryProvider>,
)
