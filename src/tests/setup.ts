// src/tests/setup.ts
import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '24h';
process.env.TRANSACTION_REF_PREFIX = 'TXN';
process.env.ADJUTOR_API_URL = 'https://test-adjutor.com/v2';
process.env.ADJUTOR_API_KEY = 'test-api-key';
process.env.ADJUTOR_API_TIMEOUT = '10000';
process.env.KARMA_ENDPOINT = '/verification/karma';
process.env.KARMA_MAX_CONCURRENT_REQUESTS = '3';
process.env.ALLOW_REGISTRATION_ON_KARMA_FAILURE = 'true';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test setup
beforeAll(async () => {
  // Any global setup code
});

afterAll(async () => {
  // Any global cleanup code
});

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});