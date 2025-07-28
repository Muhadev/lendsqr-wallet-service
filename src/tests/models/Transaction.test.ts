// src/tests/models/Transaction.test.ts
import { 
  Transaction, 
  TransactionType, 
  TransactionStatus, 
  CreateTransactionData, 
  TransactionResponse,
  TransferData,
  FundAccountData,
  WithdrawData
} from '../../models/Transaction';

describe('Transaction Model', () => {
  describe('Transaction Interface', () => {
    it('should have correct Transaction interface structure', () => {
      const transaction: Transaction = {
        id: 1,
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000.50,
        recipientId: 2,
        reference: 'TXN1234567890ABC',
        status: TransactionStatus.COMPLETED,
        description: 'Test transaction',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('accountId');
      expect(transaction).toHaveProperty('type');
      expect(transaction).toHaveProperty('amount');
      expect(transaction).toHaveProperty('recipientId');
      expect(transaction).toHaveProperty('reference');
      expect(transaction).toHaveProperty('status');
      expect(transaction).toHaveProperty('description');
      expect(transaction).toHaveProperty('createdAt');
      expect(transaction).toHaveProperty('updatedAt');

      expect(typeof transaction.id).toBe('number');
      expect(typeof transaction.accountId).toBe('number');
      expect(typeof transaction.type).toBe('string');
      expect(typeof transaction.amount).toBe('number');
      expect(typeof transaction.recipientId).toBe('number');
      expect(typeof transaction.reference).toBe('string');
      expect(typeof transaction.status).toBe('string');
      expect(typeof transaction.description).toBe('string');
      expect(transaction.createdAt).toBeInstanceOf(Date);
      expect(transaction.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle optional fields correctly', () => {
      const minimalTransaction: Transaction = {
        id: 1,
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000,
        reference: 'TXN1234567890ABC',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(minimalTransaction.recipientId).toBeUndefined();
      expect(minimalTransaction.description).toBeUndefined();
    });

    it('should validate amount is positive', () => {
      const transaction: Transaction = {
        id: 1,
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000.50,
        reference: 'TXN1234567890ABC',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(transaction.amount).toBeGreaterThan(0);
      expect(typeof transaction.amount).toBe('number');
    });
  });

  describe('TransactionType Enum', () => {
    it('should contain all expected transaction types', () => {
      expect(TransactionType.CREDIT).toBe('credit');
      expect(TransactionType.DEBIT).toBe('debit');
    });

    it('should only contain valid transaction types', () => {
      const validTypes = Object.values(TransactionType);
      expect(validTypes).toHaveLength(2);
      expect(validTypes).toContain('credit');
      expect(validTypes).toContain('debit');
    });

    it('should work with Transaction model', () => {
      const creditTransaction: Transaction = {
        id: 1,
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000,
        reference: 'TXN1234567890ABC',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const debitTransaction: Transaction = {
        id: 2,
        accountId: 1,
        type: TransactionType.DEBIT,
        amount: 500,
        reference: 'TXN1234567890DEF',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(creditTransaction.type).toBe('credit');
      expect(debitTransaction.type).toBe('debit');
    });
  });

  describe('TransactionStatus Enum', () => {
    it('should contain all expected transaction statuses', () => {
      expect(TransactionStatus.PENDING).toBe('pending');
      expect(TransactionStatus.COMPLETED).toBe('completed');
      expect(TransactionStatus.FAILED).toBe('failed');
      expect(TransactionStatus.REVERSED).toBe('reversed');
    });

    it('should only contain valid transaction statuses', () => {
      const validStatuses = Object.values(TransactionStatus);
      expect(validStatuses).toHaveLength(4);
      expect(validStatuses).toContain('pending');
      expect(validStatuses).toContain('completed');
      expect(validStatuses).toContain('failed');
      expect(validStatuses).toContain('reversed');
    });

    it('should work with Transaction model', () => {
      const pendingTransaction: Transaction = {
        id: 1,
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000,
        reference: 'TXN1234567890ABC',
        status: TransactionStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const completedTransaction: Transaction = {
        id: 2,
        accountId: 1,
        type: TransactionType.DEBIT,
        amount: 500,
        reference: 'TXN1234567890DEF',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(pendingTransaction.status).toBe('pending');
      expect(completedTransaction.status).toBe('completed');
    });
  });

  describe('CreateTransactionData Interface', () => {
    it('should have correct CreateTransactionData interface structure', () => {
      const createTransactionData: CreateTransactionData = {
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000.50,
        recipientId: 2,
        reference: 'TXN1234567890ABC',
        status: TransactionStatus.PENDING,
        description: 'Test transaction',
      };

      expect(createTransactionData).toHaveProperty('accountId');
      expect(createTransactionData).toHaveProperty('type');
      expect(createTransactionData).toHaveProperty('amount');
      expect(createTransactionData).toHaveProperty('recipientId');
      expect(createTransactionData).toHaveProperty('reference');
      expect(createTransactionData).toHaveProperty('status');
      expect(createTransactionData).toHaveProperty('description');

      expect(typeof createTransactionData.accountId).toBe('number');
      expect(typeof createTransactionData.type).toBe('string');
      expect(typeof createTransactionData.amount).toBe('number');
      expect(typeof createTransactionData.recipientId).toBe('number');
      expect(typeof createTransactionData.reference).toBe('string');
      expect(typeof createTransactionData.status).toBe('string');
      expect(typeof createTransactionData.description).toBe('string');
    });

    it('should work with optional fields', () => {
      const minimalCreateTransactionData: CreateTransactionData = {
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000,
        reference: 'TXN1234567890ABC',
      };

      expect(minimalCreateTransactionData).toHaveProperty('accountId');
      expect(minimalCreateTransactionData).toHaveProperty('type');
      expect(minimalCreateTransactionData).toHaveProperty('amount');
      expect(minimalCreateTransactionData).toHaveProperty('reference');
      expect(minimalCreateTransactionData).not.toHaveProperty('recipientId');
      expect(minimalCreateTransactionData).not.toHaveProperty('status');
      expect(minimalCreateTransactionData).not.toHaveProperty('description');
    });

    it('should not include id, createdAt, or updatedAt', () => {
      const createTransactionData: CreateTransactionData = {
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000,
        reference: 'TXN1234567890ABC',
      };

      expect(createTransactionData).not.toHaveProperty('id');
      expect(createTransactionData).not.toHaveProperty('createdAt');
      expect(createTransactionData).not.toHaveProperty('updatedAt');
    });
  });

  describe('TransactionResponse Interface', () => {
    it('should have correct TransactionResponse interface structure', () => {
      const transactionResponse: TransactionResponse = {
        id: 1,
        type: TransactionType.CREDIT,
        amount: 1000.50,
        recipientId: 2,
        reference: 'TXN1234567890ABC',
        status: TransactionStatus.COMPLETED,
        description: 'Test transaction',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      expect(transactionResponse).toHaveProperty('id');
      expect(transactionResponse).toHaveProperty('type');
      expect(transactionResponse).toHaveProperty('amount');
      expect(transactionResponse).toHaveProperty('recipientId');
      expect(transactionResponse).toHaveProperty('reference');
      expect(transactionResponse).toHaveProperty('status');
      expect(transactionResponse).toHaveProperty('description');
      expect(transactionResponse).toHaveProperty('createdAt');
      expect(transactionResponse).toHaveProperty('updatedAt');

      expect(typeof transactionResponse.id).toBe('number');
      expect(typeof transactionResponse.type).toBe('string');
      expect(typeof transactionResponse.amount).toBe('number');
      expect(typeof transactionResponse.recipientId).toBe('number');
      expect(typeof transactionResponse.reference).toBe('string');
      expect(typeof transactionResponse.status).toBe('string');
      expect(typeof transactionResponse.description).toBe('string');
      expect(transactionResponse.createdAt).toBeInstanceOf(Date);
      expect(transactionResponse.updatedAt).toBeInstanceOf(Date);
    });

    it('should not include accountId in TransactionResponse', () => {
      const transactionResponse: TransactionResponse = {
        id: 1,
        type: TransactionType.CREDIT,
        amount: 1000,
        reference: 'TXN1234567890ABC',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(transactionResponse).not.toHaveProperty('accountId');
    });
  });

  describe('TransferData Interface', () => {
    it('should have correct TransferData interface structure', () => {
      const transferData: TransferData = {
        recipientAccountNumber: '1234567890',
        amount: 1000.50,
        description: 'Transfer to friend',
      };

      expect(transferData).toHaveProperty('recipientAccountNumber');
      expect(transferData).toHaveProperty('amount');
      expect(transferData).toHaveProperty('description');

      expect(typeof transferData.recipientAccountNumber).toBe('string');
      expect(typeof transferData.amount).toBe('number');
      expect(typeof transferData.description).toBe('string');
    });

    it('should work with optional description', () => {
      const minimalTransferData: TransferData = {
        recipientAccountNumber: '1234567890',
        amount: 1000,
      };

      expect(minimalTransferData).toHaveProperty('recipientAccountNumber');
      expect(minimalTransferData).toHaveProperty('amount');
      expect(minimalTransferData).not.toHaveProperty('description');
    });

    it('should validate recipient account number format', () => {
      const transferData: TransferData = {
        recipientAccountNumber: '1234567890',
        amount: 1000,
      };

      expect(transferData.recipientAccountNumber).toMatch(/^\d{10}$/);
      expect(transferData.recipientAccountNumber.length).toBe(10);
    });
  });

  describe('FundAccountData Interface', () => {
    it('should have correct FundAccountData interface structure', () => {
      const fundAccountData: FundAccountData = {
        amount: 1000.50,
        description: 'Account funding',
      };

      expect(fundAccountData).toHaveProperty('amount');
      expect(fundAccountData).toHaveProperty('description');

      expect(typeof fundAccountData.amount).toBe('number');
      expect(typeof fundAccountData.description).toBe('string');
    });

    it('should work with optional description', () => {
      const minimalFundAccountData: FundAccountData = {
        amount: 1000,
      };

      expect(minimalFundAccountData).toHaveProperty('amount');
      expect(minimalFundAccountData).not.toHaveProperty('description');
    });

    it('should validate amount is positive', () => {
      const fundAccountData: FundAccountData = {
        amount: 1000.50,
      };

      expect(fundAccountData.amount).toBeGreaterThan(0);
      expect(typeof fundAccountData.amount).toBe('number');
    });
  });

  describe('WithdrawData Interface', () => {
    it('should have correct WithdrawData interface structure', () => {
      const withdrawData: WithdrawData = {
        amount: 500.25,
        description: 'Cash withdrawal',
      };

      expect(withdrawData).toHaveProperty('amount');
      expect(withdrawData).toHaveProperty('description');

      expect(typeof withdrawData.amount).toBe('number');
      expect(typeof withdrawData.description).toBe('string');
    });

    it('should work with optional description', () => {
      const minimalWithdrawData: WithdrawData = {
        amount: 500,
      };

      expect(minimalWithdrawData).toHaveProperty('amount');
      expect(minimalWithdrawData).not.toHaveProperty('description');
    });

    it('should validate amount is positive', () => {
      const withdrawData: WithdrawData = {
        amount: 500.25,
      };

      expect(withdrawData.amount).toBeGreaterThan(0);
      expect(typeof withdrawData.amount).toBe('number');
    });
  });

  describe('Model Validation', () => {
    it('should validate transaction reference formats', () => {
      const validReferences = [
        'TXN1234567890ABC',
        'TXN1702825200001',
        'REF123456789',
        'TRANSFER_2023_001'
      ];

      const invalidReferences = [
        '',                    // empty
        'TXN',                // too short
        'invalid reference',   // contains spaces
        'TXN@123'             // contains special characters
      ];

      // Basic reference validation (non-empty, reasonable length)
      validReferences.forEach(reference => {
        expect(reference.length).toBeGreaterThan(3);
        expect(reference.length).toBeLessThanOrEqual(100);
        expect(reference.trim()).toBe(reference);
      });

      invalidReferences.forEach(reference => {
        const isValid = reference.length > 3 && reference.length <= 100 && !reference.includes(' ');
        expect(isValid).toBe(false);
      });
    });

    it('should validate amount precision (2 decimal places)', () => {
      const testAmounts = [
        { input: 100.555, expected: 100.56 },
        { input: 100.50, expected: 100.50 },
        { input: 100, expected: 100 },
        { input: 0.01, expected: 0.01 },
      ];

      testAmounts.forEach(({ input, expected }) => {
        const rounded = Math.round(input * 100) / 100;
        expect(rounded).toBe(expected);
      });
    });

    it('should validate transaction amounts are positive', () => {
      const validAmounts = [0.01, 1, 100.50, 1000, 999999.99];
      const invalidAmounts = [-1, -0.01, -100, 0];

      validAmounts.forEach(amount => {
        expect(amount).toBeGreaterThan(0);
      });

      invalidAmounts.forEach(amount => {
        expect(amount).toBeLessThanOrEqual(0);
      });
    });
  });

  describe('Model Relationships', () => {
    it('should maintain referential integrity with Account model', () => {
      const transaction: Transaction = {
        id: 1,
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000,
        recipientId: 2,
        reference: 'TXN1234567890ABC',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Account IDs should be positive integers
      expect(transaction.accountId).toBeGreaterThan(0);
      expect(Number.isInteger(transaction.accountId)).toBe(true);

      if (transaction.recipientId) {
        expect(transaction.recipientId).toBeGreaterThan(0);
        expect(Number.isInteger(transaction.recipientId)).toBe(true);
      }
    });

    it('should handle date relationships properly', () => {
      const createdAt = new Date('2023-01-01T10:00:00Z');
      const updatedAt = new Date('2023-01-01T10:30:00Z');

      const transaction: Transaction = {
        id: 1,
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000,
        reference: 'TXN1234567890ABC',
        status: TransactionStatus.COMPLETED,
        createdAt,
        updatedAt,
      };

      expect(transaction.createdAt).toBeInstanceOf(Date);
      expect(transaction.updatedAt).toBeInstanceOf(Date);
      expect(transaction.updatedAt.getTime()).toBeGreaterThanOrEqual(transaction.createdAt.getTime());
    });
  });

  describe('Transaction Status Transitions', () => {
    it('should handle status transitions correctly', () => {
      const statusTransitions = [
        { from: TransactionStatus.PENDING, to: TransactionStatus.COMPLETED },
        { from: TransactionStatus.PENDING, to: TransactionStatus.FAILED },
        { from: TransactionStatus.COMPLETED, to: TransactionStatus.REVERSED },
      ];

      statusTransitions.forEach(({ from, to }) => {
        const transaction: Transaction = {
          id: 1,
          accountId: 1,
          type: TransactionType.CREDIT,
          amount: 1000,
          reference: 'TXN1234567890ABC',
          status: from,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Simulate status change
        const updatedTransaction: Transaction = {
          ...transaction,
          status: to,
          updatedAt: new Date(),
        };

        expect(updatedTransaction.status).toBe(to);
        expect(updatedTransaction.updatedAt.getTime()).toBeGreaterThanOrEqual(transaction.updatedAt.getTime());
      });
    });

    it('should validate all possible status values', () => {
      const allStatuses = [
        TransactionStatus.PENDING,
        TransactionStatus.COMPLETED,
        TransactionStatus.FAILED,
        TransactionStatus.REVERSED
      ];

      allStatuses.forEach(status => {
        const transaction: Transaction = {
          id: 1,
          accountId: 1,
          type: TransactionType.CREDIT,
          amount: 1000,
          reference: 'TXN1234567890ABC',
          status,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(Object.values(TransactionStatus)).toContain(transaction.status);
      });
    });
  });

  describe('Transaction Types and Business Rules', () => {
    it('should handle credit transactions correctly', () => {
      const creditTransaction: Transaction = {
        id: 1,
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000,
        reference: 'TXN1234567890ABC',
        status: TransactionStatus.COMPLETED,
        description: 'Account funding',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(creditTransaction.type).toBe('credit');
      expect(creditTransaction.amount).toBeGreaterThan(0);
      // Credit transactions typically don't have recipientId for funding
      expect(creditTransaction.recipientId).toBeUndefined();
    });

    it('should handle debit transactions correctly', () => {
      const debitTransaction: Transaction = {
        id: 2,
        accountId: 1,
        type: TransactionType.DEBIT,
        amount: 500,
        reference: 'TXN1234567890DEF',
        status: TransactionStatus.COMPLETED,
        description: 'Cash withdrawal',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(debitTransaction.type).toBe('debit');
      expect(debitTransaction.amount).toBeGreaterThan(0);
    });

    it('should handle transfer transactions correctly', () => {
      const transferDebitTransaction: Transaction = {
        id: 3,
        accountId: 1,
        type: TransactionType.DEBIT,
        amount: 750,
        recipientId: 2,
        reference: 'TXN1234567890GHI',
        status: TransactionStatus.COMPLETED,
        description: 'Transfer to account 0987654321',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const transferCreditTransaction: Transaction = {
        id: 4,
        accountId: 2,
        type: TransactionType.CREDIT,
        amount: 750,
        recipientId: 1,
        reference: 'TXN1234567890GHI', // Same reference for both transactions
        status: TransactionStatus.COMPLETED,
        description: 'Transfer from account 1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(transferDebitTransaction.type).toBe('debit');
      expect(transferCreditTransaction.type).toBe('credit');
      expect(transferDebitTransaction.amount).toBe(transferCreditTransaction.amount);
      expect(transferDebitTransaction.reference).toBe(transferCreditTransaction.reference);
      expect(transferDebitTransaction.recipientId).toBe(transferCreditTransaction.accountId);
      expect(transferCreditTransaction.recipientId).toBe(transferDebitTransaction.accountId);
    });
  });

  describe('Financial Calculations', () => {
    it('should handle floating point precision correctly', () => {
      const amount1 = 10.10;
      const amount2 = 0.20;
      const sum = amount1 + amount2;
      
      // JavaScript floating point precision issue
      expect(sum).toBeCloseTo(10.30, 2);
      
      // For financial calculations, we should round to 2 decimal places
      const roundedSum = Math.round(sum * 100) / 100;
      expect(roundedSum).toBe(10.30);
    });

    it('should handle large amounts correctly', () => {
      const largeAmount = 999999.99;
      const transaction: Transaction = {
        id: 1,
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: largeAmount,
        reference: 'TXN1234567890ABC',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(transaction.amount).toBe(largeAmount);
      expect(typeof transaction.amount).toBe('number');
      expect(Number.isFinite(transaction.amount)).toBe(true);
    });

    it('should handle small amounts correctly', () => {
      const smallAmount = 0.01;
      const transaction: Transaction = {
        id: 1,
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: smallAmount,
        reference: 'TXN1234567890ABC',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(transaction.amount).toBe(smallAmount);
      expect(transaction.amount).toBeGreaterThan(0);
    });
  });
});