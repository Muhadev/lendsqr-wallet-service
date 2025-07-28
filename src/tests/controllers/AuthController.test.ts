// src/tests/controllers/AuthController.test.ts
import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../../controllers/AuthController';
import { AuthService } from '../../services/AuthService';
import { CreateUserData, LoginCredentials } from '../../models/User';
import { AccountStatus } from '../../models/Account';
import { AppError, BlacklistError, ConflictError, AuthenticationError } from '../../utils/AppError';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock the AuthService
jest.mock('../../services/AuthService');

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mocked AuthService
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    
    // Create controller instance
    authController = new AuthController();
    (authController as any).authService = mockAuthService;

    // Setup mock request and response
    mockRequest = {
      body: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('register', () => {
    const validUserData: CreateUserData = {
      email: 'test@example.com',
      phone: '08123456789',
      firstName: 'John',
      lastName: 'Doe',
      bvn: '12345678901',
      password: 'Password123',
    };

    const mockAuthResponse = {
      user: {
        id: 1,
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      token: 'mock-jwt-token',
      account: {
        accountNumber: '1234567890',
        balance: 0,
        status: AccountStatus.ACTIVE,
      },
    };

    it('should register user successfully with valid data', async () => {
      mockRequest.body = validUserData;
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      await authController.register(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.register).toHaveBeenCalledWith(validUserData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User registered successfully',
        data: mockAuthResponse,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      mockRequest.body = {
        ...validUserData,
        email: 'invalid-email',
      };

      await authController.register(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('valid email'),
        })
      );
    });

    it('should return 400 for invalid phone number', async () => {
      mockRequest.body = {
        ...validUserData,
        phone: '1234567890', // Invalid format
      };

      await authController.register(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('phone number'),
        })
      );
    });

    it('should return 400 for invalid BVN format', async () => {
      mockRequest.body = {
        ...validUserData,
        bvn: '123456789', // Invalid length
      };

      await authController.register(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('11 digits'),
        })
      );
    });

    it('should return 400 for weak password', async () => {
      mockRequest.body = {
        ...validUserData,
        password: 'weak', // Too short and no complexity
      };

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('8 characters'),
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        // Missing other required fields
      };

      await authController.register(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
        })
      );
    });

    it('should handle blacklisted user error', async () => {
      mockRequest.body = validUserData;
      mockAuthService.register.mockRejectedValue(
        new BlacklistError('User is blacklisted and cannot be onboarded')
      );

      await authController.register(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.register).toHaveBeenCalledWith(validUserData);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'User is blacklisted and cannot be onboarded',
        })
      );
    });

    it('should handle duplicate email error', async () => {
      mockRequest.body = validUserData;
      mockAuthService.register.mockRejectedValue(
        new ConflictError('Email address is already registered')
      );

      await authController.register(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: 'Email address is already registered',
        })
      );
    });

    it('should handle unexpected service errors', async () => {
      mockRequest.body = validUserData;
      mockAuthService.register.mockRejectedValue(
        new Error('Database connection failed')
      );

      await authController.register(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(Error)
      );
    });
  });

  describe('login', () => {
    const validCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'Password123',
    };

    const mockAuthResponse = {
      user: {
        id: 1,
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      token: 'mock-jwt-token',
      account: {
        accountNumber: '1234567890',
        balance: 5000,
        status: AccountStatus.ACTIVE,
      },
    };

    it('should login user successfully with valid credentials', async () => {
      mockRequest.body = validCredentials;
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      await authController.login(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(validCredentials);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Login successful',
        data: mockAuthResponse,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email format in login', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'Password123',
      };

      await authController.login(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('valid email'),
        })
      );
    });

    it('should return 400 for missing password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        // Missing password
      };

      await authController.login(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('required'),
        })
      );
    });

    it('should handle invalid credentials error', async () => {
      mockRequest.body = validCredentials;
      mockAuthService.login.mockRejectedValue(
        new AuthenticationError('Invalid email or password')
      );

      await authController.login(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Invalid email or password',
        })
      );
    });

    it('should handle inactive account error', async () => {
      mockRequest.body = validCredentials;
      mockAuthService.login.mockRejectedValue(
        new AuthenticationError('Account is not active')
      );

      await authController.login(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Account is not active',
        })
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully for authenticated user', async () => {
      const mockAuthenticatedRequest = {
        user: { id: 1, email: 'test@example.com' },
      } as AuthenticatedRequest;

      const newToken = 'new-jwt-token';
      mockAuthService.refreshToken.mockResolvedValue(newToken);

      await authController.refreshToken(
        mockAuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Token refreshed successfully',
        data: { token: newToken },
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockUnauthenticatedRequest = {
        user: undefined,
      } as AuthenticatedRequest;

      await authController.refreshToken(
        mockUnauthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'User not authenticated',
        })
      );
    });

    it('should handle service errors during token refresh', async () => {
      const mockAuthenticatedRequest = {
        user: { id: 1, email: 'test@example.com' },
      } as AuthenticatedRequest;

      mockAuthService.refreshToken.mockRejectedValue(
        new AuthenticationError('User not found')
      );

      await authController.refreshToken(
        mockAuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'User not found',
        })
      );
    });
  });

  describe('getProfile', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      phone: '08123456789',
      firstName: 'John',
      lastName: 'Doe',
      bvn: '12345678901',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should get user profile successfully', async () => {
      const mockAuthenticatedRequest = {
        user: { id: 1, email: 'test@example.com' },
      } as AuthenticatedRequest;

      mockAuthService.getUserProfile.mockResolvedValue(mockUser);

      await authController.getProfile(
        mockAuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.getUserProfile).toHaveBeenCalledWith(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Profile retrieved successfully',
        data: { user: mockUser },
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockUnauthenticatedRequest = {
        user: undefined,
      } as AuthenticatedRequest;

      await authController.getProfile(
        mockUnauthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.getUserProfile).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'User not authenticated',
        })
      );
    });

    it('should handle user not found error', async () => {
      const mockAuthenticatedRequest = {
        user: { id: 999, email: 'nonexistent@example.com' },
      } as AuthenticatedRequest;

      mockAuthService.getUserProfile.mockRejectedValue(
        new AuthenticationError('User not found')
      );

      await authController.getProfile(
        mockAuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'User not found',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors properly', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'weak',
      };

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
    });

    it('should pass through service errors to next middleware', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const serviceError = new Error('Database connection failed');
      mockAuthService.login.mockRejectedValue(serviceError);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });
});