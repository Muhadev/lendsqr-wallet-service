import { Request, Response, NextFunction } from 'express';
import { AuthController } from "../../controllers/AuthController"
import { AuthService } from "../../services/AuthService"
import { AppError } from "../../utils/AppError"
import type { AuthenticatedRequest } from "../../middleware/auth"
import { AccountStatus } from "../../models/Account"
import { jest } from "@jest/globals"

// Mock the AuthService
jest.mock("../../services/AuthService")

describe("AuthController", () => {
  let authController: AuthController
  let mockAuthService: jest.Mocked<AuthService>
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    authController = new AuthController()
    mockAuthService = new AuthService() as jest.Mocked<AuthService>
    ;(authController as any).authService = mockAuthService

    mockRequest = {
      body: {},
    }

    // Fix: Properly type the mock response methods
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    }

    mockNext = jest.fn()
  })

  describe("register", () => {
    const validUserData = {
      email: "test@example.com",
      phone: "08123456789",
      firstName: "John",
      lastName: "Doe",
      bvn: "12345678901",
      password: "Password123!",
    }

    it("should register a user successfully", async () => {
      const mockResult = {
        user: {
          id: 1,
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          phone: "08123456789",
          bvn: "12345678901",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        token: "mock-jwt-token",
        account: {
          accountNumber: "1234567890",
          balance: 0,
          status: AccountStatus.ACTIVE, // Fix: Use enum instead of string
        },
      }

      mockRequest.body = validUserData
      mockAuthService.register.mockResolvedValue(mockResult)

      await authController.register(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockAuthService.register).toHaveBeenCalledWith(validUserData)
      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        message: "User registered successfully",
        data: mockResult,
      })
    })

    it("should handle validation errors", async () => {
      mockRequest.body = { email: "invalid-email" }

      await authController.register(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
    })

    it("should handle service errors", async () => {
      const error = new AppError("Email already exists", 409)
      mockRequest.body = validUserData
      mockAuthService.register.mockRejectedValue(error)

      await authController.register(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe("login", () => {
    const validCredentials = {
      email: "test@example.com",
      password: "Password123!",
    }

    it("should login user successfully", async () => {
      const mockResult = {
        user: {
          id: 1,
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          phone: "08123456789",
          bvn: "12345678901",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        token: "mock-jwt-token",
        account: {
          accountNumber: "1234567890",
          balance: 1000,
          status: AccountStatus.ACTIVE, // Fix: Use enum instead of string
        },
      }

      mockRequest.body = validCredentials
      mockAuthService.login.mockResolvedValue(mockResult)

      await authController.login(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockAuthService.login).toHaveBeenCalledWith(validCredentials)
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        message: "Login successful",
        data: mockResult,
      })
    })

    it("should handle invalid credentials", async () => {
      const error = new AppError("Invalid email or password", 401)
      mockRequest.body = validCredentials
      mockAuthService.login.mockRejectedValue(error)

      await authController.login(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe("refreshToken", () => {
    it("should refresh token successfully", async () => {
      const mockAuthRequest = {
        user: { id: 1, email: "test@example.com", firstName: "John", lastName: "Doe" },
      } as AuthenticatedRequest

      const mockToken = "new-jwt-token"
      mockAuthService.refreshToken.mockResolvedValue(mockToken)

      await authController.refreshToken(mockAuthRequest, mockResponse as Response, mockNext)

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(1)
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        message: "Token refreshed successfully",
        data: { token: mockToken },
      })
    })

    it("should handle unauthenticated request", async () => {
      const mockAuthRequest = {} as AuthenticatedRequest

      await authController.refreshToken(mockAuthRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
    })
  })

  describe("getProfile", () => {
    it("should get user profile successfully", async () => {
      const mockAuthRequest = {
        user: { id: 1, email: "test@example.com", firstName: "John", lastName: "Doe" },
      } as AuthenticatedRequest

      const mockUser = {
        id: 1,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        phone: "08123456789",
        bvn: "12345678901",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockAuthService.getUserProfile.mockResolvedValue(mockUser)

      await authController.getProfile(mockAuthRequest, mockResponse as Response, mockNext)

      expect(mockAuthService.getUserProfile).toHaveBeenCalledWith(1)
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        message: "Profile retrieved successfully",
        data: { user: mockUser },
      })
    })
  })
})
