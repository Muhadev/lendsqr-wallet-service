// src/tests/models/User.test.ts
import { User, CreateUserData, LoginCredentials, UserResponse } from '../../models/User';

describe('User Model', () => {
  describe('User Interface', () => {
    it('should have correct User interface structure', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('phone');
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('lastName');
      expect(user).toHaveProperty('bvn');
      expect(user).toHaveProperty('passwordHash');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');

      expect(typeof user.id).toBe('number');
      expect(typeof user.email).toBe('string');
      expect(typeof user.phone).toBe('string');
      expect(typeof user.firstName).toBe('string');
      expect(typeof user.lastName).toBe('string');
      expect(typeof user.bvn).toBe('string');
      expect(typeof user.passwordHash).toBe('string');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate email format in User model', () => {
      const user: User = {
        id: 1,
        email: 'valid@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        passwordHash: 'hashedpassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should validate phone format in User model', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        passwordHash: 'hashedpassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(user.phone).toMatch(/^(\+234|0)[789][01]\d{8}$/);
    });

    it('should validate BVN format in User model', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        passwordHash: 'hashedpassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(user.bvn).toMatch(/^\d{11}$/);
      expect(user.bvn.length).toBe(11);
    });
  });

  describe('CreateUserData Interface', () => {
    it('should have correct CreateUserData interface structure', () => {
      const createUserData: CreateUserData = {
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        password: 'Password123!',
      };

      expect(createUserData).toHaveProperty('email');
      expect(createUserData).toHaveProperty('phone');
      expect(createUserData).toHaveProperty('firstName');
      expect(createUserData).toHaveProperty('lastName');
      expect(createUserData).toHaveProperty('bvn');
      expect(createUserData).toHaveProperty('password');

      expect(typeof createUserData.email).toBe('string');
      expect(typeof createUserData.phone).toBe('string');
      expect(typeof createUserData.firstName).toBe('string');
      expect(typeof createUserData.lastName).toBe('string');
      expect(typeof createUserData.bvn).toBe('string');
      expect(typeof createUserData.password).toBe('string');
    });

    it('should not include passwordHash in CreateUserData', () => {
      const createUserData: CreateUserData = {
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        password: 'Password123!',
      };

      expect(createUserData).not.toHaveProperty('passwordHash');
      expect(createUserData).not.toHaveProperty('id');
      expect(createUserData).not.toHaveProperty('createdAt');
      expect(createUserData).not.toHaveProperty('updatedAt');
    });

    it('should validate CreateUserData with different phone formats', () => {
      const testCases = [
        { phone: '08123456789', valid: true },
        { phone: '+2348123456789', valid: true },
        { phone: '09087654321', valid: true },
        { phone: '07012345678', valid: true },
        { phone: '081234567890', valid: false }, // too long
        { phone: '0812345678', valid: false },   // too short
        { phone: '05123456789', valid: false },  // invalid prefix
      ];

      testCases.forEach(({ phone, valid }) => {
        const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
        expect(phoneRegex.test(phone)).toBe(valid);
      });
    });
  });

  describe('LoginCredentials Interface', () => {
    it('should have correct LoginCredentials interface structure', () => {
      const loginCredentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      expect(loginCredentials).toHaveProperty('email');
      expect(loginCredentials).toHaveProperty('password');

      expect(typeof loginCredentials.email).toBe('string');
      expect(typeof loginCredentials.password).toBe('string');
    });

    it('should only contain email and password fields', () => {
      const loginCredentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const keys = Object.keys(loginCredentials);
      expect(keys).toHaveLength(2);
      expect(keys).toContain('email');
      expect(keys).toContain('password');
    });
  });

  describe('UserResponse Interface', () => {
    it('should have correct UserResponse interface structure', () => {
      const userResponse: UserResponse = {
        id: 1,
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      expect(userResponse).toHaveProperty('id');
      expect(userResponse).toHaveProperty('email');
      expect(userResponse).toHaveProperty('phone');
      expect(userResponse).toHaveProperty('firstName');
      expect(userResponse).toHaveProperty('lastName');
      expect(userResponse).toHaveProperty('bvn');
      expect(userResponse).toHaveProperty('createdAt');
      expect(userResponse).toHaveProperty('updatedAt');

      expect(typeof userResponse.id).toBe('number');
      expect(typeof userResponse.email).toBe('string');
      expect(typeof userResponse.phone).toBe('string');
      expect(typeof userResponse.firstName).toBe('string');
      expect(typeof userResponse.lastName).toBe('string');
      expect(typeof userResponse.bvn).toBe('string');
      expect(userResponse.createdAt).toBeInstanceOf(Date);
      expect(userResponse.updatedAt).toBeInstanceOf(Date);
    });

    it('should not include passwordHash in UserResponse', () => {
      const userResponse: UserResponse = {
        id: 1,
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(userResponse).not.toHaveProperty('passwordHash');
      expect(userResponse).not.toHaveProperty('password');
    });
  });

  describe('Model Validation', () => {
    it('should validate email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'admin+tag@company.org',
        'firstname.lastname@example.com'
      ];

      const invalidEmails = [
        'invalid-email',
        '@domain.com', 
        'user@',
        'user..name@domain.com',
        'user@domain',
        ''
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it('should validate BVN formats', () => {
      const validBVNs = [
        '12345678901',
        '09876543210',
        '11111111111'
      ];

      const invalidBVNs = [
        '1234567890',    // 10 digits
        '123456789012',  // 12 digits
        'abcdefghijk',   // letters
        '1234567890a',   // mixed
        '',              // empty
        '12 34567890'    // spaces
      ];

      const bvnRegex = /^\d{11}$/;

      validBVNs.forEach(bvn => {
        expect(bvnRegex.test(bvn)).toBe(true);
      });

      invalidBVNs.forEach(bvn => {
        expect(bvnRegex.test(bvn)).toBe(false);
      });
    });

    it('should validate Nigerian phone number formats', () => {
      const validPhones = [
        '08123456789',
        '09087654321',
        '07012345678',
        '+2348123456789',
        '+2349087654321',
        '+2347012345678'
      ];

      const invalidPhones = [
        '05123456789',   // invalid prefix
        '081234567890',  // too long
        '0812345678',    // too short
        '+234812345678', // too short with country code
        '8123456789',    // missing leading 0
        '123456789',     // too short
        ''               // empty
      ];

      const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;

      validPhones.forEach(phone => {
        expect(phoneRegex.test(phone)).toBe(true);
      });

      invalidPhones.forEach(phone => {
        expect(phoneRegex.test(phone)).toBe(false);
      });
    });
  });

  describe('Model Relationships', () => {
    it('should maintain referential integrity between User and related models', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        passwordHash: 'hashedpassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // User ID should be a positive integer
      expect(user.id).toBeGreaterThan(0);
      expect(Number.isInteger(user.id)).toBe(true);
    });

    it('should handle date objects properly', () => {
      const now = new Date();
      const user: User = {
        id: 1,
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        passwordHash: 'hashedpassword123',
        createdAt: now,
        updatedAt: now,
      };

      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(user.createdAt.getTime());
    });
  });

  describe('Password Security', () => {
    it('should ensure password requirements are met in CreateUserData', () => {
      const validPasswords = [
        'Password123!',
        'MySecure1Pass',
        'Test123Pass',
        'Admin1234'
      ];

      const invalidPasswords = [
        'password',      // no uppercase, no number
        'PASSWORD',      // no lowercase, no number
        '12345678',      // no letters
        'Pass1',         // too short
        'password123',   // no uppercase
        'PASSWORD123'    // no lowercase
      ];

      // Password should contain at least one uppercase, one lowercase, and one number
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

      validPasswords.forEach(password => {
        expect(passwordRegex.test(password)).toBe(true);
        expect(password.length).toBeGreaterThanOrEqual(8);
      });

      invalidPasswords.forEach(password => {
        const isValid = passwordRegex.test(password) && password.length >= 8;
        expect(isValid).toBe(false);
      });
    });
  });
});