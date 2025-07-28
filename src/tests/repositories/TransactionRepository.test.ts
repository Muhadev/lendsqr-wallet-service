// src/tests/repositories/TransactionRepository.test.ts
import { TransactionRepository } from '../../repositories/TransactionRepository';
import { CreateTransactionData, TransactionType, TransactionStatus } from '../../models/Transaction';
import { db } from '../../config/database';

jest.mock('../../config/database');

describe('TransactionRepository', () => {
  let transactionRepository: TransactionRepository;
  let mockDb: any;

  beforeEach(() => {
    transactionRepository = new TransactionRepository();
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn(),
      returning: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      count: jest.fn(),
      sum: jest.fn(),
    };
    (db as any) = mockDb;
  });

  describe('create', () => {
    it('should create and return new transaction', async () => {
      const transactionData: CreateTransactionData = {
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000,
        reference: 'TXN123456789',
        status: TransactionStatus.COMPLETED,
        description: 'Test transaction',
      };

      const mockCreatedTransaction = {
        id: 1,
        ...transactionData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.returning.mockResolvedValue([mockCreatedTransaction]);

      const result = await transactionRepository.create(transactionData);

      expect(result).toEqual(mockCreatedTransaction);
      expect(mockDb.insert).toHaveBeenCalledWith({
        account_id: transactionData.accountId,
        type: transactionData.type,
        amount: transactionData.amount,
        recipient_id: transactionData.recipientId,
        reference: transactionData.reference,
        status: transactionData.status,
        description: transactionData.description,
      });
    });
  });

  describe('findByReference', () => {
    it('should return transaction when found by reference', async () => {
      const mockTransaction = {
        id: 1,
        reference: 'TXN123456789',
        type: TransactionType.CREDIT,
        amount: 1000,
      };

      mockDb.first.mockResolvedValue(mockTransaction);

      const result = await transactionRepository.findByReference('TXN123456789');

      expect(result).toEqual(mockTransaction);
      expect(mockDb.where).toHaveBeenCalledWith('reference', 'TXN123456789');
    });
  });

  describe('findByAccountId', () => {
    it('should return paginated transactions for account', async () => {
      const mockTransactions = [
        { id: 1, type: TransactionType.CREDIT, amount: 1000 },
        { id: 2, type: TransactionType.DEBIT, amount: 500 },
      ];

      mockDb.limit.mockResolvedValue(mockTransactions);
      mockDb.count.mockResolvedValue([{ count: 2 }]);

      const result = await transactionRepository.findByAccountId(1, { page: 1, limit: 10 });

      expect(result.transactions).toEqual(mockTransactions);
      expect(result.totalCount).toBe(2);
    });
  });

  describe('createTransferTransactions', () => {
    it('should create both debit and credit transactions for transfer', async () => {
      const mockDebitTransaction = {
        id: 1,
        type: TransactionType.DEBIT,
        amount: 500,
        reference: 'TXN123456789',
      };

      const mockCreditTransaction = {
        id: 2,
        type: TransactionType.CREDIT,
        amount: 500,
        reference: 'TXN123456789',
      };

      mockDb.returning
        .mockResolvedValueOnce([mockDebitTransaction])
        .mockResolvedValueOnce([mockCreditTransaction]);

      const result = await transactionRepository.createTransferTransactions(
        1, 2, 500, 'TXN123456789', 'Transfer'
      );

      expect(result.debitTransaction).toEqual(mockDebitTransaction);
      expect(result.creditTransaction).toEqual(mockCreditTransaction);
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAccountTransactionsSummary', () => {
    it('should return account transactions summary', async () => {
      const mockSummary = [
        {
          type: TransactionType.CREDIT,
          total_amount: 5000,
          transaction_count: 3,
        },
        {
          type: TransactionType.DEBIT,
          total_amount: 2000,
          transaction_count: 2,
        },
      ];

      mockDb.select.mockResolvedValue(mockSummary);

      const result = await transactionRepository.getAccountTransactionsSummary(1);

      expect(result.totalCredits).toBe(5000);
      expect(result.totalDebits).toBe(2000);
      expect(result.transactionCount).toBe(5);
    });
  });
});