import { AuthService } from "../../services/AuthService";
import { UserRepository } from "../../repositories/UserRepository";
import { AccountRepository } from "../../repositories/AccountRepository";
import { AdjutorService } from "../../services/AdjutorService";
import { AccountStatus } from "../../models/Account";
import { ValidationError, AuthenticationError, ConflictError, BlacklistError } from "../../utils/AppError";
import * as helpers from "../../utils/helpers";
import { db } from "../../config/database";
import type { CreateUserData, LoginCredentials } from "../../models/User";
import type { Knex } from "knex";
import { jest } from "@jest/globals";

jest.mock("../../repositories/UserRepository");
jest.mock("../../repositories/AccountRepository");
jest.mock("../../services/AdjutorService");
jest.mock("../../utils/helpers");
jest.mock("../../config/database");

describe("AuthService", () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockAccountRepository: jest.Mocked<AccountRepository>;
  let mockAdjutorService: jest.Mocked<AdjutorService>;
  let mockDb: any;

  const mockUser = {
    id: 1,
    email: "test@example.com",
    phone: "08123456789",
    firstName: "John",
    lastName: "Doe",
    bvn: "12345678904",
    passwordHash: "hashed-password",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAccount = {
    id: 1,
    userId: 1,
    accountNumber: "1234567890",
    balance: 0,
    status: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mockAccountRepository = new AccountRepository() as jest.Mocked<AccountRepository>;
    mockAdjutorService = new AdjutorService() as jest.Mocked<AdjutorService>;

    // Mock db as a function with a .transaction method
    const dbMockFn = jest.fn((table: string) => {
      if (table === "users") {
        return {
          insert: jest.fn().mockImplementation(() => Promise.resolve([mockUser.id])),
          where: jest.fn().mockReturnValue({
            first: jest.fn().mockImplementation(() => Promise.resolve({
              id: mockUser.id,
              email: mockUser.email,
              phone: mockUser.phone,
              first_name: mockUser.firstName,
              last_name: mockUser.lastName,
              bvn: mockUser.bvn,
              password_hash: mockUser.passwordHash,
              created_at: mockUser.createdAt,
              updated_at: mockUser.updatedAt,
            })),
          }),
        } as Partial<Knex.QueryBuilder>;
      }
      if (table === "accounts") {
        return {
          insert: jest.fn().mockImplementation(() => Promise.resolve([mockAccount.id])),
          where: jest.fn().mockImplementation((query: any) => ({
            first: jest.fn().mockImplementation(() => {
              // If querying by id, return the mockAccount with both properties
              if (query && query.id === mockAccount.id) {
                return Promise.resolve({
                  id: mockAccount.id,
                  user_id: mockAccount.userId,
                  account_number: mockAccount.accountNumber, // for DB mapping
                  accountNumber: mockAccount.accountNumber,  // for returned object
                  balance: mockAccount.balance,
                  status: mockAccount.status,
                  created_at: mockAccount.createdAt,
                  updated_at: mockAccount.updatedAt,
                });
              }
              // If querying by account_number, simulate uniqueness check
              if (query && query.account_number) {
                return Promise.resolve(undefined);
              }
              // Default: undefined
              return Promise.resolve(undefined);
            }),
          })),
        } as Partial<Knex.QueryBuilder>;
      }
      return {
        insert: jest.fn().mockImplementation((...args: any[]) => Promise.resolve([args[0]?.id ?? 1])),
        where: jest.fn().mockReturnValue({ first: jest.fn().mockImplementation(() => Promise.resolve(undefined)) }),
      } as Partial<Knex.QueryBuilder>;
    }) as unknown as Knex & { transaction: any };
    dbMockFn.transaction = jest.fn(async (callback: (trx: Knex.Transaction) => any) => {
      const trxMock: Knex.Transaction = dbMockFn as any;
      return callback(trxMock);
    });
    (db as any) = dbMockFn;

    authService = new AuthService();
    (authService as any).userRepository = mockUserRepository;
    (authService as any).accountRepository = mockAccountRepository;
    (authService as any).adjutorService = mockAdjutorService;
  });

  describe("register", () => {
    const validUserData: CreateUserData = {
      email: "test@example.com",
      phone: "08123456789",
      firstName: "John",
      lastName: "Doe",
      bvn: "12345678901",
      password: "Password123!",
    };

    beforeEach(() => {
      (helpers.hashPassword as jest.MockedFunction<typeof helpers.hashPassword>).mockResolvedValue("hashed-password");
      (helpers.generateToken as jest.MockedFunction<typeof helpers.generateToken>).mockReturnValue("mock-jwt-token");
      (helpers.sanitizeUser as jest.MockedFunction<typeof helpers.sanitizeUser>).mockReturnValue({
        id: 1,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        phone: "08123456789",
        bvn: "12345678901",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it("should register user successfully", async () => {
      mockAdjutorService.verifyUser.mockResolvedValue(true);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhone.mockResolvedValue(null);
      mockUserRepository.findByBvn.mockResolvedValue(null);
      (helpers.generateAccountNumber as jest.MockedFunction<typeof helpers.generateAccountNumber>).mockReturnValue("unique12345");

      const result = await authService.register(validUserData);

      expect(mockAdjutorService.verifyUser).toHaveBeenCalledWith({
        email: validUserData.email,
        phone: validUserData.phone,
        bvn: validUserData.bvn,
      });
      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("token");
      expect(result).toHaveProperty("account");
      expect(result.token).toBe("mock-jwt-token");
    });

    it("should throw BlacklistError if user is blacklisted", async () => {
      mockAdjutorService.verifyUser.mockResolvedValue(false);
      await expect(authService.register(validUserData)).rejects.toThrow(BlacklistError);
    });

    it("should throw ConflictError if email already exists", async () => {
      mockAdjutorService.verifyUser.mockResolvedValue(true);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      await expect(authService.register(validUserData)).rejects.toThrow(ConflictError);
    });

    it("should throw ConflictError if phone already exists", async () => {
      mockAdjutorService.verifyUser.mockResolvedValue(true);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhone.mockResolvedValue(mockUser);
      await expect(authService.register(validUserData)).rejects.toThrow(ConflictError);
    });

    it("should throw ConflictError if BVN already exists", async () => {
      mockAdjutorService.verifyUser.mockResolvedValue(true);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhone.mockResolvedValue(null);
      mockUserRepository.findByBvn.mockResolvedValue(mockUser);
      await expect(authService.register(validUserData)).rejects.toThrow(ConflictError);
    });

    it("should throw ValidationError for invalid email", async () => {
      const invalidData = { ...validUserData, email: "invalid-email" };
      await expect(authService.register(invalidData)).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for weak password", async () => {
      const invalidData = { ...validUserData, password: "weak" };
      await expect(authService.register(invalidData)).rejects.toThrow(ValidationError);
    });
  });

  describe("login", () => {
    const validCredentials: LoginCredentials = {
      email: "test@example.com",
      password: "Password123!",
    };

    beforeEach(() => {
      (helpers.generateToken as jest.MockedFunction<typeof helpers.generateToken>).mockReturnValue("mock-jwt-token");
      (helpers.sanitizeUser as jest.MockedFunction<typeof helpers.sanitizeUser>).mockReturnValue({
        id: 1,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        phone: "08123456789",
        bvn: "12345678901",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it("should login user successfully", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (helpers.comparePassword as jest.MockedFunction<typeof helpers.comparePassword>).mockResolvedValue(true);
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);

      const result = await authService.login(validCredentials);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validCredentials.email);
      expect(helpers.comparePassword).toHaveBeenCalledWith(validCredentials.password, mockUser.passwordHash);
      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("token");
      expect(result).toHaveProperty("account");
      expect(result.token).toBe("mock-jwt-token");
    });

    it("should throw AuthenticationError for non-existent user", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      await expect(authService.login(validCredentials)).rejects.toThrow(AuthenticationError);
    });

    it("should throw AuthenticationError for invalid password", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (helpers.comparePassword as jest.MockedFunction<typeof helpers.comparePassword>).mockResolvedValue(false);
      await expect(authService.login(validCredentials)).rejects.toThrow(AuthenticationError);
    });

    it("should throw AuthenticationError for inactive account", async () => {
      const inactiveAccount = { ...mockAccount, status: AccountStatus.INACTIVE };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (helpers.comparePassword as jest.MockedFunction<typeof helpers.comparePassword>).mockResolvedValue(true);
      mockAccountRepository.findByUserId.mockResolvedValue(inactiveAccount);
      await expect(authService.login(validCredentials)).rejects.toThrow(AuthenticationError);
    });
  });

  describe("refreshToken", () => {
    it("should refresh token successfully", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      (helpers.generateToken as jest.MockedFunction<typeof helpers.generateToken>).mockReturnValue("new-jwt-token");

      const result = await authService.refreshToken(1);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toBe("new-jwt-token");
    });

    it("should throw AuthenticationError for non-existent user", async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(authService.refreshToken(1)).rejects.toThrow(AuthenticationError);
    });
  });

  describe("getUserProfile", () => {
    it("should get user profile successfully", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      (helpers.sanitizeUser as jest.MockedFunction<typeof helpers.sanitizeUser>).mockReturnValue({
        id: 1,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        phone: "08123456789",
        bvn: "12345678901",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.getUserProfile(1);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(helpers.sanitizeUser).toHaveBeenCalledWith(mockUser);
      expect(result).not.toHaveProperty("passwordHash");
    });

    it("should throw AuthenticationError for non-existent user", async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(authService.getUserProfile(1)).rejects.toThrow(AuthenticationError);
    });
  });
});