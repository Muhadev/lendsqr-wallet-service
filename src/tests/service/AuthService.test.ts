// src/tests/services/AuthService.test.ts
import { AuthService } from '../../services/AuthService';
import { UserRepository } from '../../repositories/UserRepository';
import { AccountRepository } from '../../repositories/AccountRepository';
import { AdjutorService } from '../../services/AdjutorService';
import { CreateUserData, LoginCredentials } from '../../models/User';
import { AccountStatus } from '../../models/Account';
import { 
  ValidationError, 
  AuthenticationError, 
  ConflictError, 
  BlacklistError 
} from '../../utils/AppError';
import { db } from '../../config/database';

// Mock dependencies
jest.mock('../../repositories/UserRepository');
jest.mock('../../repositories/AccountRepository');
jest.mock('../../services/AdjutorService');
jest.mock('../../config/database');
jest.mock('../../utils/helpers');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockAccountRepository: jest.Mocked<AccountRepository>;
  let mockAdjutorService: jest.Mocked<AdjutorService>;
  let mockDb: any;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    phone: '08123456789',
    firstName: 'Test',
    lastName: 'User',
    bvn: '12345678901',
    passwordHash: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAccount = {
    id: 1,
    userId: 1,
    accountNumber: '1234567890',
    balance: 0,
    status: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    authService = new AuthService();
    mockUserRepository = UserRepository.prototype as jest.Mocked<UserRepository>;
    mockAccountRepository = AccountRepository.prototype as jest.Mocked<AccountRepository>;
    mockAdjutorService = AdjutorService.prototype as jest.Mocked<AdjutorService>;

    // Mock database transaction
    mockDb = {
      transaction: jest.fn().mockImplementation((callback) => callback({})),
    };
    (db as any) = mockDb;

    // Mock helper functions
    const helpers = require('../../utils/helpers');
    helpers.hashPassword = jest.fn().mockResolvedValue('hashedpassword');
    helpers.comparePassword = jest.fn().mockResolvedValue(true);
    helpers.generateToken = jest.fn().mockReturnValue('fake-jwt-token');
    helpers.generateAccountNumber = jest.fn().mockReturnValue('1234567890');
    helpers.sanitizeUser = jest.fn().mockReturnValue({
      id: mockUser.id,
      email: mockUser.email,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
    });
  });

  describe('register', () => {
    const userData: CreateUserData = {
      email: 'test@example.com',
      phone: '08123456789',
      firstName: 'Test',
      lastName: 'User',
      bvn: '12345678901',
      password: 'Password123!',
    };

    it('should register user successfully', async () => {
      mockAdjutorService.verifyUser.mockResolvedValue(true);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhone.mockResolvedValue(null);
      mockUserRepository.findByBvn.mockResolvedValue(null);
      mockAccountRepository.existsByAccountNumber.mockResolvedValue(false);
      
      mockDb.transaction.mockImplementation((callback) => 
        callback({}).then(() => ({ user: mockUser, account: mockAccount }))
      );

      const result = await authService.register(userData);

      expect(result.user).toBeDefined();
      expect(result.token).toBe('fake-jwt-token');
      expect(result.account.accountNumber).toBe('1234567890');
      expect(mockAdjutorService.verifyUser).toHaveBeenCalledWith({
        email: userData.email,
        phone: userData.phone,
        bvn: userData.bvn,
      });
    });

    it('should throw BlacklistError when user is blacklisted', async () => {
      mockAdjutorService.verifyUser.mockResolvedValue(false);

      await expect(authService.register(userData)).rejects.toThrow(BlacklistError);
    });

    it('should throw ConflictError for duplicate email', async () => {
      mockAdjutorService.verifyUser.mockResolvedValue(true);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(userData)).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError for invalid email', async () => {
      const invalidUserData = { ...userData, email: 'invalid-email' };

      await expect(authService.register(invalidUserData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for weak password', async () => {
      const invalidUserData = { ...userData, password: '123' };

      await expect(authService.register(invalidUserData)).rejects.toThrow(ValidationError);
    });
  });

  describe('login', () => {
    const credentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login successfully with valid credentials', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);

      const helpers = require('../../utils/helpers');
      helpers.comparePassword.mockResolvedValue(true);

      const result = await authService.login(credentials);

      expect(result.user).toBeDefined();
      expect(result.token).toBe('fake-jwt-token');
      expect(result.account).toBeDefined();
    });

    it('should throw AuthenticationError for invalid email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(credentials)).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for invalid password', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      
      const helpers = require('../../utils/helpers');
      helpers.comparePassword.mockResolvedValue(false);

      await expect(authService.login(credentials)).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for inactive account', async () => {
      const inactiveAccount = { ...mockAccount, status: AccountStatus.SUSPENDED };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockAccountRepository.findByUserId.mockResolvedValue(inactiveAccount);

      const helpers = require('../../utils/helpers');
      helpers.comparePassword.mockResolvedValue(true);

      await expect(authService.login(credentials)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.refreshToken(1);

      expect(result).toBe('fake-jwt-token');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw AuthenticationError for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.refreshToken(999)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const helpers = require('../../utils/helpers');
      const sanitizedUser = {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      };
      helpers.sanitizeUser.mockReturnValue(sanitizedUser);

      const result = await authService.getUserProfile(1);

      expect(result).toEqual(sanitizedUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw AuthenticationError for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.getUserProfile(999)).rejects.toThrow(AuthenticationError);
    });
  });
});