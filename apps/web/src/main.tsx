import ReactDOM from 'react-dom/client'
import { QueryProvider } from './providers/QueryProvider.tsx'
import App from './App.tsx'
import './index.css'
// import './utils/authDiagnostics';
// import './utils/autoRunDiagnostics';
import { AuthProvider } from './providers/AuthProvider.tsx'
import './r3f-setup'
// Redirect global console to centralized logger
import './consoleBridge'
// Install lightweight global handlers to suppress noisy storage fetch errors when MinIO is intentionally offline
import './utils/globalErrorHandlers'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GlobalErrorBoundary from './components/GlobalErrorBoundary.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <GlobalErrorBoundary>
    <QueryProvider>
      <AuthProvider>
        <App />
        <ToastContainer />
      </AuthProvider>
    </QueryProvider>
  </GlobalErrorBoundary>,
)
