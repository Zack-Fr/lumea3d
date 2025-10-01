import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invitationsApi } from '@/services/invitationsApi';

interface InvitationDetails {
  id: string;
  projectName: string;
  inviterName: string;
  email: string;
  isValid: boolean;
  isExpired: boolean;
  isAccepted: boolean;
}

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    const validateInvitation = async () => {
      try {
        // This would need to be implemented in the backend
        const response = await invitationsApi.validateInvitationToken(token);
        setInvitation(response);
      } catch (err) {
        console.error('Failed to validate invitation:', err);
        setError('Invalid or expired invitation link');
      } finally {
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  const handleAcceptWithGoogle = () => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.location.href = `${apiBaseUrl}/auth/google/invite/${token}`;
  };

  const handleSignInManually = () => {
    navigate(`/login?invitation=${token}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold mx-auto mb-4"></div>
          <p className="text-brand-stone">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation || !invitation.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-black">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-4">
            {invitation?.isExpired ? 'Invitation Expired' : 'Invalid Invitation'}
          </h1>
          <p className="text-brand-stone mb-6">
            {error || 'This invitation link is no longer valid.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-lg bg-brand-gold text-brand-black font-medium hover:bg-brand-gold/90 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (invitation.isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-black">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-4">
            Already Accepted
          </h1>
          <p className="text-brand-stone mb-6">
            You have already accepted this invitation.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-lg bg-brand-gold text-brand-black font-medium hover:bg-brand-gold/90 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-black">
      <div className="max-w-md mx-auto p-6 bg-brand-gray-900 rounded-lg border border-brand-gray-800">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-brand-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📨</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">
            You're Invited!
          </h1>
          <p className="text-brand-stone">
            <span className="text-brand-gold font-medium">{invitation.inviterName}</span> has invited you to collaborate on{' '}
            <span className="text-brand-gold font-medium">{invitation.projectName}</span>
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAcceptWithGoogle}
            className="w-full px-6 py-3 rounded-lg bg-white text-gray-900 font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-brand-gray-900 text-brand-stone">or</span>
            </div>
          </div>

          <button
            onClick={handleSignInManually}
            className="w-full px-6 py-3 rounded-lg border border-brand-gray-700 text-brand-stone font-medium hover:bg-brand-gray-800 transition-colors"
          >
            Sign in with existing account
          </button>
        </div>

        <p className="text-xs text-brand-stone mt-6 text-center">
          By accepting this invitation, you agree to join the collaboration project.
        </p>
      </div>
    </div>
  );
}