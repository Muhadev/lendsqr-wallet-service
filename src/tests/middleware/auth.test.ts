// tests/middleware/auth.test.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, AuthenticatedRequest } from '../../../src/middleware/auth';
import { UserRepository } from '../../../src/repositories/UserRepository';
import { AppError } from '../../../src/utils/AppError';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../src/repositories/UserRepository');

const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const MockedUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;

describe('Auth Middleware', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {};
    next = jest.fn();
    mockUserRepository = new MockedUserRepository() as jest.Mocked<UserRepository>;
    MockedUserRepository.mockImplementation(() => mockUserRepository);

    // Setup environment variable
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('successful authentication', () => {
    it('should authenticate user with valid token', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '08123456789',
        bvn: '12345678901',
        passwordHash: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDecodedToken = { userId: 1, email: 'test@example.com' };
      
      req.headers!.authorization = 'Bearer valid-token';
      mockedJwt.verify.mockReturnValue(mockDecodedToken as any);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(req.user).toEqual({
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('authentication failures', () => {
    it('should throw error when no authorization header', async () => {
      // Arrange
      req.headers = {};

      // Act
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Access token required',
          statusCode: 401,
        })
      );
    });

    it('should throw error when authorization header does not start with Bearer', async () => {
      // Arrange
      req.headers!.authorization = 'InvalidFormat token';

      // Act
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Access token required',
          statusCode: 401,
        })
      );
    });

    it('should throw error when token is empty', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer ';

      // Act
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Access token required',
          statusCode: 401,
        })
      );
    });

    it('should throw error when JWT_SECRET is not configured', async () => {
      // Arrange
      delete process.env.JWT_SECRET;
      req.headers!.authorization = 'Bearer valid-token';

      // Act
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'JWT secret not configured',
          statusCode: 500,
        })
      );
    });

    it('should throw error when token is invalid', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer invalid-token';
      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      // Act
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401,
        })
      );
    });

    it('should throw error when token is expired', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer expired-token';
      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      // Act
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401,
        })
      );
    });

    it('should throw error when user is not found', async () => {
      // Arrange
      const mockDecodedToken = { userId: 999, email: 'nonexistent@example.com' };
      
      req.headers!.authorization = 'Bearer valid-token';
      mockedJwt.verify.mockReturnValue(mockDecodedToken as any);
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found',
          statusCode: 401,
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockDecodedToken = { userId: 1, email: 'test@example.com' };
      const dbError = new Error('Database connection failed');
      
      req.headers!.authorization = 'Bearer valid-token';
      mockedJwt.verify.mockReturnValue(mockDecodedToken as any);
      mockUserRepository.findById.mockRejectedValue(dbError);

      // Act
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe('edge cases', () => {
    it('should handle malformed JWT payload', async () => {
      // Arrange
      const mockDecodedToken = { invalidField: 'value' }; // Missing userId
      
      req.headers!.authorization = 'Bearer valid-token';
      mockedJwt.verify.mockReturnValue(mockDecodedToken as any);
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(undefined);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found',
          statusCode: 401,
        })
      );
    });

    it('should extract token correctly from authorization header with extra spaces', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '08123456789',
        bvn: '12345678901',
        passwordHash: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockDecodedToken = { userId: 1, email: 'test@example.com' };
      
      req.headers!.authorization = '  Bearer   valid-token  '; // Extra spaces
      mockedJwt.verify.mockReturnValue(mockDecodedToken as any);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalledWith();
    });
  });
});