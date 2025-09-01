const axios = require('axios');
const { performance } = require('perf_hooks');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

class AuthSecurityTester {
  constructor() {
    this.testResults = [];
    this.validJWT = null;
  }

  async runTest(testName, testFunction) {
    console.log(`\n🔒 Running: ${testName}`);
    const startTime = performance.now();
    
    try {
      const result = await testFunction();
      const endTime = performance.now();
      
      this.testResults.push({
        test: testName,
        status: 'PASS',
        duration: Math.round(endTime - startTime),
        details: result
      });
      
      console.log(`✅ ${testName} - PASSED (${Math.round(endTime - startTime)}ms)`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      this.testResults.push({
        test: testName,
        status: 'FAIL', 
        duration: Math.round(endTime - startTime),
        error: error.message
      });
      
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
      throw error;
    }
  }

  // Get valid JWT for authenticated tests
  async getValidJWT() {
    if (this.validJWT) return this.validJWT;
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'admin@example.com',
        password: 'admin123'
      });
      
      this.validJWT = response.data.access_token;
      return this.validJWT;
    } catch (error) {
      throw new Error('Failed to get valid JWT for testing');
    }
  }

  // Test 1: Brute Force Protection
  async testBruteForceProtection() {
    return this.runTest('Brute Force Protection', async () => {
      const attempts = [];
      
      for (let i = 0; i < 10; i++) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@example.com',
            password: 'wrongpassword'
          });
          attempts.push({ attempt: i + 1, status: 'allowed' });
        } catch (error) {
          attempts.push({ 
            attempt: i + 1, 
            status: error.response?.status || 'blocked',
            message: error.response?.data?.message
          });
        }
      }
      
      // Check if rate limiting kicks in
      const blockedAttempts = attempts.filter(a => a.status === 429 || a.status === 'blocked');
      
      if (blockedAttempts.length === 0) {
        throw new Error('No rate limiting detected after 10 failed attempts');
      }
      
      return {
        totalAttempts: attempts.length,
        blockedAttempts: blockedAttempts.length,
        message: 'Rate limiting working correctly'
      };
    });
  }

  // Test 2: JWT Token Validation
  async testJWTValidation() {
    return this.runTest('JWT Token Validation', async () => {
      const tests = [];
      
      // Test with invalid token
      try {
        await axios.get(`${API_BASE_URL}/scenes`, {
          headers: { Authorization: 'Bearer invalid_token' }
        });
        tests.push({ test: 'invalid_token', result: 'FAIL - should have been rejected' });
      } catch (error) {
        if (error.response?.status === 401) {
          tests.push({ test: 'invalid_token', result: 'PASS - correctly rejected' });
        } else {
          tests.push({ test: 'invalid_token', result: `FAIL - unexpected status: ${error.response?.status}` });
        }
      }
      
      // Test with expired token (simulate)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDB9.invalid';
      
      try {
        await axios.get(`${API_BASE_URL}/scenes`, {
          headers: { Authorization: `Bearer ${expiredToken}` }
        });
        tests.push({ test: 'expired_token', result: 'FAIL - should have been rejected' });
      } catch (error) {
        if (error.response?.status === 401) {
          tests.push({ test: 'expired_token', result: 'PASS - correctly rejected' });
        } else {
          tests.push({ test: 'expired_token', result: `FAIL - unexpected status: ${error.response?.status}` });
        }
      }
      
      // Test with no token
      try {
        await axios.get(`${API_BASE_URL}/scenes`);
        tests.push({ test: 'no_token', result: 'FAIL - should have been rejected' });
      } catch (error) {
        if (error.response?.status === 401) {
          tests.push({ test: 'no_token', result: 'PASS - correctly rejected' });
        } else {
          tests.push({ test: 'no_token', result: `FAIL - unexpected status: ${error.response?.status}` });
        }
      }
      
      return tests;
    });
  }

  // Test 3: Authorization Bypass Attempts
  async testAuthorizationBypass() {
    return this.runTest('Authorization Bypass', async () => {
      const jwt = await this.getValidJWT();
      const tests = [];
      
      // Try to access admin endpoints
      const adminEndpoints = [
        '/admin/users',
        '/admin/scenes',
        '/admin/assets'
      ];
      
      for (const endpoint of adminEndpoints) {
        try {
          const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${jwt}` }
          });
          
          if (response.status === 200) {
            tests.push({ 
              endpoint, 
              result: 'ACCESSIBLE',
              note: 'Check if this should be admin-only'
            });
          }
        } catch (error) {
          if (error.response?.status === 403) {
            tests.push({ 
              endpoint, 
              result: 'PROPERLY_PROTECTED',
              status: 403
            });
          } else if (error.response?.status === 404) {
            tests.push({ 
              endpoint, 
              result: 'NOT_FOUND',
              status: 404
            });
          } else {
            tests.push({ 
              endpoint, 
              result: 'UNEXPECTED_ERROR',
              status: error.response?.status,
              message: error.message
            });
          }
        }
      }
      
      return tests;
    });
  }

  // Test 4: SQL Injection Attempts
  async testSQLInjection() {
    return this.runTest('SQL Injection Protection', async () => {
      const jwt = await this.getValidJWT();
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "1; DELETE FROM scenes WHERE 1=1 --",
        "admin'--",
        "admin'/**/OR/**/1=1#"
      ];
      
      const tests = [];
      
      for (const payload of sqlInjectionPayloads) {
        try {
          // Test login endpoint
          const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: payload,
            password: payload
          });
          
          tests.push({
            payload,
            endpoint: '/auth/login',
            result: 'VULNERABLE - returned success',
            status: loginResponse.status
          });
        } catch (error) {
          if (error.response?.status === 400 || error.response?.status === 401) {
            tests.push({
              payload,
              endpoint: '/auth/login',
              result: 'PROTECTED - correctly rejected',
              status: error.response.status
            });
          } else {
            tests.push({
              payload,
              endpoint: '/auth/login',
              result: 'UNEXPECTED_ERROR',
              status: error.response?.status,
              message: error.message
            });
          }
        }
        
        // Test scene query with potential injection
        try {
          const response = await axios.get(`${API_BASE_URL}/scenes?search=${encodeURIComponent(payload)}`, {
            headers: { Authorization: `Bearer ${jwt}` }
          });
          
          tests.push({
            payload,
            endpoint: '/scenes (search)',
            result: 'HANDLED - returned response',
            status: response.status,
            note: 'Check if response contains unexpected data'
          });
        } catch (error) {
          tests.push({
            payload,
            endpoint: '/scenes (search)',
            result: 'ERROR_OCCURRED',
            status: error.response?.status,
            message: error.message
          });
        }
      }
      
      return tests;
    });
  }

  // Test 5: XSS Protection
  async testXSSProtection() {
    return this.runTest('XSS Protection', async () => {
      const jwt = await this.getValidJWT();
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '"><script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '&lt;script&gt;alert("XSS")&lt;/script&gt;'
      ];
      
      const tests = [];
      
      for (const payload of xssPayloads) {
        try {
          // Test creating a scene with XSS payload
          const response = await axios.post(`${API_BASE_URL}/scenes`, {
            name: payload,
            description: payload,
            data: { malicious: payload }
          }, {
            headers: { Authorization: `Bearer ${jwt}` }
          });
          
          // Check if payload was sanitized
          const responseData = JSON.stringify(response.data);
          const containsRawPayload = responseData.includes(payload);
          
          tests.push({
            payload,
            endpoint: '/scenes (create)',
            result: containsRawPayload ? 'VULNERABLE - payload not sanitized' : 'PROTECTED - payload sanitized',
            status: response.status
          });
        } catch (error) {
          tests.push({
            payload,
            endpoint: '/scenes (create)',
            result: 'ERROR_OCCURRED',
            status: error.response?.status,
            message: error.message
          });
        }
      }
      
      return tests;
    });
  }

  // Test 6: CORS Configuration
  async testCORSConfiguration() {
    return this.runTest('CORS Configuration', async () => {
      const tests = [];
      
      // Test with different origins
      const testOrigins = [
        'http://malicious-site.com',
        'https://evil.com',
        'http://localhost:3000', // Should be allowed
        'null'
      ];
      
      for (const origin of testOrigins) {
        try {
          const response = await axios.get(`${API_BASE_URL}/health`, {
            headers: { 
              'Origin': origin,
              'Access-Control-Request-Method': 'GET'
            }
          });
          
          const corsHeader = response.headers['access-control-allow-origin'];
          
          tests.push({
            origin,
            corsHeader,
            result: corsHeader === '*' ? 'PERMISSIVE - allows all origins' : 'CONFIGURED',
            status: response.status
          });
        } catch (error) {
          tests.push({
            origin,
            result: 'BLOCKED_OR_ERROR',
            status: error.response?.status,
            message: error.message
          });
        }
      }
      
      return tests;
    });
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n📊 SECURITY TEST RESULTS SUMMARY');
    console.log('================================');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    console.log('\n📋 DETAILED RESULTS:');
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.test} (${result.duration}ms)`);
      
      if (result.status === 'FAIL') {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    // Security recommendations
    console.log('\n🔐 SECURITY RECOMMENDATIONS:');
    console.log('• Implement rate limiting on authentication endpoints');
    console.log('• Use helmet.js for security headers');
    console.log('• Validate and sanitize all user inputs');
    console.log('• Implement proper CORS configuration');
    console.log('• Regular security audits and penetration testing');
    console.log('• Monitor for suspicious authentication patterns');
    
    return {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: Math.round((passedTests / totalTests) * 100)
      },
      results: this.testResults
    };
  }
}

// Main execution
async function runSecurityTests() {
  const tester = new AuthSecurityTester();
  
  try {
    console.log('🔒 Starting Authentication & Authorization Security Tests');
    console.log('=======================================================');
    
    // Run all security tests
    await tester.testBruteForceProtection().catch(() => {}); // Continue on failure
    await tester.testJWTValidation().catch(() => {});
    await tester.testAuthorizationBypass().catch(() => {});
    await tester.testSQLInjection().catch(() => {});
    await tester.testXSSProtection().catch(() => {});
    await tester.testCORSConfiguration().catch(() => {});
    
    // Generate final report
    const report = tester.generateReport();
    
    // Write report to file
    const fs = require('fs');
    fs.writeFileSync(
      './security-test-results.json', 
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n💾 Results saved to security-test-results.json');
    
    if (report.summary.failed > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Security testing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSecurityTests();
}

module.exports = { AuthSecurityTester };