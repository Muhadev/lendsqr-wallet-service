// src/tests/setup.ts - Enhanced test setup

import { db } from '../config/database';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DB_NAME = 'lendsqr_wallet_test';

// Mock AdjutorService globally for all tests
jest.mock('../services/AdjutorService', () => {
  return {
    AdjutorService: jest.fn().mockImplementation(() => ({
      verifyUser: jest.fn().mockResolvedValue(true),
      checkKarmaBlacklist: jest.fn().mockResolvedValue({
        status: false,
        message: 'User is clean'
      }),
      checkMultipleIdentities: jest.fn().mockResolvedValue([
        { status: false, message: 'Clean' },
        { status: false, message: 'Clean' },
        { status: false, message: 'Clean' }
      ])
    }))
  };
});

// Global test setup
beforeAll(async () => {
  // Run migrations
  await db.migrate.latest();
});

// Global test teardown
afterAll(async () => {
  // Clean up and close database connection
  await db.destroy();
});

// Increase timeout for database operations
jest.setTimeout(30000);