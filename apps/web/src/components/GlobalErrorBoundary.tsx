import React, { Component, ReactNode } from 'react';
import { toast } from 'react-toastify';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Decide whether to trace the error or suppress noisy storage-related traces
    const message = (error && (error as any).message) || '';
    const stack = (errorInfo && errorInfo.componentStack) || '';

    const isStorageFetchError = /public\/storage\/serve|\/public\/storage\/serve|minio|s3/i.test(message + stack);

    if (isStorageFetchError) {
      // Storage is intentionally offline in some environments; show a concise toast and avoid noisy traces
      console.warn('Global Error Boundary: storage fetch failed (suppressed trace)');
      toast.warn('Some assets are unavailable (storage offline). Placeholders will be used.', {
        position: 'top-center',
        autoClose: 5000,
        toastId: 'storage-missing',
      });
    } else {
      // Log the error to console for unexpected cases
      console.error('Global Error Boundary caught an error:', error, errorInfo);

      // Show user-friendly toast notification
      toast.error('Something went wrong. Please refresh the page if the issue persists.', {
        position: "top-center",
        autoClose: 8000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        toastId: 'global-error', // Prevent duplicate toasts
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong</h2>
            <p className="mb-4">The application encountered an unexpected error.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;