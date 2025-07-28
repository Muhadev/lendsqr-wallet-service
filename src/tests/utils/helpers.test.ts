// src/tests/utils/helpers.test.ts
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateAccountNumber,
  generateTransactionReference,
  sanitizeUser,
  getPaginationMetadata,
  isValidEmail,
  isValidNigerianPhone,
  isValidBVN,
  maskSensitiveData,
} from '../../utils/helpers';
import { User } from '../../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock bcrypt and jwt
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Helpers', () => {
  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const mockHash = 'hashedpassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHash);

      const result = await hashPassword('password123');

      expect(result).toBe(mockHash);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });
  });

  describe('comparePassword', () => {
    it('should compare password correctly', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await comparePassword('password123', 'hashedpassword');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const mockToken = 'fake-jwt-token';
      
      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_EXPIRES_IN = '24h';
      
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const result = generateToken(payload);

      expect(result).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(payload, 'test-secret', { expiresIn: '24h' });
    });

    it('should throw error when JWT_SECRET is not configured', () => {
      delete process.env.JWT_SECRET;

      expect(() => generateToken({ userId: 1, email: 'test@example.com' }))
        .toThrow('JWT_SECRET is not configured');
    });
  });

  describe('generateAccountNumber', () => {
    it('should generate 10-digit account number', () => {
      const accountNumber = generateAccountNumber();

      expect(accountNumber).toHaveLength(10);
      expect(/^\d+$/.test(accountNumber)).toBe(true);
    });
  });

  describe('generateTransactionReference', () => {
    it('should generate transaction reference with prefix', () => {
      process.env.TRANSACTION_REF_PREFIX = 'TXN';

      const reference = generateTransactionReference();

      // Allow alphanumeric characters after TXN prefix
      expect(reference).toMatch(/^TXN[A-Z0-9]+$/);
      expect(reference.length).toBeGreaterThan(3);
    });
  });

  describe('sanitizeUser', () => {
    it('should remove sensitive fields from user object', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'Test',
        lastName: 'User',
        bvn: '12345678901',
        passwordHash: 'secret-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = sanitizeUser(user);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('email', 'test@example.com');
    });
  });

  describe('getPaginationMetadata', () => {
    it('should generate correct pagination metadata', () => {
      const result = getPaginationMetadata(100, 2, 10);

      expect(result).toEqual({
        currentPage: 2,
        totalPages: 10,
        totalCount: 100,
        hasNextPage: true,
        hasPreviousPage: true,
        nextPage: 3,
        previousPage: 1,
      });
    });

    it('should handle first page correctly', () => {
      const result = getPaginationMetadata(50, 1, 10);

      expect(result.hasPreviousPage).toBe(false);
      expect(result.previousPage).toBe(null);
    });

    it('should handle last page correctly', () => {
      const result = getPaginationMetadata(50, 5, 10);

      expect(result.hasNextPage).toBe(false);
      expect(result.nextPage).toBe(null);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidNigerianPhone', () => {
    it('should validate correct Nigerian phone formats', () => {
      expect(isValidNigerianPhone('08123456789')).toBe(true);
      expect(isValidNigerianPhone('+2348123456789')).toBe(true);
      expect(isValidNigerianPhone('07098765432')).toBe(true);
    });

    it('should reject invalid phone formats', () => {
      expect(isValidNigerianPhone('1234567890')).toBe(false);
      expect(isValidNigerianPhone('081234567890')).toBe(false);
      expect(isValidNigerianPhone('08123456')).toBe(false);
    });
  });

  describe('isValidBVN', () => {
    it('should validate correct BVN format', () => {
      expect(isValidBVN('12345678901')).toBe(true);
    });

    it('should reject invalid BVN formats', () => {
      expect(isValidBVN('123456789')).toBe(false);
      expect(isValidBVN('123456789012')).toBe(false);
      expect(isValidBVN('1234567890a')).toBe(false);
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask sensitive data correctly', () => {
      expect(maskSensitiveData('1234567890')).toBe('12******90');
      expect(maskSensitiveData('test@example.com')).toBe('te***********om');
    });

    it('should handle short strings', () => {
      expect(maskSensitiveData('abc')).toBe('***');
    });
  });
});
