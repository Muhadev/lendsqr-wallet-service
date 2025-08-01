// Import Jest globals
import { beforeEach, afterAll } from "@jest/globals"


// Set NODE_ENV to test
process.env.NODE_ENV = "test"
process.env.DB_HOST = "test";
process.env.DB_PORT = "3306";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";
process.env.DB_NAME = "test";
process.env.DB_POOL_MIN = "1";
process.env.DB_POOL_MAX = "5";
process.env.DB_ACQUIRE_TIMEOUT = "1000";
process.env.DB_CREATE_TIMEOUT = "1000";
process.env.DB_DESTROY_TIMEOUT = "1000";
process.env.DB_IDLE_TIMEOUT = "1000";
process.env.DB_REAP_INTERVAL = "1000";
process.env.DB_CREATE_RETRY_INTERVAL = "100";
process.env.KARMA_MAX_CONCURRENT_REQUESTS = "1";
process.env.KARMA_ENDPOINT = "/test";
process.env.ALLOW_REGISTRATION_ON_KARMA_FAILURE = "false";
process.env.ADJUTOR_API_URL = "http://test";
process.env.ADJUTOR_API_KEY = "test";
process.env.ADJUTOR_API_TIMEOUT = "1000";
process.env.MIN_FUNDING_AMOUNT = "1";
process.env.MAX_FUNDING_AMOUNT = "10000";
process.env.MIN_TRANSFER_AMOUNT = "1";
process.env.BCRYPT_SALT_ROUNDS= '12'
process.env.MAX_TRANSFER_AMOUNT = "10000";
process.env.MIN_WITHDRAWAL_AMOUNT = "1";
process.env.MAX_WITHDRAWAL_AMOUNT = "10000";
process.env.TRANSACTION_REF_MAX_ATTEMPTS = "5";
process.env.ACCOUNT_NUMBER_MAX_ATTEMPTS = "5";
process.env.JWT_SECRET = "test";

// Mock winston globally
jest.mock("winston", () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn(),
  },
}))

// Extend Jest matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      toStartWith(expected: string): R
    }
  }
}

// Setup global test environment
beforeEach(() => {
  jest.clearAllMocks()
})

afterAll(async () => {
  // Clean up any resources if needed
})

// Mock external dependencies globally
jest.mock("bcryptjs")
jest.mock("jsonwebtoken")
jest.mock("axios")
