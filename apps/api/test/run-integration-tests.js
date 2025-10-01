#!/usr/bin/env node

/**
 * Integration Test Runner
 * 
 * This script sets up the test environment and runs the integration tests.
 * It handles database setup, service dependencies, and cleanup.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironment() {
  log('🔍 Checking test environment...', 'blue');
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'MINIO_ENDPOINT',
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    log(`❌ Missing environment variables: ${missing.join(', ')}`, 'red');
    log('Please set up your .env.test file with the required variables.', 'yellow');
    process.exit(1);
  }
  
  log('✅ Environment variables OK', 'green');
}

function setupDatabase() {
  log('🗄️  Setting up test database...', 'blue');
  
  try {
    // Reset database schema
    execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
    
    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    log('✅ Database setup complete', 'green');
  } catch (error) {
    log('❌ Database setup failed', 'red');
    console.error(error.message);
    process.exit(1);
  }
}

function runTests() {
  log('🧪 Running integration tests...', 'blue');
  
  try {
    // Run e2e tests
    execSync('npm run test:e2e', { stdio: 'inherit' });
    
    log('✅ All tests passed!', 'green');
  } catch (error) {
    log('❌ Some tests failed', 'red');
    process.exit(1);
  }
}

function cleanup() {
  log('🧹 Cleaning up test environment...', 'blue');
  
  try {
    // Clean up test data (if any manual cleanup needed)
    log('✅ Cleanup complete', 'green');
  } catch (error) {
    log('⚠️  Cleanup had issues, but continuing...', 'yellow');
  }
}

// Main execution
async function main() {
  log('🚀 Starting Integration Test Suite', 'blue');
  log('=====================================', 'blue');
  
  try {
    checkEnvironment();
    setupDatabase();
    runTests();
    cleanup();
    
    log('=====================================', 'green');
    log('🎉 Integration tests completed successfully!', 'green');
  } catch (error) {
    log('=====================================', 'red');
    log('💥 Integration tests failed!', 'red');
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n🛑 Test run interrupted by user', 'yellow');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n🛑 Test run terminated', 'yellow');
  cleanup();
  process.exit(0);
});

// Run the test suite
main().catch((error) => {
  log('💥 Unexpected error in test runner:', 'red');
  console.error(error);
  process.exit(1);
});