import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryProvider } from './providers/QueryProvider.tsx'
import App from './App.tsx'
import './index.css'

// Import auth diagnostics for debugging
import './utils/authDiagnostics';
import './utils/autoRunDiagnostics';
import { AuthProvider } from './providers/AuthProvider.tsx'
import './index.css'
// Import R3F setup
import './r3f-setup'
// Redirect global console to centralized logger
import './consoleBridge'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryProvider>
  </React.StrictMode>,
)