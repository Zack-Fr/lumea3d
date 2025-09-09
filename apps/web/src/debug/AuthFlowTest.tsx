import { authApi } from '../services/authApi'

export function AuthFlowTest() {
  const testAuthFlow = async () => {
    console.log('🔍 Testing frontend auth flow...');
    
    // Log environment
    console.log('🌍 Environment:');
    console.log('  VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('  Computed login URL:', `${import.meta.env.VITE_API_URL || ''}/auth/login`);
    
    try {
      console.log('🔐 Attempting login...');
      const result = await authApi.login({
        email: 'farfar@example.com',
        password: 'password123'
      });
      
      console.log('✅ Login successful!');
      console.log('  User:', result.user);
      console.log('  Token preview:', result.token?.substring(0, 20) + '...');
      console.log('  Has refresh token:', !!result.refreshToken);
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      if (error instanceof Error) {
        console.error('  Error details:', {
          message: error.message,
          stack: error.stack,
          cause: (error as any).cause
        });
      }
    }
  };
  
  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Auth Flow Test</h3>
      <button onClick={testAuthFlow} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Test Login Flow
      </button>
      <p>Open browser console to see detailed logs</p>
    </div>
  );
}