// Debug environment variables in frontend
console.log('🔍 Frontend Environment Debug');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('VITE_USE_MOCK_API:', import.meta.env.VITE_USE_MOCK_API);
console.log('All Vite env:', import.meta.env);

// Test the API URL that authApi would use
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
console.log('Computed API_BASE_URL:', API_BASE_URL);
console.log('Login URL would be:', `${API_BASE_URL}/auth/login`);

export function EnvDebug() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Environment Debug</h2>
      <p><strong>VITE_API_URL:</strong> {import.meta.env.VITE_API_URL || 'undefined'}</p>
      <p><strong>VITE_USE_MOCK_API:</strong> {import.meta.env.VITE_USE_MOCK_API || 'undefined'}</p>
      <p><strong>Login URL:</strong> {(import.meta.env.VITE_API_URL || '') + '/auth/login'}</p>
      <p><strong>All ENV:</strong> {JSON.stringify(import.meta.env, null, 2)}</p>
    </div>
  );
}