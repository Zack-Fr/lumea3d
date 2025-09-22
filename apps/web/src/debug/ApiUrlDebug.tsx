import React from 'react';
import { toast } from 'react-toastify';

const ApiUrlDebug: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  const testApiConnection = async () => {
    try {
      console.log('Testing API connection to:', apiUrl);
      const response = await fetch(`${apiUrl}/monitoring/health`);
      const data = await response.json();
      console.log('API Response:', data);
      toast.success(`API Connection Success!\nURL: ${apiUrl}\nStatus: ${response.status}`);
    } catch (error) {
      console.error('API Connection Failed:', error);
      const errorMessage = typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : String(error);
      toast.error(`API Connection Failed!\nURL: ${apiUrl}\nError: ${errorMessage}`);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      left: '20px', 
      background: 'white', 
      padding: '20px', 
      border: '2px solid red',
      borderRadius: '8px',
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <h3>API Debug Info</h3>
      <p><strong>VITE_API_URL:</strong> {apiUrl || 'NOT SET'}</p>
      <p><strong>Current URL:</strong> {window.location.href}</p>
      <button 
        onClick={testApiConnection}
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Test API Connection
      </button>
    </div>
  );
};

export default ApiUrlDebug;