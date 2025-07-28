// src/tests/setup.ts - Enhanced version of your existing setup

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
  try {
    // Ensure we're connected to the test database
    await db.raw('SELECT 1');
    console.log('Test database connected successfully');
    
    // Run migrations
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
    // Rollback migrations to clean state
    await db.migrate.rollback();
    console.log('Test migrations rolled back');
  } catch (error) {
    console.warn('Migration rollback failed:', error);
  } finally {
    // Clean up and close database connection
    await db.destroy();
    console.log('Test database connection closed');
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);