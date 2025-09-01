const axios = require('axios');
const { performance } = require('perf_hooks');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

class QuickSecurityTester {
  constructor() {
    this.results = [];
  }

  async runTest(name, testFn) {
    console.log(`\n🔒 Testing: ${name}`);
    const start = performance.now();
    
    try {
      const result = await testFn();
      const duration = Math.round(performance.now() - start);
      
      this.results.push({
        name,
        status: 'PASS',
        duration,
        result
      });
      
      console.log(`✅ ${name} - PASSED (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      
      this.results.push({
        name,
        status: 'FAIL',
        duration,
        error: error.message
      });
      
      console.log(`❌ ${name} - FAILED: ${error.message}`);
      return null;
    }
  }

  async getValidJWT() {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'admin@lumea.com',
        password: 'admin123'
      });
      return response.data.access_token;
    } catch (error) {
      throw new Error(`Failed to get JWT: ${error.response?.data?.message || error.message}`);
    }
  }

  async testBasicSecurity() {
    console.log('🔒 QUICK SECURITY VALIDATION TESTS');
    console.log('================================');

    // Test 1: Valid authentication works
    await this.runTest('Valid Authentication', async () => {
      const token = await this.getValidJWT();
      if (!token) throw new Error('No token received');
      return { tokenReceived: true, tokenLength: token.length };
    });

    // Test 2: Invalid credentials rejected
    await this.runTest('Invalid Credentials Rejection', async () => {
      try {
        await axios.post(`${API_BASE_URL}/auth/login`, {
          email: 'admin@lumea.com',
          password: 'wrongpassword'
        });
        throw new Error('Invalid credentials were accepted');
      } catch (error) {
        if (error.response?.status === 401) {
          return { properly_rejected: true, status: 401 };
        }
        throw error;
      }
    });

    // Test 3: Protected endpoint requires authentication
    await this.runTest('Protected Endpoint Authentication', async () => {
      try {
        await axios.get(`${API_BASE_URL}/users/me`);
        throw new Error('Protected endpoint accessible without token');
      } catch (error) {
        if (error.response?.status === 401) {
          return { properly_protected: true, status: 401 };
        }
        throw error;
      }
    });

    // Test 4: Valid token allows access
    await this.runTest('Valid Token Access', async () => {
      const token = await this.getValidJWT();
      const response = await axios.get(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      
      return { 
        access_granted: true, 
        status: response.status,
        user_email: response.data?.email 
      };
    });

    // Test 5: Rate limiting check
    await this.runTest('Rate Limiting Protection', async () => {
      const requests = [];
      const startTime = Date.now();
      
      // Make 10 rapid requests to login endpoint
      for (let i = 0; i < 10; i++) {
        requests.push(
          axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'nonexistent@test.com',
            password: 'fake'
          }).catch(err => ({
            status: err.response?.status,
            rateLimited: err.response?.status === 429
          }))
        );
      }
      
      const results = await Promise.all(requests);
      const rateLimited = results.some(r => r.rateLimited);
      const duration = Date.now() - startTime;
      
      return {
        requests_made: 10,
        rate_limiting_detected: rateLimited,
        duration_ms: duration,
        note: rateLimited ? 'Rate limiting working' : 'No rate limiting detected'
      };
    });

    // Test 6: CORS configuration
    await this.runTest('CORS Headers', async () => {
      const response = await axios.get(`${API_BASE_URL}/health`, {
        headers: { 'Origin': 'http://localhost:3000' }
      });
      
      const corsHeader = response.headers['access-control-allow-origin'];
      
      return {
        cors_header_present: !!corsHeader,
        cors_value: corsHeader,
        allows_localhost: corsHeader === '*' || corsHeader?.includes('localhost')
      };
    });

    // Test 7: Security headers check
    await this.runTest('Security Headers', async () => {
      const response = await axios.get(`${API_BASE_URL}/health`);
      const headers = response.headers;
      
      return {
        helmet_csp: !!headers['content-security-policy'],
        x_frame_options: !!headers['x-frame-options'],
        x_content_type_options: !!headers['x-content-type-options'],
        x_dns_prefetch_control: !!headers['x-dns-prefetch-control'],
        referrer_policy: !!headers['referrer-policy']
      };
    });

    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 SECURITY TEST SUMMARY');
    console.log('========================');
    
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
    
    const criticalFailures = this.results.filter(r => 
      r.status === 'FAIL' && 
      (r.name.includes('Authentication') || r.name.includes('Protected'))
    );
    
    if (criticalFailures.length > 0) {
      console.log('\n🚨 CRITICAL SECURITY ISSUES:');
      criticalFailures.forEach(f => {
        console.log(`• ${f.name}: ${f.error}`);
      });
    } else {
      console.log('\n✅ No critical security failures detected');
    }
    
    console.log('\n🔐 SECURITY STATUS:');
    if (passed === total) {
      console.log('🏆 EXCELLENT - All security tests passed');
    } else if (passed >= total * 0.8) {
      console.log('👍 GOOD - Most security tests passed');
    } else if (criticalFailures.length === 0) {
      console.log('⚠️  FAIR - Some issues but core security intact');
    } else {
      console.log('🚨 POOR - Critical security vulnerabilities detected');
    }
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync('./quick-security-results.json', JSON.stringify({
      summary: { total, passed, failed, successRate: Math.round((passed / total) * 100) },
      results: this.results,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log('\n💾 Results saved to quick-security-results.json');
    
    return passed === total;
  }
}

// Run the tests
async function main() {
  const tester = new QuickSecurityTester();
  
  try {
    const success = await tester.testBasicSecurity();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Security testing failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { QuickSecurityTester };