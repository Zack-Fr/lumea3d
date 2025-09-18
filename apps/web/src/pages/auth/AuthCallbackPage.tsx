import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { api } from '@/services/authApi';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const refresh = searchParams.get('refresh');
      
      if (!token) {
        console.error('Missing access token in OAuth callback');
        navigate('/login?error=oauth_failed');
        return;
      }

      try {
        // Store the tokens in localStorage directly
        localStorage.setItem('lumea_auth_token', token);
        if (refresh) {
          localStorage.setItem('lumea_refresh_token', refresh);
        }
        
        // Fetch user info with the access token
        const userResponse = await api.getProfile(token);
        
        // Store user info
        localStorage.setItem('lumea_auth_user', JSON.stringify(userResponse));
        
        // Force a page reload to trigger AuthProvider re-initialization
        window.location.href = '/app/dashboard';
      } catch (error) {
        console.error('Failed to process OAuth callback:', error);
        navigate('/login?error=oauth_failed');
      }
    };

    // If already authenticated, redirect immediately
    if (isAuthenticated) {
      navigate('/app/dashboard');
      return;
    }

    handleCallback();
  }, [searchParams, navigate, isAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-lg">Completing sign-in...</p>
      </div>
    </div>
  );
}