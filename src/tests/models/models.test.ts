// src/tests/models/models.test.ts
import { 
  User, 
  CreateUserData, 
  LoginCredentials,
  Account,
  CreateAccountData,
  AccountStatus,
  Transaction,
  CreateTransactionData,
  TransactionType,
  TransactionStatus,
  TransferData,
  FundAccountData,
  WithdrawData
} from '../../types';

describe('Model Validation Tests', () => {
  describe('User Model', () => {
    const validUser: User = {
      id: 1,
      email: 'test@example.com',
      phone: '08123456789',
      firstName: 'John',
      lastName: 'Doe',
      bvn: '12345678901',
      passwordHash: 'hashedpassword123',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a valid user object', () => {
      expect(validUser.id).toBe(1);
      expect(validUser.email).toBe('test@example.com');
      expect(validUser.phone).toBe('08123456789');
      expect(validUser.firstName).toBe('John');
      expect(validUser.lastName).toBe('Doe');
      expect(validUser.bvn).toBe('12345678901');
      expect(validUser.passwordHash).toBe('hashedpassword123');
      expect(validUser.isActive).toBe(true);
      expect(validUser.createdAt).toBeInstanceOf(Date);
      expect(validUser.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate CreateUserData structure', () => {
      const createUserData: CreateUserData = {
        email: 'newuser@example.com',
        phone: '08198765432',
        firstName: 'Jane',
        lastName: 'Smith',
        bvn: '98765432101',
        password: 'SecurePass123',
      };

      expect(createUserData).toHaveProperty('email');
      expect(createUserData).toHaveProperty('phone');
      expect(createUserData).toHaveProperty('firstName');
      expect(createUserData).toHaveProperty('lastName');
      expect(createUserData).toHaveProperty('bvn');
      expect(createUserData).toHaveProperty('password');
      expect(createUserData).not.toHaveProperty('passwordHash');
      expect(createUserData).not.toHaveProperty('id');
    });

    it('should validate LoginCredentials structure', () => {
      const loginCredentials: LoginCredentials = {
        email: 'user@example.com',
        password: 'password123',
      };

      expect(loginCredentials).toHaveProperty('email');
      expect(loginCredentials).toHaveProperty('password');
      expect(Object.keys(loginCredentials)).toHaveLength(2);
    });
  });

  describe('Account Model', () => {
    const validAccount: Account = {
      id: 1,
      userId: 1,
      accountNumber: '1234567890',
      balance: 5000.50,
      status: AccountStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a valid account object', () => {
      expect(validAccount.id).toBe(1);
      expect(validAccount.userId).toBe(1);
      expect(validAccount.accountNumber).toBe('1234567890');
      expect(validAccount.balance).toBe(5000.50);
      expect(validAccount.status).toBe(AccountStatus.ACTIVE);
      expect(validAccount.createdAt).toBeInstanceOf(Date);
      expect(validAccount.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate AccountStatus enum values', () => {
      expect(AccountStatus.ACTIVE).toBe('active');
      expect(AccountStatus.INACTIVE).toBe('inactive');
      expect(AccountStatus.SUSPENDED).toBe('suspended');
      
      // Test all possible statuses
      const statuses = Object.values(AccountStatus);
      expect(statuses).toContain('active');
      expect(statuses).toContain('inactive');
      expect(statuses).toContain('suspended');
    });

    it('should validate CreateAccountData structure', () => {
      const createAccountData: CreateAccountData = {
        userId: 1,
        accountNumber: '9876543210',
        balance: 0,
        status: AccountStatus.ACTIVE,
      };

      expect(createAccountData).toHaveProperty('userId');
      expect(createAccountData).toHaveProperty('accountNumber');
      expect(createAccountData).toHaveProperty('balance');
      expect(createAccountData).toHaveProperty('status');
      expect(createAccountData).not.toHaveProperty('id');
      expect(createAccountData).not.toHaveProperty('createdAt');
    });

    it('should handle optional fields in CreateAccountData', () => {
      const minimalCreateData: CreateAccountData = {
        userId: 2,
        accountNumber: '5555555555',
      };

      expect(minimalCreateData.userId).toBe(2);
      expect(minimalCreateData.accountNumber).toBe('5555555555');
      expect(minimalCreateData.balance).toBeUndefined();
      expect(minimalCreateData.status).toBeUndefined();
    });
  });

  describe('Transaction Model', () => {
    const validTransaction: Transaction = {
      id: 1,
      accountId: 1,
      type: TransactionType.CREDIT,
      amount: 1000,
      recipientId: 2,
      reference: 'TXN1640995200123ABC',
      status: TransactionStatus.COMPLETED,
      description: 'Fund transfer',
      metadata: { paymentMethod: 'bank_transfer' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a valid transaction object', () => {
      expect(validTransaction.id).toBe(1);
      expect(validTransaction.accountId).toBe(1);
      expect(validTransaction.type).toBe(TransactionType.CREDIT);
      expect(validTransaction.amount).toBe(1000);
      expect(validTransaction.recipientId).toBe(2);
      expect(validTransaction.reference).toBe('TXN1640995200123ABC');
      expect(validTransaction.status).toBe(TransactionStatus.COMPLETED);
      expect(validTransaction.description).toBe('Fund transfer');
      expect(validTransaction.metadata).toEqual({ paymentMethod: 'bank_transfer' });
      expect(validTransaction.createdAt).toBeInstanceOf(Date);
      expect(validTransaction.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate TransactionType enum values', () => {
      expect(TransactionType.CREDIT).toBe('credit');
      expect(TransactionType.DEBIT).toBe('debit');
      
      const types = Object.values(TransactionType);
      expect(types).toContain('credit');
      expect(types).toContain('debit');
    });

    it('should validate TransactionStatus enum values', () => {
      expect(TransactionStatus.PENDING).toBe('pending');
      expect(TransactionStatus.COMPLETED).toBe('completed');
      expect(TransactionStatus.FAILED).toBe('failed');
      expect(TransactionStatus.REVERSED).toBe('reversed');
      
      const statuses = Object.values(TransactionStatus);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('failed');
      expect(statuses).toContain('reversed');
    });

    it('should validate CreateTransactionData structure', () => {
      const createTransactionData: CreateTransactionData = {
        accountId: 1,
        type: TransactionType.DEBIT,
        amount: 500,
        reference: 'TXN1640995300456DEF',
        status: TransactionStatus.PENDING,
        description: 'ATM withdrawal',
        metadata: { atmId: 'ATM001', location: 'Lagos' },
      };

      expect(createTransactionData).toHaveProperty('accountId');
      expect(createTransactionData).toHaveProperty('type');
      expect(createTransactionData).toHaveProperty('amount');
      expect(createTransactionData).toHaveProperty('reference');
      expect(createTransactionData).toHaveProperty('status');
      expect(createTransactionData).toHaveProperty('description');
      expect(createTransactionData).toHaveProperty('metadata');
      expect(createTransactionData).not.toHaveProperty('id');
    });

    it('should handle optional fields in CreateTransactionData', () => {
      const minimalCreateData: CreateTransactionData = {
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 200,
        reference: 'TXN1640995400789GHI',
      };

      expect(minimalCreateData.accountId).toBe(1);
      expect(minimalCreateData.type).toBe(TransactionType.CREDIT);
      expect(minimalCreateData.amount).toBe(200);
      expect(minimalCreateData.reference).toBe('TXN1640995400789GHI');
      expect(minimalCreateData.recipientId).toBeUndefined();
      expect(minimalCreateData.status).toBeUndefined();
      expect(minimalCreateData.description).toBeUndefined();
      expect(minimalCreateData.metadata).toBeUndefined();
    });
  });

  describe('Wallet Operation Models', () => {
    describe('TransferData', () => {
      it('should validate TransferData structure', () => {
        const transferData: TransferData = {
          recipientAccountNumber: '9876543210',
          amount: 1500,
          description: 'Payment for services',
          pin: '1234',
        };

        expect(transferData).toHaveProperty('recipientAccountNumber');
        expect(transferData).toHaveProperty('amount');
        expect(transferData).toHaveProperty('description');
        expect(transferData).toHaveProperty('pin');
        expect(transferData.recipientAccountNumber).toBe('9876543210');
        expect(transferData.amount).toBe(1500);
      });

      it('should handle optional fields in TransferData', () => {
        const minimalTransfer: TransferData = {
          recipientAccountNumber: '1111111111',
          amount: 500,
        };

        expect(minimalTransfer.recipientAccountNumber).toBe('1111111111');
        expect(minimalTransfer.amount).toBe(500);
        expect(minimalTransfer.description).toBeUndefined();
        expect(minimalTransfer.pin).toBeUndefined();
      });
    });

    describe('FundAccountData', () => {
      it('should validate FundAccountData structure', () => {
        const fundData: FundAccountData = {
          amount: 2000,
          description: 'Account funding via bank transfer',
          paymentMethod: 'bank_transfer',
          paymentReference: 'PAY123456789',
        };

        expect(fundData).toHaveProperty('amount');
        expect(fundData).toHaveProperty('description');
        expect(fundData).toHaveProperty('paymentMethod');
        expect(fundData).toHaveProperty('paymentReference');
        expect(fundData.amount).toBe(2000);
        expect(fundData.paymentMethod).toBe('bank_transfer');
      });

      it('should handle optional fields in FundAccountData', () => {
        const minimalFund: FundAccountData = {
          amount: 1000,
        };

        expect(minimalFund.amount).toBe(1000);
        expect(minimalFund.description).toBeUndefined();
        expect(minimalFund.paymentMethod).toBeUndefined();
        expect(minimalFund.paymentReference).toBeUndefined();
      });
    });

    describe('WithdrawData', () => {
      it('should validate WithdrawData structure', () => {
        const withdrawData: WithdrawData = {
          amount: 800,
          description: 'Cash withdrawal',
          withdrawalMethod: 'atm',
          destinationAccount: '2222222222',
        };

        expect(withdrawData).toHaveProperty('amount');
        expect(withdrawData).toHaveProperty('description');
        expect(withdrawData).toHaveProperty('withdrawalMethod');
        expect(withdrawData).toHaveProperty('destinationAccount');
        expect(withdrawData.amount).toBe(800);
        expect(withdrawData.withdrawalMethod).toBe('atm');
      });

      it('should handle optional fields in WithdrawData', () => {
        const minimalWithdraw: WithdrawData = {
          amount: 300,
        };

        expect(minimalWithdraw.amount).toBe(300);
        expect(minimalWithdraw.description).toBeUndefined();
        expect(minimalWithdraw.withdrawalMethod).toBeUndefined();
        expect(minimalWithdraw.destinationAccount).toBeUndefined();
      });
    });
  });

  describe('Data Type Validation', () => {
    it('should validate numeric fields are numbers', () => {
      const account: Account = {
        id: 1,
        userId: 1,
        accountNumber: '1234567890',
        balance: 1000.50,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(typeof account.id).toBe('number');
      expect(typeof account.userId).toBe('number');
      expect(typeof account.balance).toBe('number');
      expect(account.balance % 1).not.toBe(0); // Has decimal places
    });

    it('should validate string fields are strings', () => {
      const user: CreateUserData = {
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        password: 'password123',
      };

      expect(typeof user.email).toBe('string');
      expect(typeof user.phone).toBe('string');
      expect(typeof user.firstName).toBe('string');
      expect(typeof user.lastName).toBe('string');
      expect(typeof user.bvn).toBe('string');
      expect(typeof user.password).toBe('string');
    });

    it('should validate date fields are Date objects', () => {
      const transaction: Transaction = {
        id: 1,
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 500,
        reference: 'TXN123',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };

      expect(transaction.createdAt).toBeInstanceOf(Date);
      expect(transaction.updatedAt).toBeInstanceOf(Date);
      expect(transaction.createdAt.getTime()).toBeLessThan(transaction.updatedAt.getTime());
    });

    it('should validate boolean fields are booleans', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        phone: '08123456789',
        firstName: 'John',
        lastName: 'Doe',
        bvn: '12345678901',
        passwordHash: 'hashedpassword',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(typeof user.isActive).toBe('boolean');
      expect(user.isActive).toBe(true);
    });
  });

  describe('Edge Cases and Boundary Values', () => {
    it('should handle zero amounts', () => {
      const zeroAmount: FundAccountData = {
        amount: 0,
        description: 'Zero amount test',
      };

      expect(zeroAmount.amount).toBe(0);
      expect(typeof zeroAmount.amount).toBe('number');
    });

    it('should handle negative amounts', () => {
      const negativeAmount: WithdrawData = {
        amount: -100,
        description: 'Negative amount test',
      };

      expect(negativeAmount.amount).toBe(-100);
      expect(negativeAmount.amount < 0).toBe(true);
    });

    it('should handle very large amounts', () => {
      const largeAmount: TransferData = {
        recipientAccountNumber: '1234567890',
        amount: 999999999.99,
      };

      expect(largeAmount.amount).toBe(999999999.99);
      expect(largeAmount.amount > 1000000).toBe(true);
    });

    it('should handle empty strings', () => {
      const emptyStrings: CreateUserData = {
        email: '',
        phone: '',
        firstName: '',
        lastName: '',
        bvn: '',
        password: '',
      };

      expect(emptyStrings.email).toBe('');
      expect(emptyStrings.phone).toBe('');
      expect(emptyStrings.firstName).toBe('');
      expect(emptyStrings.lastName).toBe('');
      expect(emptyStrings.bvn).toBe('');
      expect(emptyStrings.password).toBe('');
    });

    it('should handle special characters in strings', () => {
      const specialChars: CreateUserData = {
        email: 'test+special@example.com',
        phone: '+234-812-345-6789',
        firstName: "O'Connor",
        lastName: 'Smith-Jones',
        bvn: '12345678901',
        password: 'P@ssw0rd!',
      };

      expect(specialChars.email).toContain('+');
      expect(specialChars.phone).toContain('-');
      expect(specialChars.firstName).toContain("'");
      expect(specialChars.lastName).toContain('-');
      expect(specialChars.password).toMatch(/[!@#$%^&*]/);
    });
  });
});