import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { QueryProvider } from './providers/QueryProvider.tsx'
import { AuthProvider } from './providers/AuthProvider.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryProvider>
  </React.StrictMode>,
)