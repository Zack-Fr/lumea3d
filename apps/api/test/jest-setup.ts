// Jest setup file to configure test environment
process.env.NODE_ENV = 'test';

// Set other test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-jest-tests';
process.env.JWT_EXPIRES_IN = '15m';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';