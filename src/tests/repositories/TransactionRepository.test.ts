
// Mock db before importing repository
jest.mock("../../config/database", () => {
  const mockDb = jest.fn();
  return { db: mockDb };
});
import { db } from "../../config/database";

import { TransactionRepository } from "../../repositories/TransactionRepository";
import { TransactionType, TransactionStatus } from "../../models/Transaction";
import { NotFoundError } from "../../utils/AppError";
// import { db } from "../../config/database";
import { jest } from "@jest/globals";

describe("TransactionRepository", () => {
  let transactionRepository: TransactionRepository;
  let mockQueryBuilder: any;

  const mockTransactionDb = {
    id: 1,
    account_id: 1,
    type: TransactionType.CREDIT,
    amount: 1000.5,
    recipient_id: 2,
    reference: "ref-123",
    status: TransactionStatus.COMPLETED,
    description: "Test transaction",
    created_at: new Date(),
    updated_at: new Date(),
  };
  // Always use mapDbToModel for Transaction
  let mockTransaction: ReturnType<TransactionRepository["mapDbToModel"]>;

  const mockCreateData = {
    accountId: 1,
    type: TransactionType.CREDIT,
    amount: 1000.5,
    recipientId: 2,
    reference: "ref-123",
    status: TransactionStatus.COMPLETED,
    description: "Test transaction",
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
        // Add then to allow .then(cb) for array results
        then: undefined,
        [Symbol.iterator]: undefined,
    };
    // Add a raw method to the db mock
    (db as unknown as jest.Mock).mockImplementation(() => mockQueryBuilder);
    (db as any).raw = jest.fn((...args) => args.join(' ')); // or return a dummy object
    transactionRepository = new TransactionRepository();
    mockTransaction = transactionRepository["mapDbToModel"](mockTransactionDb);
    jest.clearAllMocks();
    });
  describe("create", () => {
    it("should create transaction successfully", async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);
      mockQueryBuilder.first.mockResolvedValue(mockTransactionDb);
      const result = await transactionRepository.create(mockCreateData);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        account_id: mockCreateData.accountId,
        type: mockCreateData.type,
        amount: mockCreateData.amount,
        recipient_id: mockCreateData.recipientId,
        reference: mockCreateData.reference,
        status: mockCreateData.status,
        description: mockCreateData.description,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          accountId: 1,
          type: TransactionType.CREDIT,
          amount: 1000.5,
          recipientId: 2,
          reference: "ref-123",
          status: TransactionStatus.COMPLETED,
        })
      );
    });
    it("should throw error if transaction creation fails", async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);
      mockQueryBuilder.first.mockResolvedValue(null);
      await expect(transactionRepository.create(mockCreateData)).rejects.toThrow("Failed to create transaction");
    });
  });

  describe("findById", () => {
    it("should find transaction by id", async () => {
      mockQueryBuilder.first.mockResolvedValue(mockTransactionDb);
      const result = await transactionRepository.findById(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          accountId: 1,
        })
      );
    });
    it("should return null if not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(null);
      const result = await transactionRepository.findById(999);
      expect(result).toBeNull();
    });
  });

  describe("findByReference", () => {
    it("should find transaction by reference", async () => {
      mockQueryBuilder.first.mockResolvedValue(mockTransactionDb);
      const result = await transactionRepository.findByReference("ref-123");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ reference: "ref-123" });
      expect(result).toEqual(
        expect.objectContaining({
          reference: "ref-123",
        })
      );
    });
    it("should return null if not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(null);
      const result = await transactionRepository.findByReference("not-found");
      expect(result).toBeNull();
    });
  });

  describe("findByAccountId", () => {
    it("should return paginated transactions and totalCount", async () => {
        const pagedResultsDb = [mockTransactionDb, { ...mockTransactionDb, id: 2 }];
        mockQueryBuilder.clone.mockReturnThis();
        mockQueryBuilder.count.mockReturnThis();
        mockQueryBuilder.first.mockResolvedValue({ count: 2 });
        mockQueryBuilder.orderBy.mockReturnThis();
        mockQueryBuilder.limit.mockReturnThis();
        mockQueryBuilder.offset.mockReturnThis();
        mockQueryBuilder.where.mockReturnThis();
        mockQueryBuilder.select.mockReturnThis();
        mockQueryBuilder.map = (cb: any) => pagedResultsDb.map(cb); // This is key!
        const result = await transactionRepository.findByAccountId(1, { page: 1, limit: 2 });
        expect(result.totalCount).toBe(2);
        expect(result.transactions.length).toBe(2);
    });
    });

  describe("updateStatus", () => {
    it("should update status successfully", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.first.mockResolvedValue({ ...mockTransaction, status: TransactionStatus.FAILED });
      const result = await transactionRepository.updateStatus(1, TransactionStatus.FAILED);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: TransactionStatus.FAILED,
        updated_at: expect.any(Date),
      });
      expect(result.status).toBe(TransactionStatus.FAILED);
    });
    it("should throw NotFoundError if not found", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.first.mockResolvedValue(null);
      await expect(transactionRepository.updateStatus(999, TransactionStatus.FAILED)).rejects.toThrow(NotFoundError);
    });
  });

  describe("getAccountTransactionsSummary", () => {
    it("should return summary", async () => {
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.first.mockResolvedValue({
        total_credits: "1000.5",
        total_debits: "500.25",
        transaction_count: "3",
      });
      (db as unknown as jest.Mock).mockImplementation(() => mockQueryBuilder);
      const result = await transactionRepository.getAccountTransactionsSummary(1);
      expect(result).toEqual({
        totalCredits: 1000.5,
        totalDebits: 500.25,
        transactionCount: 3,
      });
    });
  });

  describe("createTransferTransactions", () => {
    it("should create debit and credit transactions", async () => {
      const debitDb = { ...mockTransactionDb, type: TransactionType.DEBIT };
      const creditDb = { ...mockTransactionDb, id: 2, type: TransactionType.CREDIT };
      const debit = transactionRepository["mapDbToModel"](debitDb);
      const credit = transactionRepository["mapDbToModel"](creditDb);
      jest.spyOn(transactionRepository, "create")
        .mockResolvedValueOnce(debit)
        .mockResolvedValueOnce(credit);
      const result = await transactionRepository.createTransferTransactions(1, 2, 100, "ref-456", "desc");
      expect(result.debitTransaction.type).toBe(TransactionType.DEBIT);
      expect(result.creditTransaction.type).toBe(TransactionType.CREDIT);
    });
  });

  describe("delete", () => {
    it("should delete transaction successfully", async () => {
      mockQueryBuilder.del.mockResolvedValue(1);
      const result = await transactionRepository.delete(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 1 });
      expect(result).toBe(true);
    });
    it("should return false if not found", async () => {
      mockQueryBuilder.del.mockResolvedValue(0);
      const result = await transactionRepository.delete(999);
      expect(result).toBe(false);
    });
  });

  describe("mapDbToModel", () => {
    it("should map db result to model", () => {
      const repo: any = transactionRepository;
      const result = repo.mapDbToModel(mockTransactionDb);
      expect(result).toEqual({
        id: 1,
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000.5,
        recipientId: 2,
        reference: "ref-123",
        status: TransactionStatus.COMPLETED,
        description: "Test transaction",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });
});
