/**
 * Test Authentication Expiry Flow
 * This utility can be used to test the authentication expiry handling
 * in development or for debugging purposes
 */

import { handleApiError, isTokenExpired } from './apiErrorHandler';

/**
 * Simulate an expired token error
 * Call this function to test the auth expiry flow
 */
export function simulateAuthExpiry(context: string = 'test') {
  console.log('TEST_AUTH_EXPIRY: Simulating authentication expiry');
  
  const fakeError = {
    statusCode: 401,
    message: 'Token has expired',
    context: context
  };
  
  handleApiError(fakeError, context);
}

/**
 * Test token expiry detection with various token states
 */
export function testTokenExpiryDetection() {
  console.log('TEST_TOKEN_EXPIRY: Testing token expiry detection');
  
  // Test cases
  const testCases = [
    { name: 'Null token', token: null, expectedExpired: true },
    { name: 'Empty token', token: '', expectedExpired: true },
    { name: 'Invalid JWT format', token: 'invalid.token', expectedExpired: true },
    { name: 'Malformed JWT', token: 'header.payload', expectedExpired: true },
  ];
  
  testCases.forEach(({ name, token, expectedExpired }) => {
    try {
      const isExpired = token ? isTokenExpired(token) : true;
      const result = isExpired === expectedExpired ? 'PASS' : 'FAIL';
      console.log(`${result} ${name}: Expected ${expectedExpired}, got ${isExpired}`);
    } catch (error) {
      console.log(`ERROR ${name}:`, error);
    }
  });
}

/**
 * Create a test JWT token with specific expiry
 * This is for testing purposes only
 */
export function createTestJWT(expiresInSeconds: number = -300): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: 'test-user-id',
    email: 'test@example.com',
    role: 'DESIGNER',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds // Default: expired 5 minutes ago
  };
  
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'test-signature';
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Test the complete auth expiry flow with a fake expired token
 */
export function testCompleteAuthExpiry() {
  console.log('TEST_COMPLETE_AUTH_EXPIRY: Testing complete auth expiry flow');
  
  // Create an expired test token
  const expiredToken = createTestJWT(-300); // Expired 5 minutes ago
  
  console.log('Generated expired token:', expiredToken.substring(0, 50) + '...');
  
  // Test token expiry detection
  const isExpired = isTokenExpired(expiredToken);
  console.log('Token expired check:', isExpired ? 'Correctly detected as expired' : '❌ Not detected as expired');
  
  // Simulate API error with this expired token
  if (isExpired) {
    simulateAuthExpiry('completeTest');
  }
}

/**
 * Utility to add test buttons to the UI for manual testing
 * Call this in development to add test buttons to the page
 */
export function addTestButtonsToPage() {
  if (import.meta.env.MODE !== 'development') {
    console.warn('Test buttons only available in development mode');
    return;
  }
  
  const testContainer = document.createElement('div');
  testContainer.style.position = 'fixed';
  testContainer.style.top = '10px';
  testContainer.style.right = '10px';
  testContainer.style.zIndex = '9999';
  testContainer.style.background = 'rgba(0, 0, 0, 0.8)';
  testContainer.style.padding = '10px';
  testContainer.style.borderRadius = '5px';
  testContainer.style.color = 'white';
  testContainer.style.fontSize = '12px';
  
  const title = document.createElement('div');
  title.textContent = 'Auth Test Controls';
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '10px';
  testContainer.appendChild(title);
  
  const simulateBtn = document.createElement('button');
  simulateBtn.textContent = 'Simulate Auth Expiry';
  simulateBtn.style.margin = '2px';
  simulateBtn.style.padding = '5px 10px';
  simulateBtn.onclick = () => simulateAuthExpiry('manualTest');
  testContainer.appendChild(simulateBtn);
  
  const testBtn = document.createElement('button');
  testBtn.textContent = 'Test Token Detection';
  testBtn.style.margin = '2px';
  testBtn.style.padding = '5px 10px';
  testBtn.onclick = () => testTokenExpiryDetection();
  testContainer.appendChild(testBtn);
  
  const completeBtn = document.createElement('button');
  completeBtn.textContent = 'Test Complete Flow';
  completeBtn.style.margin = '2px';
  completeBtn.style.padding = '5px 10px';
  completeBtn.onclick = () => testCompleteAuthExpiry();
  testContainer.appendChild(completeBtn);
  
  document.body.appendChild(testContainer);
  
  console.log('🧪 TEST_AUTH_EXPIRY: Test buttons added to page');
}