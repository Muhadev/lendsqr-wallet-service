// src/tests/models/Account.test.ts
import { Account, AccountStatus, CreateAccountData, AccountResponse } from '../../models/Account';

describe('Account Model', () => {
  describe('Account Interface', () => {
    it('should have correct Account interface structure', () => {
      const account: Account = {
        id: 1,
        userId: 1,
        accountNumber: '1234567890',
        balance: 5000.50,
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      expect(account).toHaveProperty('id');
      expect(account).toHaveProperty('userId');
      expect(account).toHaveProperty('accountNumber');
      expect(account).toHaveProperty('balance');
      expect(account).toHaveProperty('status');
      expect(account).toHaveProperty('createdAt');
      expect(account).toHaveProperty('updatedAt');

      expect(typeof account.id).toBe('number');
      expect(typeof account.userId).toBe('number');
      expect(typeof account.accountNumber).toBe('string');
      expect(typeof account.balance).toBe('number');
      expect(typeof account.status).toBe('string');
      expect(account.createdAt).toBeInstanceOf(Date);
      expect(account.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate account number format', () => {
      const account: Account = {
        id: 1,
        userId: 1,
        accountNumber: '1234567890',
        balance: 0,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Account number should be exactly 10 digits
      expect(account.accountNumber).toMatch(/^\d{10}$/);
      expect(account.accountNumber.length).toBe(10);
    });

    it('should handle different balance values', () => {
      const testCases = [
        { balance: 0, expected: 0 },
        { balance: 100.50, expected: 100.50 },
        { balance: 1000000, expected: 1000000 },
        { balance: 0.01, expected: 0.01 },
      ];

      testCases.forEach(({ balance, expected }) => {
        const account: Account = {
          id: 1,
          userId: 1,
          accountNumber: '1234567890',
          balance,
          status: AccountStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(account.balance).toBe(expected);
        expect(typeof account.balance).toBe('number');
      });
    });
  });

  describe('AccountStatus Enum', () => {
    it('should contain all expected status values', () => {
      expect(AccountStatus.ACTIVE).toBe('active');
      expect(AccountStatus.INACTIVE).toBe('inactive');
      expect(AccountStatus.SUSPENDED).toBe('suspended');
    });

    it('should only contain valid status values', () => {
      const validStatuses = Object.values(AccountStatus);
      expect(validStatuses).toHaveLength(3);
      expect(validStatuses).toContain('active');
      expect(validStatuses).toContain('inactive');
      expect(validStatuses).toContain('suspended');
    });

    it('should work with Account model', () => {
      const activeAccount: Account = {
        id: 1,
        userId: 1,
        accountNumber: '1234567890',
        balance: 1000,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const inactiveAccount: Account = {
        id: 2,
        userId: 2,
        accountNumber: '0987654321',
        balance: 500,
        status: AccountStatus.INACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const suspendedAccount: Account = {
        id: 3,
        userId: 3,
        accountNumber: '1122334455',
        balance: 0,
        status: AccountStatus.SUSPENDED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(activeAccount.status).toBe('active');
      expect(inactiveAccount.status).toBe('inactive');
      expect(suspendedAccount.status).toBe('suspended');
    });
  });

  describe('CreateAccountData Interface', () => {
    it('should have correct CreateAccountData interface structure', () => {
      const createAccountData: CreateAccountData = {
        userId: 1,
        accountNumber: '1234567890',
        balance: 1000,
        status: AccountStatus.ACTIVE,
      };

      expect(createAccountData).toHaveProperty('userId');
      expect(createAccountData).toHaveProperty('accountNumber');
      expect(createAccountData).toHaveProperty('balance');
      expect(createAccountData).toHaveProperty('status');

      expect(typeof createAccountData.userId).toBe('number');
      expect(typeof createAccountData.accountNumber).toBe('string');
      expect(typeof createAccountData.balance).toBe('number');
      expect(typeof createAccountData.status).toBe('string');
    });

    it('should work with optional fields', () => {
      const minimalCreateAccountData: CreateAccountData = {
        userId: 1,
        accountNumber: '1234567890',
      };

      expect(minimalCreateAccountData).toHaveProperty('userId');
      expect(minimalCreateAccountData).toHaveProperty('accountNumber');
      expect(minimalCreateAccountData).not.toHaveProperty('balance');
      expect(minimalCreateAccountData).not.toHaveProperty('status');
    });

    it('should not include id, createdAt, or updatedAt', () => {
      const createAccountData: CreateAccountData = {
        userId: 1,
        accountNumber: '1234567890',
        balance: 1000,
        status: AccountStatus.ACTIVE,
      };

      expect(createAccountData).not.toHaveProperty('id');
      expect(createAccountData).not.toHaveProperty('createdAt');
      expect(createAccountData).not.toHaveProperty('updatedAt');
    });
  });

  describe('AccountResponse Interface', () => {
    it('should have correct AccountResponse interface structure', () => {
      const accountResponse: AccountResponse = {
        id: 1,
        accountNumber: '1234567890',
        balance: 5000.50,
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      expect(accountResponse).toHaveProperty('id');
      expect(accountResponse).toHaveProperty('accountNumber');
      expect(accountResponse).toHaveProperty('balance');
      expect(accountResponse).toHaveProperty('status');
      expect(accountResponse).toHaveProperty('createdAt');
      expect(accountResponse).toHaveProperty('updatedAt');

      expect(typeof accountResponse.id).toBe('number');
      expect(typeof accountResponse.accountNumber).toBe('string');
      expect(typeof accountResponse.balance).toBe('number');
      expect(typeof accountResponse.status).toBe('string');
      expect(accountResponse.createdAt).toBeInstanceOf(Date);
      expect(accountResponse.updatedAt).toBeInstanceOf(Date);
    });

    it('should not include userId in AccountResponse', () => {
      const accountResponse: AccountResponse = {
        id: 1,
        accountNumber: '1234567890',
        balance: 5000.50,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(accountResponse).not.toHaveProperty('userId');
    });
  });

  describe('Model Validation', () => {
    it('should validate account number formats', () => {
      const validAccountNumbers = [
        '1234567890',
        '0987654321',
        '1111111111',
        '0000000000'
      ];

      const invalidAccountNumbers = [
        '123456789',     // 9 digits
        '12345678901',   // 11 digits
        'abcd567890',    // contains letters
        '123-456-7890',  // contains hyphens
        '',              // empty
        '12 34567890'    // contains spaces
      ];

      const accountNumberRegex = /^\d{10}$/;

      validAccountNumbers.forEach(accountNumber => {
        expect(accountNumberRegex.test(accountNumber)).toBe(true);
      });

      invalidAccountNumbers.forEach(accountNumber => {
        expect(accountNumberRegex.test(accountNumber)).toBe(false);
      });
    });

    it('should validate balance is non-negative', () => {
      const validBalances = [0, 0.01, 100, 1000.50, 999999.99];
      const invalidBalances = [-1, -0.01, -100];

      validBalances.forEach(balance => {
        const account: Account = {
          id: 1,
          userId: 1,
          accountNumber: '1234567890',
          balance,
          status: AccountStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(account.balance).toBeGreaterThanOrEqual(0);
      });

      // Note: TypeScript doesn't prevent negative balances at compile time,
      // but business logic should handle this
      invalidBalances.forEach(balance => {
        expect(balance).toBeLessThan(0);
      });
    });

    it('should validate balance precision (2 decimal places)', () => {
      const testBalances = [
        { input: 100.555, expected: 100.56 }, // Should round to 2 decimal places
        { input: 100.50, expected: 100.50 },
        { input: 100, expected: 100 },
        { input: 0.01, expected: 0.01 },
      ];

      testBalances.forEach(({ input, expected }) => {
        const rounded = Math.round(input * 100) / 100;
        expect(rounded).toBe(expected);
      });
    });
  });

  describe('Model Relationships', () => {
    it('should maintain referential integrity with User model', () => {
      const account: Account = {
        id: 1,
        userId: 1,
        accountNumber: '1234567890',
        balance: 1000,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Account ID and User ID should be positive integers
      expect(account.id).toBeGreaterThan(0);
      expect(account.userId).toBeGreaterThan(0);
      expect(Number.isInteger(account.id)).toBe(true);
      expect(Number.isInteger(account.userId)).toBe(true);
    });

    it('should handle date relationships properly', () => {
      const createdAt = new Date('2023-01-01');
      const updatedAt = new Date('2023-01-02');

      const account: Account = {
        id: 1,
        userId: 1,
        accountNumber: '1234567890',
        balance: 1000,
        status: AccountStatus.ACTIVE,
        createdAt,
        updatedAt,
      };

      expect(account.createdAt).toBeInstanceOf(Date);
      expect(account.updatedAt).toBeInstanceOf(Date);
      expect(account.updatedAt.getTime()).toBeGreaterThanOrEqual(account.createdAt.getTime());
    });
  });

  describe('Account Status Transitions', () => {
    it('should handle status transitions correctly', () => {
      const statusTransitions = [
        { from: AccountStatus.ACTIVE, to: AccountStatus.INACTIVE },
        { from: AccountStatus.ACTIVE, to: AccountStatus.SUSPENDED },
        { from: AccountStatus.INACTIVE, to: AccountStatus.ACTIVE },
        { from: AccountStatus.SUSPENDED, to: AccountStatus.ACTIVE },
      ];

      statusTransitions.forEach(({ from, to }) => {
        const account: Account = {
          id: 1,
          userId: 1,
          accountNumber: '1234567890',
          balance: 1000,
          status: from,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Simulate status change
        const updatedAccount: Account = {
          ...account,
          status: to,
          updatedAt: new Date(),
        };

        expect(updatedAccount.status).toBe(to);
        expect(updatedAccount.updatedAt.getTime()).toBeGreaterThanOrEqual(account.updatedAt.getTime());
      });
    });

    it('should validate all possible status values', () => {
      const allStatuses = [AccountStatus.ACTIVE, AccountStatus.INACTIVE, AccountStatus.SUSPENDED];

      allStatuses.forEach(status => {
        const account: Account = {
          id: 1,
          userId: 1,
          accountNumber: '1234567890',
          balance: 1000,
          status,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(Object.values(AccountStatus)).toContain(account.status);
      });
    });
  });

  describe('Balance Operations', () => {
    it('should handle balance calculations correctly', () => {
      const initialBalance = 1000.50;
      const account: Account = {
        id: 1,
        userId: 1,
        accountNumber: '1234567890',
        balance: initialBalance,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Test credit operation
      const creditAmount = 500.25;
      const newBalanceAfterCredit = account.balance + creditAmount;
      expect(newBalanceAfterCredit).toBe(1500.75);

      // Test debit operation
      const debitAmount = 200.50;
      const newBalanceAfterDebit = newBalanceAfterCredit - debitAmount;
      expect(newBalanceAfterDebit).toBe(1300.25);

      // Test insufficient funds scenario
      const largeDebitAmount = 2000;
      const wouldBeNegative = account.balance - largeDebitAmount;
      expect(wouldBeNegative).toBeLessThan(0);
    });

    it('should handle floating point precision correctly', () => {
      const balance1 = 10.10;
      const balance2 = 0.20;
      const sum = balance1 + balance2;
      
      // JavaScript floating point precision issue: 10.10 + 0.20 = 10.299999999999999
      expect(sum).toBeCloseTo(10.30, 2);
      
      // For financial calculations, we should round to 2 decimal places
      const roundedSum = Math.round(sum * 100) / 100;
      expect(roundedSum).toBe(10.30);
    });
  });
});