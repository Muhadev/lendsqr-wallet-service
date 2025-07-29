import type { Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { authenticate, type AuthenticatedRequest } from "../../middleware/auth"
import { UserRepository } from "../../repositories/UserRepository"
import { AppError } from "../../utils/AppError"
import { jest } from "@jest/globals"

jest.mock("jsonwebtoken")
jest.mock("../../repositories/UserRepository")

describe("Auth Middleware", () => {
  let mockRequest: Partial<AuthenticatedRequest>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction
  let mockUserRepository: jest.Mocked<UserRepository>

  const mockUser = {
    id: 1,
    email: "test@example.com",
    phone: "08123456789",
    firstName: "John",
    lastName: "Doe",
    bvn: "12345678901",
    passwordHash: "hashed-password",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    mockRequest = {
      headers: {},
    }
    mockResponse = {}
    mockNext = jest.fn()
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>

    // Mock the constructor to return our mocked instance
    ;(UserRepository as jest.MockedClass<typeof UserRepository>).mockImplementation(() => mockUserRepository)

    // Mock environment variable
    process.env.JWT_SECRET = "test-secret"
  })

  afterEach(() => {
    delete process.env.JWT_SECRET
  })

  describe("authenticate", () => {
    it("should authenticate user with valid token", async () => {
      const mockToken = "valid-jwt-token"
      const mockDecoded = { userId: 1 }

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      }
      ;(jwt.verify as jest.Mock).mockReturnValue(mockDecoded)
      mockUserRepository.findById.mockResolvedValue(mockUser)

      await authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, "test-secret")
      expect(mockUserRepository.findById).toHaveBeenCalledWith(1)
      expect(mockRequest.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      })
      expect(mockNext).toHaveBeenCalledWith()
    })

    it("should throw AppError if no authorization header", async () => {
      mockRequest.headers = {}

      await authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError // Fix: Type assertion
      expect(error.message).toBe("Access token required")
      expect(error.statusCode).toBe(401)
    })

    it("should throw AppError if authorization header does not start with Bearer", async () => {
      mockRequest.headers = {
        authorization: "Invalid token-format",
      }

      await authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError // Fix: Type assertion
      expect(error.message).toBe("Access token required")
    })

    it("should throw AppError if token is empty", async () => {
      mockRequest.headers = {
        authorization: "Bearer ",
      }

      await authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError // Fix: Type assertion
      expect(error.message).toBe("Access token required")
    })

    it("should throw AppError if JWT secret is not configured", async () => {
      delete process.env.JWT_SECRET

      mockRequest.headers = {
        authorization: "Bearer valid-token",
      }

      await authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError // Fix: Type assertion
      expect(error.message).toBe("JWT secret not configured")
      expect(error.statusCode).toBe(500)
    })

    it("should throw AppError if token is invalid", async () => {
      mockRequest.headers = {
        authorization: "Bearer invalid-token",
      }
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError("Invalid token")
      })

      await authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError // Fix: Type assertion
      expect(error.message).toBe("Invalid token")
      expect(error.statusCode).toBe(401)
    })

    it("should throw AppError if user not found", async () => {
      const mockToken = "valid-jwt-token"
      const mockDecoded = { userId: 999 }

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      }
      ;(jwt.verify as jest.Mock).mockReturnValue(mockDecoded)
      mockUserRepository.findById.mockResolvedValue(null)

      await authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError // Fix: Type assertion
      expect(error.message).toBe("User not found")
      expect(error.statusCode).toBe(401)
    })

    it("should handle token expiration", async () => {
  mockRequest.headers = {
    authorization: "Bearer expired-token",
  }
  ;(jwt.verify as jest.Mock).mockImplementation(() => {
    // Instead of new jwt.TokenExpiredError, use a plain error with the correct name
    const err = new Error("Token expired");
    (err as any).name = "TokenExpiredError";
    throw err;
  })

  await authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

  expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
  const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError
  expect(error.message).toBe("Invalid token")
  expect(error.statusCode).toBe(401)
})
    it("should handle malformed token", async () => {
      mockRequest.headers = {
        authorization: "Bearer malformed.token",
      }
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError("Malformed token")
      })

      await authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError // Fix: Type assertion
      expect(error.message).toBe("Invalid token")
      expect(error.statusCode).toBe(401)
    })
  })
})
