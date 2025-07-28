// src/tests/repositories/UserRepository.test.ts
import { UserRepository } from '../../repositories/UserRepository';
import { CreateUserData } from '../../models/User';
import { db } from '../../config/database';

// Mock the database
jest.mock('../../config/database');

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockDb: any;

  beforeEach(() => {
    userRepository = new UserRepository();
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn(),
      returning: jest.fn(),
      del: jest.fn(),
    };
    (db as any) = mockDb;
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      mockDb.first.mockResolvedValue(mockUser);

      const result = await userRepository.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalledWith('*');
      expect(mockDb.from).toHaveBeenCalledWith('users');
      expect(mockDb.where).toHaveBeenCalledWith('id', 1);
    });

    it('should return null when user not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await userRepository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      mockDb.first.mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockDb.where).toHaveBeenCalledWith('email', 'test@example.com');
    });
  });

  describe('create', () => {
    it('should create and return new user', async () => {
      const userData: CreateUserData & { passwordHash: string } = {
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'Test',
        lastName: 'User',
        bvn: '12345678901',
        password: 'password',
        passwordHash: 'hashedpassword',
      };

      const mockCreatedUser = {
        id: 1,
        ...userData,
      };

      mockDb.returning.mockResolvedValue([mockCreatedUser]);

      const result = await userRepository.create(userData);

      expect(result).toEqual(mockCreatedUser);
      expect(mockDb.insert).toHaveBeenCalledWith({
        email: userData.email,
        phone: userData.phone,
        first_name: userData.firstName,
        last_name: userData.lastName,
        bvn: userData.bvn,
        password_hash: userData.passwordHash,
      });
    });
  });
});