// Decode JWT token to check expiration and contents
const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWZjZWcxdm8wMDAwN2R1OGk1MWNxOTM0IiwiZW1haWwiOiJmYXJmYXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzU3NDEzNTQwLCJleHAiOjE3NTc0MTQ0NDB9.BHMXWyDPAW6WccnYGI4FM_Hzj8JCqUoLPIEBbdnfla0';

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log('JWT Payload:', JSON.stringify(payload, null, 2));
    
    const now = Math.floor(Date.now() / 1000);
    console.log(`Current timestamp: ${now}`);
    console.log(`Token issued at (iat): ${payload.iat}`);
    console.log(`Token expires at (exp): ${payload.exp}`);
    
    if (payload.exp < now) {
      console.log('❌ TOKEN IS EXPIRED!');
      console.log(`Expired ${now - payload.exp} seconds ago`);
    } else {
      console.log('✅ Token is still valid');
      console.log(`Expires in ${payload.exp - now} seconds`);
    }
    
    console.log(`\\nToken details:`);
    console.log(`- User ID: ${payload.sub}`);
    console.log(`- Email: ${payload.email}`);
    console.log(`- Role: ${payload.role}`);
    
  } catch (error) {
    console.error('Error decoding JWT:', error.message);
  }
}

decodeJWT(jwt);