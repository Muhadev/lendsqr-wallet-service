import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import * as helpers from "../../utils/helpers"
import { jest } from "@jest/globals"

// Properly type the mocked modules
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockedJwt = jwt as jest.Mocked<typeof jwt>
const mockedCrypto = crypto as jest.Mocked<typeof crypto>

jest.mock("bcryptjs")
jest.mock("jsonwebtoken")
jest.mock("crypto")

describe("Helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock crypto.randomUUID on the imported crypto module
    mockedCrypto.randomUUID.mockReturnValue("123e4567-e89b-12d3-a456-426614174000");
  })

  describe("hashPassword", () => {
    it("should hash password successfully", async () => {
      const password = "Password123!"
      const hashedPassword = "hashed-password"
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never)

      const result = await helpers.hashPassword(password)

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12)
      expect(result).toBe(hashedPassword)
    })
  })

  describe("comparePassword", () => {
    it("should compare passwords successfully", async () => {
      const password = "Password123!"
      const hashedPassword = "hashed-password"
      mockedBcrypt.compare.mockResolvedValue(true as never)

      const result = await helpers.comparePassword(password, hashedPassword)

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword)
      expect(result).toBe(true)
    })

    it("should return false for incorrect password", async () => {
      const password = "WrongPassword"
      const hashedPassword = "hashed-password"
      mockedBcrypt.compare.mockResolvedValue(false as never)

      const result = await helpers.comparePassword(password, hashedPassword)

      expect(result).toBe(false)
    })
  })

  describe("generateToken", () => {
    beforeEach(() => {
      process.env.JWT_SECRET = "test-secret"
      process.env.JWT_EXPIRES_IN = "24h"
    })

    afterEach(() => {
      delete process.env.JWT_SECRET
      delete process.env.JWT_EXPIRES_IN
    })

    it("should generate token successfully", () => {
      const payload = { userId: 1, email: "test@example.com" }
      const token = "generated-jwt-token"
      mockedJwt.sign.mockReturnValue(token as never)

      const result = helpers.generateToken(payload)

      expect(mockedJwt.sign).toHaveBeenCalledWith(payload, "test-secret", { expiresIn: "24h" })
      expect(result).toBe(token)
    })

    it("should throw error if JWT_SECRET is not configured", () => {
      delete process.env.JWT_SECRET
      const payload = { userId: 1 }

      expect(() => helpers.generateToken(payload)).toThrow("JWT_SECRET environment variable is required")
    })
  })

  describe("generateAccountNumber", () => {
    it("should generate 10-digit account number", () => {
      jest.spyOn(Date, "now").mockReturnValue(1234567890123)
      mockedCrypto.randomInt.mockReturnValue(7890 as never)

      const result = helpers.generateAccountNumber()

      expect(result).toHaveLength(10)
      expect(result).toMatch(/^\d{10}$/)
    })
  })

  describe("generateTransactionReference", () => {
    beforeEach(() => {
      process.env.TRANSACTION_REF_PREFIX = "TXN"
    })

    afterEach(() => {
      delete process.env.TRANSACTION_REF_PREFIX
    })

    it("should generate transaction reference with prefix", () => {
      const result = helpers.generateTransactionReference();
      expect(result.startsWith("TXN")).toBe(true);
      // Check that the rest is a valid uppercase UUID without dashes
      expect(result).toMatch(/^TXN[A-F0-9]{32}$/);
    });

    it("should use default prefix if not configured", () => {
      delete process.env.TRANSACTION_REF_PREFIX

      jest.spyOn(Date, "now").mockReturnValue(1234567890123)
      jest.spyOn(process, "hrtime").mockReturnValue({ bigint: () => BigInt("1234567890123456789") } as any)
      mockedCrypto.randomBytes.mockReturnValue({
        toString: jest.fn().mockReturnValue("abcd1234"),
      } as any)

      const result = helpers.generateTransactionReference()

      expect(result.startsWith("TXN")).toBe(true)
    })
  })

  describe("formatCurrency", () => {
    it("should format currency in Nigerian Naira", () => {
      const amount = 1500.5

      const result = helpers.formatCurrency(amount)

      expect(result).toContain("₦")
      expect(result).toContain("1,500.50")
    })
  })

  describe("isValidEmail", () => {
    it("should validate correct email format", () => {
      expect(helpers.isValidEmail("test@example.com")).toBe(true)
      expect(helpers.isValidEmail("user.name@domain.co.uk")).toBe(true)
    })

    it("should reject invalid email format", () => {
      expect(helpers.isValidEmail("invalid-email")).toBe(false)
      expect(helpers.isValidEmail("test@")).toBe(false)
      expect(helpers.isValidEmail("@example.com")).toBe(false)
    })
  })

  describe("isValidNigerianPhone", () => {
    it("should validate correct Nigerian phone numbers", () => {
      expect(helpers.isValidNigerianPhone("08123456789")).toBe(true)
      expect(helpers.isValidNigerianPhone("+2348123456789")).toBe(true)
      expect(helpers.isValidNigerianPhone("07012345678")).toBe(true)
      expect(helpers.isValidNigerianPhone("09087654321")).toBe(true)
    })

    it("should reject invalid Nigerian phone numbers", () => {
      expect(helpers.isValidNigerianPhone("1234567890")).toBe(false)
      expect(helpers.isValidNigerianPhone("08123456")).toBe(false)
      expect(helpers.isValidNigerianPhone("081234567890")).toBe(false)
    })
  })

  describe("isValidBVN", () => {
    it("should validate correct BVN format", () => {
      expect(helpers.isValidBVN("12345678901")).toBe(true)
      expect(helpers.isValidBVN("98765432109")).toBe(true)
    })

    it("should reject invalid BVN format", () => {
      expect(helpers.isValidBVN("1234567890")).toBe(false) // 10 digits
      expect(helpers.isValidBVN("123456789012")).toBe(false) // 12 digits
      expect(helpers.isValidBVN("1234567890a")).toBe(false) // contains letter
    })
  })

  describe("maskSensitiveData", () => {
    it("should mask data correctly for strings longer than 4 characters", () => {
      expect(helpers.maskSensitiveData("1234567890")).toBe("12******90")
      expect(helpers.maskSensitiveData("test@example.com")).toBe("te************om")
    })

    it("should mask entire string for short data", () => {
      expect(helpers.maskSensitiveData("123")).toBe("***")
      expect(helpers.maskSensitiveData("ab")).toBe("**")
    })
  })

  describe("sanitizeUser", () => {
    it("should remove passwordHash from user object", () => {
      const user = {
        id: 1,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        passwordHash: "secret-hash",
      }

      const result = helpers.sanitizeUser(user)

      expect(result).not.toHaveProperty("passwordHash")
      expect(result).toEqual({
        id: 1,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
      })
    })
  })

  describe("getPaginationMetadata", () => {
    it("should generate correct pagination metadata", () => {
      const result = helpers.getPaginationMetadata(100, 2, 20)

      expect(result).toEqual({
        currentPage: 2,
        totalPages: 5,
        totalCount: 100,
        hasNextPage: true,
        hasPreviousPage: true,
        nextPage: 3,
        previousPage: 1,
      })
    })

    it("should handle first page correctly", () => {
      const result = helpers.getPaginationMetadata(100, 1, 20)

      expect(result.hasPreviousPage).toBe(false)
      expect(result.previousPage).toBeNull()
      expect(result.hasNextPage).toBe(true)
      expect(result.nextPage).toBe(2)
    })

    it("should handle last page correctly", () => {
      const result = helpers.getPaginationMetadata(100, 5, 20)

      expect(result.hasNextPage).toBe(false)
      expect(result.nextPage).toBeNull()
      expect(result.hasPreviousPage).toBe(true)
      expect(result.previousPage).toBe(4)
    })
  })
})
