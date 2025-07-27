// walletService.test.ts
import { WalletService } from '../../services/WalletService';
import { AccountRepository } from '../../repositories/AccountRepository';
import { TransactionRepository } from '../../repositories/TransactionRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { db } from '../../config/database';
import { 
  TransactionType, 
  TransactionStatus,
  FundAccountData,
  TransferData,
  WithdrawData 
} from '../../models/Transaction';
import { AccountStatus } from '../../models/Account';
import { 
  NotFoundError, 
  ValidationError, 
  InsufficientFundsError,
  AppError 
} from '../../utils/AppError';

// Mock the repositories
jest.mock('../../repositories/AccountRepository');
jest.mock('../../repositories/TransactionRepository');
jest.mock('../../repositories/UserRepository');
jest.mock('../../config/database');

describe('WalletService', () => {
  let walletService: WalletService;
  let mockAccountRepository: jest.Mocked<AccountRepository>;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockDb: any;

  const mockAccount = {
    id: 1,
    userId: 1,
    accountNumber: '1234567890',
    balance: 1000,
    status: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction = {
    id: 1,
    accountId: 1,
    type: TransactionType.CREDIT,
    amount: 500,
    reference: 'TXN123456789',
    status: TransactionStatus.COMPLETED,
    description: 'Test transaction',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create service instance
    walletService = new WalletService();

    // Get mocked instances
    mockAccountRepository = AccountRepository.prototype as jest.Mocked<AccountRepository>;
    mockTransactionRepository = TransactionRepository.prototype as jest.Mocked<TransactionRepository>;
    mockUserRepository = UserRepository.prototype as jest.Mocked<UserRepository>;

    // Mock database transaction
    mockDb = {
      transaction: jest.fn().mockImplementation((callback) => callback({})),
    };
    (db as any) = mockDb;
  });

  describe('getBalance', () => {
    it('should return wallet balance successfully', async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);

      const result = await walletService.getBalance(1);

      expect(result).toEqual({
        accountNumber: mockAccount.accountNumber,
        balance: mockAccount.balance,
        status: mockAccount.status,
      });
      expect(mockAccountRepository.findByUserId).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when account does not exist', async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(null);

      await expect(walletService.getBalance(1)).rejects.toThrow(NotFoundError);
      expect(mockAccountRepository.findByUserId).toHaveBeenCalledWith(1);
    });
  });

  describe('fundAccount', () => {
    const fundData: FundAccountData = {
      amount: 500,
      description: 'Test funding',
    };

    it('should fund account successfully', async () => {
      const updatedAccount = { ...mockAccount, balance: 1500 };
      
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockDb.transaction.mockImplementation((callback) => 
        callback({}).then(() => ({
          transaction: mockTransaction,
          newBalance: 1500,
        }))
      );
      mockTransactionRepository.create.mockResolvedValue(mockTransaction);
      mockAccountRepository.updateBalance.mockResolvedValue(updatedAccount);

      const result = await walletService.fundAccount(1, fundData);

      expect(result.newBalance).toBe(1500);
      expect(result.transaction.amount).toBe(500);
      expect(mockAccountRepository.findByUserId).toHaveBeenCalledWith(1);
    });

    it('should throw ValidationError for zero amount', async () => {
      const invalidFundData = { ...fundData, amount: 0 };

      await expect(walletService.fundAccount(1, invalidFundData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for amount below minimum', async () => {
      const invalidFundData = { ...fundData, amount: 50 };

      await expect(walletService.fundAccount(1, invalidFundData)).rejects.toThrow(
        new ValidationError('Minimum funding amount is ₦100')
      );
    });

    it('should throw ValidationError for amount above maximum', async () => {
      const invalidFundData = { ...fundData, amount: 2000000 };

      await expect(walletService.fundAccount(1, invalidFundData)).rejects.toThrow(
        new ValidationError('Maximum funding amount is ₦1,000,000')
      );
    });

    it('should throw AppError for inactive account', async () => {
      const inactiveAccount = { ...mockAccount, status: AccountStatus.SUSPENDED };
      mockAccountRepository.findByUserId.mockResolvedValue(inactiveAccount);

      await expect(walletService.fundAccount(1, fundData)).rejects.toThrow(
        new AppError('Account is not active', 403)
      );
    });

    it('should throw NotFoundError when account does not exist', async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(null);

      await expect(walletService.fundAccount(1, fundData)).rejects.toThrow(NotFoundError);
    });
  });

  describe('transferFunds', () => {
    const transferData: TransferData = {
      recipientAccountNumber: '0987654321',
      amount: 300,
      description: 'Test transfer',
    };

    const mockRecipientAccount = {
      id: 2,
      userId: 2,
      accountNumber: '0987654321',
      balance: 500,
      status: AccountStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should transfer funds successfully', async () => {
      const updatedSenderAccount = { ...mockAccount, balance: 700 };
      
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockAccountRepository.findByAccountNumber.mockResolvedValue(mockRecipientAccount);
      mockDb.transaction.mockImplementation((callback) => 
        callback({}).then(() => ({
          transaction: { ...mockTransaction, type: TransactionType.DEBIT },
          newBalance: 700,
        }))
      );
      mockAccountRepository.transferFunds.mockResolvedValue({
        senderAccount: updatedSenderAccount,
        recipientAccount: mockRecipientAccount,
      });
      mockTransactionRepository.createTransferTransactions.mockResolvedValue({
        debitTransaction: { ...mockTransaction, type: TransactionType.DEBIT },
        creditTransaction: { ...mockTransaction, type: TransactionType.CREDIT },
      });

      const result = await walletService.transferFunds(1, transferData);

      expect(result.newBalance).toBe(700);
      expect(mockAccountRepository.findByUserId).toHaveBeenCalledWith(1);
      expect(mockAccountRepository.findByAccountNumber).toHaveBeenCalledWith('0987654321');
    });

    it('should throw ValidationError for zero amount', async () => {
      const invalidTransferData = { ...transferData, amount: 0 };

      await expect(walletService.transferFunds(1, invalidTransferData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for amount below minimum', async () => {
      const invalidTransferData = { ...transferData, amount: 5 };

      await expect(walletService.transferFunds(1, invalidTransferData)).rejects.toThrow(
        new ValidationError('Minimum transfer amount is ₦10')
      );
    });

    it('should throw ValidationError for self transfer', async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockAccountRepository.findByAccountNumber.mockResolvedValue(mockAccount);

      await expect(walletService.transferFunds(1, transferData)).rejects.toThrow(
        new ValidationError('Cannot transfer funds to the same account')
      );
    });

    it('should throw InsufficientFundsError for insufficient balance', async () => {
      const lowBalanceAccount = { ...mockAccount, balance: 100 };
      mockAccountRepository.findByUserId.mockResolvedValue(lowBalanceAccount);
      mockAccountRepository.findByAccountNumber.mockResolvedValue(mockRecipientAccount);

      await expect(walletService.transferFunds(1, transferData)).rejects.toThrow(InsufficientFundsError);
    });

    it('should throw NotFoundError for non-existent recipient', async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockAccountRepository.findByAccountNumber.mockResolvedValue(null);

      await expect(walletService.transferFunds(1, transferData)).rejects.toThrow(
        new NotFoundError('Recipient account not found')
      );
    });
  });

  describe('withdrawFunds', () => {
    const withdrawData: WithdrawData = {
      amount: 200,
      description: 'ATM withdrawal',
    };

    it('should withdraw funds successfully', async () => {
      const updatedAccount = { ...mockAccount, balance: 800 };
      
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockDb.transaction.mockImplementation((callback) => 
        callback({}).then(() => ({
          transaction: { ...mockTransaction, type: TransactionType.DEBIT },
          newBalance: 800,
        }))
      );
      mockTransactionRepository.create.mockResolvedValue({
        ...mockTransaction,
        type: TransactionType.DEBIT,
      });
      mockAccountRepository.updateBalance.mockResolvedValue(updatedAccount);

      const result = await walletService.withdrawFunds(1, withdrawData);

      expect(result.newBalance).toBe(800);
      expect(result.transaction.type).toBe(TransactionType.DEBIT);
      expect(mockAccountRepository.findByUserId).toHaveBeenCalledWith(1);
    });

    it('should throw ValidationError for amount below minimum', async () => {
      const invalidWithdrawData = { ...withdrawData, amount: 50 };

      await expect(walletService.withdrawFunds(1, invalidWithdrawData)).rejects.toThrow(
        new ValidationError('Minimum withdrawal amount is ₦100')
      );
    });

    it('should throw ValidationError for amount above maximum', async () => {
      const invalidWithdrawData = { ...withdrawData, amount: 300000 };

      await expect(walletService.withdrawFunds(1, invalidWithdrawData)).rejects.toThrow(
        new ValidationError('Maximum withdrawal amount is ₦200,000')
      );
    });

    it('should throw InsufficientFundsError for insufficient balance', async () => {
      const lowBalanceAccount = { ...mockAccount, balance: 100 };
      mockAccountRepository.findByUserId.mockResolvedValue(lowBalanceAccount);

      await expect(walletService.withdrawFunds(1, withdrawData)).rejects.toThrow(InsufficientFundsError);
    });
  });

  describe('getTransactionHistory', () => {
    const mockTransactions = [mockTransaction];
    const mockPagination = {
      currentPage: 1,
      totalPages: 1,
      totalCount: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      nextPage: null,
      previousPage: null,
    };

    it('should get transaction history successfully', async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockTransactionRepository.findByAccountId.mockResolvedValue({
        transactions: mockTransactions,
        totalCount: 1,
      });

      const result = await walletService.getTransactionHistory(1);

      expect(result.transactions).toHaveLength(1);
      expect(result.pagination.totalCount).toBe(1);
      expect(mockAccountRepository.findByUserId).toHaveBeenCalledWith(1);
    });

    it('should apply filters correctly', async () => {
      const options = {
        page: 2,
        limit: 10,
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
      };

      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockTransactionRepository.findByAccountId.mockResolvedValue({
        transactions: mockTransactions,
        totalCount: 1,
      });

      await walletService.getTransactionHistory(1, options);

      expect(mockTransactionRepository.findByAccountId).toHaveBeenCalledWith(
        mockAccount.id,
        options
      );
    });
  });

  describe('getTransactionByReference', () => {
    const reference = 'TXN123456789';

    it('should get transaction by reference successfully', async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockTransactionRepository.findByReference.mockResolvedValue(mockTransaction);

      const result = await walletService.getTransactionByReference(1, reference);

      expect(result.reference).toBe(reference);
      expect(mockTransactionRepository.findByReference).toHaveBeenCalledWith(reference);
    });

    it('should throw NotFoundError for non-existent transaction', async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockTransactionRepository.findByReference.mockResolvedValue(null);

      await expect(walletService.getTransactionByReference(1, reference)).rejects.toThrow(
        new NotFoundError('Transaction not found')
      );
    });

    it('should throw NotFoundError for transaction not belonging to user', async () => {
      const otherUserTransaction = { ...mockTransaction, accountId: 999 };
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockTransactionRepository.findByReference.mockResolvedValue(otherUserTransaction);

      await expect(walletService.getTransactionByReference(1, reference)).rejects.toThrow(
        new NotFoundError('Transaction not found')
      );
    });
  });

  describe('getAccountSummary', () => {
    const mockSummary = {
      totalCredits: 5000,
      totalDebits: 2000,
      transactionCount: 10,
    };

    it('should get account summary successfully', async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockTransactionRepository.getAccountTransactionsSummary.mockResolvedValue(mockSummary);

      const result = await walletService.getAccountSummary(1);

      expect(result.balance).toBe(mockAccount.balance);
      expect(result.accountNumber).toBe(mockAccount.accountNumber);
      expect(result.totalCredits).toBe(mockSummary.totalCredits);
      expect(result.totalDebits).toBe(mockSummary.totalDebits);
      expect(result.transactionCount).toBe(mockSummary.transactionCount);
    });

    it('should throw NotFoundError when account does not exist', async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(null);

      await expect(walletService.getAccountSummary(1)).rejects.toThrow(NotFoundError);
    });
  });
});