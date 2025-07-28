// src/tests/setup.ts - Enhanced version with better cleanup and mocking

import { db } from '../config/database';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
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
  try {
    // Ensure we're connected to the test database
    await db.raw('SELECT 1');
    console.log('Test database connected successfully');
    
    // Clean up any existing data and run fresh migrations
    try {
      await db.migrate.rollback(undefined, true);
    } catch (error) {
      // Ignore rollback errors on first run
    }
    
    await db.migrate.latest();
    console.log('Test migrations completed');
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  try {
    // Clean up all test data
    await db.raw('SET FOREIGN_KEY_CHECKS = 0');
    await db('transactions').del();
    await db('accounts').del();
    await db('users').del();
    await db.raw('SET FOREIGN_KEY_CHECKS = 1');
    
    // Rollback migrations to clean state
    await db.migrate.rollback(undefined, true);
    console.log('Test migrations rolled back');
  } catch (error) {
    console.warn('Migration rollback failed:', error);
  } finally {
    // Clean up and close database connection
    await db.destroy();
    console.log('Test database connection closed');
  }
});

// Clean database between tests
beforeEach(async () => {
  try {
    // Clean up all tables in correct order to avoid foreign key constraints
    await db.raw('SET FOREIGN_KEY_CHECKS = 0');
    await db('transactions').del();
    await db('accounts').del();
    await db('users').del();
    await db.raw('SET FOREIGN_KEY_CHECKS = 1');
  } catch (error) {
    console.warn('Database cleanup between tests failed:', error);
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in test:', promise, 'reason:', reason);
});

// Clean up after each test
afterEach(async () => {
  // Clear all timers and mocks
  jest.clearAllTimers();
  jest.clearAllMocks();
});