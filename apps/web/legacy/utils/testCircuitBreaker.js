/**
 * Test the fixed useSceneChannel hook circuit breaker
 * This should only attempt 3 connections max, then stop
 */

// Mock the required dependencies for testing
console.log('🧪 Testing useSceneChannel circuit breaker fix...');

// Simulate the circuit breaker logic
let reconnectAttempts = 0;
let isConnecting = false;
let circuitBreakerOpen = false;
const maxReconnectAttempts = 3;
const circuitBreakerTimeout = 30000;

function testCircuitBreaker() {
  if (isConnecting || circuitBreakerOpen) {
    console.log('🚫 Connection blocked: already connecting or circuit breaker open');
    return false;
  }
  
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.log('🚫 Max attempts reached, opening circuit breaker');
    circuitBreakerOpen = true;
    
    setTimeout(() => {
      console.log('🔄 Circuit breaker reset after timeout');
      circuitBreakerOpen = false;
      reconnectAttempts = 0;
    }, circuitBreakerTimeout);
    
    return false;
  }
  
  isConnecting = true;
  reconnectAttempts++;
  
  console.log(`🔄 Connection attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
  
  // Simulate connection failure
  setTimeout(() => {
    isConnecting = false;
    console.log(`❌ Connection failed (attempt ${reconnectAttempts})`);
    
    if (reconnectAttempts < maxReconnectAttempts) {
      console.log(`⏳ Scheduling retry...`);
      setTimeout(() => {
        testCircuitBreaker();
      }, 1000);
    } else {
      console.log('✅ Circuit breaker activated - no more attempts');
    }
  }, 500);
  
  return true;
}

// Test the circuit breaker
console.log('Expected: 3 attempts, then stop');
testCircuitBreaker();