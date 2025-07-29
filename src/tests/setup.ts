// Import Jest globals
import { beforeEach, afterAll } from "@jest/globals"

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
jest.mock("winston")
