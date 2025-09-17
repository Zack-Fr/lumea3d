const jwt = require('jsonwebtoken');

// Use the EXACT token from our test
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWY4Y3I1bDkwMDAwN2Rtd3Z6enhsanhpIiwiZW1haWwiOiJtb21vQGV4YW1wbGUuY29tIiwicm9sZSI6IkNMSUVOVCIsImlhdCI6MTc1NzQxMTk0MywiZXhwIjoxNzU3NDEyODQzfQ.qkFkiek5VLNoReYsFpdrK8GbLwQXbevxEvuH9QK76hY';

// Use the EXACT secret from .env
const secret = '4ac6ca5335aff1bd81b6a2ea19982d56cbc6dc0370bccc8a44a0ec326ec4c533';

console.log('=== JWT TOKEN VALIDATION DEBUG ===');
console.log('Token:', token);
console.log('Secret:', secret);
console.log('\n=== TOKEN VERIFICATION ===');

try {
    // Verify with our secret
    const decoded = jwt.verify(token, secret);
    console.log('✅ Token verification SUCCESS');
    console.log('Decoded payload:', JSON.stringify(decoded, null, 2));
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    console.log('\n=== EXPIRATION CHECK ===');
    console.log('Current timestamp:', now);
    console.log('Token exp:', decoded.exp);
    console.log('Is expired?', now > decoded.exp);
    
    if (now > decoded.exp) {
        console.log('❌ TOKEN IS EXPIRED!');
        console.log('Expired by:', now - decoded.exp, 'seconds');
    } else {
        console.log('✅ Token is still valid');
        console.log('Expires in:', decoded.exp - now, 'seconds');
    }
    
} catch (error) {
    console.log('❌ Token verification FAILED');
    console.log('Error:', error.message);
}

// Also try to decode without verification to see payload
console.log('\n=== TOKEN DECODE (NO VERIFICATION) ===');
try {
    const decoded = jwt.decode(token, { complete: true });
    console.log('Header:', decoded.header);
    console.log('Payload:', decoded.payload);
} catch (error) {
    console.log('❌ Token decode failed:', error.message);
}