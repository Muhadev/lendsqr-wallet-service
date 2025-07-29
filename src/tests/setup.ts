// Import Jest globals
import { beforeEach, afterAll } from "@jest/globals"

// Set NODE_ENV to test
process.env.NODE_ENV = "test"

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
