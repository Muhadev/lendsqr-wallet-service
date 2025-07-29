const mockDb = jest.fn();

jest.mock("../../config/database", () => ({
  db: mockDb,
}));

import { AccountRepository } from "../../repositories/AccountRepository";
import { type CreateAccountData, AccountStatus } from "../../models/Account";
import { NotFoundError } from "../../utils/AppError";

describe("AccountRepository", () => {
  let accountRepository: AccountRepository;
  let mockQueryBuilder: any;

  const mockDbAccount = {
    id: 1,
    user_id: 1,
    account_number: "1234567890",
    balance: 5000.0,
    status: "active",
    created_at: new Date("2023-01-01"),
    updated_at: new Date("2023-01-01"),
  };

  const mockAccountData: CreateAccountData = {
    userId: 1,
    accountNumber: "1234567890",
    balance: 0,
    status: AccountStatus.ACTIVE,
  };

  beforeEach(() => {
    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      update: jest.fn().mockReturnThis(),
      del: jest.fn(),
      select: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
    };

    mockDb.mockReturnValue(mockQueryBuilder);

    accountRepository = new AccountRepository();

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create account successfully", async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);
      mockQueryBuilder.first.mockResolvedValue(mockDbAccount);

      const result = await accountRepository.create(mockAccountData);

      expect(mockDb).toHaveBeenCalledWith("accounts");
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        user_id: mockAccountData.userId,
        account_number: mockAccountData.accountNumber,
        balance: mockAccountData.balance,
        status: mockAccountData.status,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          userId: 1,
          accountNumber: "1234567890",
          balance: 5000,
          status: AccountStatus.ACTIVE,
        }),
      );
    });

    it("should create account with default values", async () => {
      const minimalData = {
        userId: 1,
        accountNumber: "1234567890",
      };

      mockQueryBuilder.insert.mockResolvedValue([1]);
      mockQueryBuilder.first.mockResolvedValue(mockDbAccount);

      await accountRepository.create(minimalData);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        user_id: 1,
        account_number: "1234567890",
        balance: 0,
        status: AccountStatus.ACTIVE,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it("should throw error if account creation fails", async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);
      mockQueryBuilder.first.mockResolvedValue(null);

      await expect(accountRepository.create(mockAccountData)).rejects.toThrow("Failed to create account");
    });
  });

  describe("findById", () => {
    it("should find account by id successfully", async () => {
      mockQueryBuilder.first.mockResolvedValue(mockDbAccount);

      const result = await accountRepository.findById(1);

      expect(mockDb).toHaveBeenCalledWith("accounts");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          userId: 1,
          accountNumber: "1234567890",
          balance: 5000,
        }),
      );
    });

    it("should return null if account not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      const result = await accountRepository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe("findByUserId", () => {
    it("should find account by user id successfully", async () => {
      mockQueryBuilder.first.mockResolvedValue(mockDbAccount);

      const result = await accountRepository.findByUserId(1);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: 1 });
      expect(result).toEqual(
        expect.objectContaining({
          userId: 1,
        }),
      );
    });

    it("should return null if account not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      const result = await accountRepository.findByUserId(999);

      expect(result).toBeNull();
    });
  });

  describe("findByAccountNumber", () => {
    it("should find account by account number successfully", async () => {
      mockQueryBuilder.first.mockResolvedValue(mockDbAccount);

      const result = await accountRepository.findByAccountNumber("1234567890");

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ account_number: "1234567890" });
      expect(result).toEqual(
        expect.objectContaining({
          accountNumber: "1234567890",
        }),
      );
    });

    it("should return null if account not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      const result = await accountRepository.findByAccountNumber("9999999999");

      expect(result).toBeNull();
    });
  });

  describe("updateBalance", () => {
    it("should update balance successfully", async () => {
      const updatedAccount = { ...mockDbAccount, balance: 6000.0 };
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.first.mockResolvedValue(updatedAccount);

      const result = await accountRepository.updateBalance(1, 6000);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 1 });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        balance: 6000,
        updated_at: expect.any(Date),
      });
      expect(result.balance).toBe(6000);
    });

    it("should update balance with transaction context", async () => {
      const updatedAccount = { ...mockDbAccount, balance: 6000.0 };
      const mockTrxQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        first: jest.fn().mockResolvedValue(updatedAccount),
      };
      const mockTrx = jest.fn(() => mockTrxQueryBuilder);

      const result = await accountRepository.updateBalance(1, 6000, mockTrx);

      expect(mockTrx).toHaveBeenCalledWith("accounts");
      expect(mockTrxQueryBuilder.where).toHaveBeenCalledWith({ id: 1 });
      expect(mockTrxQueryBuilder.update).toHaveBeenCalledWith({
        balance: 6000,
        updated_at: expect.any(Date),
      });
      expect(result.balance).toBe(6000);
    });

    it("should throw NotFoundError if account not found", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.first.mockResolvedValue(null);

      await expect(accountRepository.updateBalance(999, 6000)).rejects.toThrow(NotFoundError);
    });
  });

  describe("transferFunds", () => {
    const mockSenderAccount = { ...mockDbAccount, balance: 5000.0 };
    const mockRecipientAccount = { ...mockDbAccount, id: 2, balance: 3000.0 };

    it("should transfer funds successfully", async () => {
      const mockTrxQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest
          .fn()
          .mockResolvedValueOnce(mockSenderAccount)
          .mockResolvedValueOnce(mockRecipientAccount),
        update: jest.fn().mockResolvedValue(1),
      };
      const mockTrx = jest.fn(() => mockTrxQueryBuilder);

      // Patch findById to use the transaction context
      const updatedSender = { ...mockSenderAccount, balance: 4000 };
      const updatedRecipient = { ...mockRecipientAccount, balance: 4000 };
      jest.spyOn(accountRepository, "findById")
        .mockImplementationOnce(async () => accountRepository["mapDbToModel"](updatedSender))
        .mockImplementationOnce(async () => accountRepository["mapDbToModel"](updatedRecipient));

      const result = await accountRepository.transferFunds(1, 2, 1000, mockTrx);

      expect(mockTrx).toHaveBeenCalledWith("accounts");
      expect(mockTrxQueryBuilder.first).toHaveBeenCalledTimes(2);
      expect(mockTrxQueryBuilder.update).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty("senderAccount");
      expect(result).toHaveProperty("recipientAccount");
      expect(result.senderAccount.balance).toBe(4000);
      expect(result.recipientAccount.balance).toBe(4000);
    });

    it("should throw NotFoundError if sender account not found", async () => {
      const mockTrxQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      };
      const mockTrx = jest.fn(() => mockTrxQueryBuilder);

      await expect(accountRepository.transferFunds(1, 2, 1000, mockTrx)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if recipient account not found", async () => {
      const mockTrxQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest
          .fn()
          .mockResolvedValueOnce(mockSenderAccount)
          .mockResolvedValueOnce(null),
        update: jest.fn(),
      };
      const mockTrx = jest.fn(() => mockTrxQueryBuilder);

      await expect(accountRepository.transferFunds(1, 2, 1000, mockTrx)).rejects.toThrow(NotFoundError);
    });

    it("should handle balance calculations correctly", async () => {
      const mockTrxQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest
          .fn()
          .mockResolvedValueOnce(mockSenderAccount)
          .mockResolvedValueOnce(mockRecipientAccount),
        update: jest.fn().mockResolvedValue(1),
      };
      const mockTrx = jest.fn(() => mockTrxQueryBuilder);

      // Patch findById to use the transaction context
      const updatedSender = { ...mockSenderAccount, balance: 4000 };
      const updatedRecipient = { ...mockRecipientAccount, balance: 4000 };
      jest.spyOn(accountRepository, "findById")
        .mockImplementationOnce(async () => accountRepository["mapDbToModel"](updatedSender))
        .mockImplementationOnce(async () => accountRepository["mapDbToModel"](updatedRecipient));

      await accountRepository.transferFunds(1, 2, 1000, mockTrx);

      expect(mockTrxQueryBuilder.update).toHaveBeenCalledWith({
        balance: 4000,
        updated_at: expect.any(Date),
      });
    });
  });

  describe("updateStatus", () => {
    it("should update status successfully", async () => {
      const updatedAccount = { ...mockDbAccount, status: "inactive" };
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.first.mockResolvedValue(updatedAccount);

      const result = await accountRepository.updateStatus(1, AccountStatus.INACTIVE);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 1 });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: AccountStatus.INACTIVE,
        updated_at: expect.any(Date),
      });
      expect(result.status).toBe(AccountStatus.INACTIVE);
    });

    it("should throw NotFoundError if account not found", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.first.mockResolvedValue(null);

      await expect(accountRepository.updateStatus(999, AccountStatus.INACTIVE)).rejects.toThrow(NotFoundError);
    });
  });

  describe("getBalance", () => {
    it("should get balance successfully", async () => {
      mockQueryBuilder.first.mockResolvedValue({ balance: 5000.0 });

      const result = await accountRepository.getBalance(1);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 1 });
      expect(result).toBe(5000.0);
    });

    it("should throw NotFoundError if account not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      await expect(accountRepository.getBalance(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe("existsByAccountNumber", () => {
    it("should return true if account number exists", async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 1 });

      const result = await accountRepository.existsByAccountNumber("1234567890");

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ account_number: "1234567890" });
      expect(result).toBe(true);
    });

    it("should return false if account number does not exist", async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      const result = await accountRepository.existsByAccountNumber("9999999999");

      expect(result).toBe(false);
    });
  });

  describe("delete", () => {
    it("should delete account successfully", async () => {
      mockQueryBuilder.del.mockResolvedValue(1);

      const result = await accountRepository.delete(1);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 1 });
      expect(result).toBe(true);
    });

    it("should return false if account not found", async () => {
      mockQueryBuilder.del.mockResolvedValue(0);

      const result = await accountRepository.delete(999);

      expect(result).toBe(false);
    });
  });

  describe("mapDbToModel", () => {
    it("should correctly map database result to model", async () => {
      const dbResult = {
        id: 1,
        user_id: 1,
        account_number: "1234567890",
        balance: 5000,
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      };
      const result = accountRepository["mapDbToModel"](dbResult);
      expect(result).toEqual({
        id: 1,
        userId: 1,
        accountNumber: "1234567890",
        balance: 5000,
        status: "active",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("should handle decimal balance conversion", async () => {
      const dbResult = {
        id: 1,
        user_id: 1,
        account_number: "1234567890",
        balance: "5000.5",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      };
      const result = accountRepository["mapDbToModel"](dbResult);
      expect(result.balance).toBe(5000.5);
      expect(typeof result.balance).toBe("number");
    });
  });
});