// Decode JWT payload (just the payload part, not verifying signature)
const token = process.argv[2];
if (!token) {
  console.log('Usage: node decode-jwt.js <token>');
  process.exit(1);
}

try {
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.log('❌ Invalid JWT format - should have 3 parts separated by dots');
    process.exit(1);
  }
  
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  
  console.log('JWT Header:', JSON.stringify(header, null, 2));
  console.log('JWT Payload:', JSON.stringify(payload, null, 2));
  
  // Check expiration
  if (payload.exp) {
    const expDate = new Date(payload.exp * 1000);
    const now = new Date();
    console.log('Expires:', expDate.toISOString());
    console.log('Current:', now.toISOString());
    console.log('Valid:', expDate > now ? '✅ Not expired' : '❌ Expired');
  }
  
} catch (error) {
  console.log('❌ Error decoding JWT:', error.message);
}