const { AuthSecurityTester } = require('./auth-security-test');
const { InputValidationTester } = require('./input-validation-test');
const fs = require('fs');
const { performance } = require('perf_hooks');

class SecurityTestSuite {
  constructor() {
    this.results = {
      summary: {
        totalTestSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        startTime: new Date().toISOString(),
        endTime: null,
        duration: 0
      },
      suites: []
    };
  }

  async runTestSuite(name, tester, testMethods) {
    console.log(`\n🔐 Running ${name} Test Suite`);
    console.log('='.repeat(50));
    
    const startTime = performance.now();
    let suiteResult = {
      name,
      status: 'PASS',
      tests: [],
      duration: 0,
      errors: []
    };
    
    try {
      // Run each test method
      for (const method of testMethods) {
        try {
          await tester[method]();
          suiteResult.tests.push({ method, status: 'PASS' });
        } catch (error) {
          suiteResult.tests.push({ 
            method, 
            status: 'FAIL', 
            error: error.message 
          });
          suiteResult.errors.push(error.message);
          suiteResult.status = 'FAIL';
        }
      }
      
      const endTime = performance.now();
      suiteResult.duration = Math.round(endTime - startTime);
      
      // Get detailed results from tester
      const report = tester.generateReport();
      suiteResult.detailedResults = report;
      
      this.results.suites.push(suiteResult);
      
      if (suiteResult.status === 'PASS') {
        this.results.summary.passedSuites++;
        console.log(`✅ ${name} Suite - PASSED`);
      } else {
        this.results.summary.failedSuites++;
        console.log(`❌ ${name} Suite - FAILED`);
      }
      
    } catch (error) {
      suiteResult.status = 'FAIL';
      suiteResult.errors.push(error.message);
      this.results.suites.push(suiteResult);
      this.results.summary.failedSuites++;
      console.log(`❌ ${name} Suite - CRITICAL FAILURE: ${error.message}`);
    }
    
    this.results.summary.totalTestSuites++;
  }

  async runAllSecurityTests() {
    const overallStartTime = performance.now();
    
    console.log('🔒 COMPREHENSIVE SECURITY TEST SUITE');
    console.log('===================================');
    console.log('Testing authentication, authorization, and input validation security...\n');
    
    try {
      // Check if API is running
      const axios = require('axios');
      const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
      
      try {
        await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ API is running and accessible');
      } catch (error) {
        console.log('⚠️  API health check failed - continuing with tests anyway');
      }
      
      // Authentication & Authorization Security Tests
      const authTester = new AuthSecurityTester();
      await this.runTestSuite('Authentication & Authorization', authTester, [
        'testBruteForceProtection',
        'testJWTValidation', 
        'testAuthorizationBypass',
        'testSQLInjection',
        'testXSSProtection',
        'testCORSConfiguration'
      ]);
      
      // Input Validation Security Tests
      const inputTester = new InputValidationTester();
      await this.runTestSuite('Input Validation', inputTester, [
        'testFileUploadValidation',
        'testInputLengthValidation',
        'testDataTypeValidation',
        'testJSONValidation',
        'testSpecialCharacterHandling',
        'testParameterPollution'
      ]);
      
      const overallEndTime = performance.now();
      this.results.summary.endTime = new Date().toISOString();
      this.results.summary.duration = Math.round(overallEndTime - overallStartTime);
      
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Critical error in security test suite:', error.message);
      process.exit(1);
    }
  }

  generateFinalReport() {
    console.log('\n🏁 FINAL SECURITY TEST REPORT');
    console.log('=============================');
    
    const { summary } = this.results;
    console.log(`Test Suites: ${summary.totalTestSuites}`);
    console.log(`Passed: ${summary.passedSuites} ✅`);
    console.log(`Failed: ${summary.failedSuites} ❌`);
    console.log(`Success Rate: ${Math.round((summary.passedSuites / summary.totalTestSuites) * 100)}%`);
    console.log(`Total Duration: ${summary.duration}ms`);
    
    // Security score calculation
    let totalTests = 0;
    let passedTests = 0;
    
    this.results.suites.forEach(suite => {
      if (suite.detailedResults) {
        totalTests += suite.detailedResults.summary.total;
        passedTests += suite.detailedResults.summary.passed;
      }
    });
    
    const securityScore = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    console.log(`\n🛡️ OVERALL SECURITY SCORE: ${securityScore}/100`);
    
    if (securityScore >= 90) {
      console.log('🏆 EXCELLENT - Strong security posture');
    } else if (securityScore >= 75) {
      console.log('👍 GOOD - Minor security improvements needed');
    } else if (securityScore >= 50) {
      console.log('⚠️  FAIR - Significant security improvements required');
    } else {
      console.log('🚨 POOR - Critical security vulnerabilities detected');
    }
    
    // Critical issues summary
    console.log('\n🚨 CRITICAL SECURITY FINDINGS:');
    let criticalIssues = 0;
    
    this.results.suites.forEach(suite => {
      suite.errors.forEach(error => {
        if (error.includes('VULNERABLE') || error.includes('FAIL')) {
          console.log(`• ${suite.name}: ${error}`);
          criticalIssues++;
        }
      });
    });
    
    if (criticalIssues === 0) {
      console.log('✅ No critical security issues detected');
    } else {
      console.log(`❌ ${criticalIssues} critical security issues found`);
    }
    
    // Security recommendations
    console.log('\n📋 SECURITY RECOMMENDATIONS:');
    console.log('• Implement rate limiting on all authentication endpoints');
    console.log('• Use helmet.js middleware for security headers');
    console.log('• Validate and sanitize all user inputs with strong schemas');
    console.log('• Implement proper file upload restrictions and scanning');
    console.log('• Configure CORS with specific allowed origins');
    console.log('• Regular security audits and dependency scanning');
    console.log('• Implement request size limits and timeout protection');
    console.log('• Monitor authentication patterns for brute force attempts');
    console.log('• Use HTTPS in production with proper certificate management');
    console.log('• Implement SQL injection protection with parameterized queries');
    
    // Save comprehensive report
    fs.writeFileSync('./comprehensive-security-report.json', JSON.stringify(this.results, null, 2));
    console.log('\n💾 Comprehensive report saved to comprehensive-security-report.json');
    
    // Generate summary for CI/CD
    const ciSummary = {
      securityScore,
      criticalIssues,
      totalTests,
      passedTests,
      timestamp: new Date().toISOString(),
      status: criticalIssues === 0 && securityScore >= 75 ? 'PASS' : 'FAIL'
    };
    
    fs.writeFileSync('./security-summary.json', JSON.stringify(ciSummary, null, 2));
    console.log('📊 CI/CD summary saved to security-summary.json');
    
    // Exit with appropriate code
    if (criticalIssues > 0 || securityScore < 50) {
      console.log('\n🚨 Security testing FAILED - critical issues detected');
      process.exit(1);
    } else if (securityScore < 75) {
      console.log('\n⚠️  Security testing PASSED with warnings');
      process.exit(0);
    } else {
      console.log('\n✅ Security testing PASSED - good security posture');
      process.exit(0);
    }
  }
}

// Run comprehensive security tests
async function main() {
  const suite = new SecurityTestSuite();
  await suite.runAllSecurityTests();
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Security test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = { SecurityTestSuite };