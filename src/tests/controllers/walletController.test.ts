// walletController.test.ts
import { Request, Response } from 'express';
import { WalletController } from '../../controllers/WalletController';
import { WalletService } from '../../services/WalletService';
import { TransactionType, TransactionStatus } from '../../models/Transaction';
import { AccountStatus } from '../../models/Account';
import { ValidationError, NotFoundError, InsufficientFundsError } from '../../utils/AppError';

// Mock the WalletService
jest.mock('../../services/WalletService');

describe('WalletController', () => {
  let walletController: WalletController;
  let mockWalletService: jest.Mocked<WalletService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    walletController = new WalletController();
    mockWalletService = WalletService.prototype as jest.Mocked<WalletService>;

    mockRequest = {
      user: { userId: 1, email: 'test@example.com' },
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getBalance', () => {
    it('should return wallet balance successfully', async () => {
      const mockBalance = {
        accountNumber: '1234567890',
        balance: 1000,
        status: AccountStatus.ACTIVE,
      };

      mockWalletService.getBalance.mockResolvedValue(mockBalance);

      await walletController.getBalance(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getBalance).toHaveBeenCalledWith(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Balance retrieved successfully',
        data: mockBalance,
      });
    });

    it('should handle service errors', async () => {
      const error = new NotFoundError('Account not found');
      mockWalletService.getBalance.mockRejectedValue(error);

      await walletController.getBalance(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Account not found',
      });
    });
  });

  describe('fundAccount', () => {
    it('should fund account successfully', async () => {
      const fundData = { amount: 1000, description: 'Test funding' };
      const mockResult = {
        transaction: {
          id: 1,
          type: TransactionType.CREDIT,
          amount: 1000,
          reference: 'TXN123456789',
          status: TransactionStatus.COMPLETED,
          description: 'Test funding',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        newBalance: 2000,
      };

      mockRequest.body = fundData;
      mockWalletService.fundAccount.mockResolvedValue(mockResult);

      await walletController.fundAccount(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.fundAccount).toHaveBeenCalledWith(1, fundData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Account funded successfully',
        data: mockResult,
      });
    });

    it('should handle validation errors', async () => {
      const fundData = { amount: -100 };
      const error = new ValidationError('Amount must be greater than zero');

      mockRequest.body = fundData;
      mockWalletService.fundAccount.mockRejectedValue(error);

      await walletController.fundAccount(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Amount must be greater than zero',
      });
    });
  });

  describe('transferFunds', () => {
    it('should transfer funds successfully', async () => {
      const transferData = {
        recipientAccountNumber: '0987654321',
        amount: 500,
        description: 'Test transfer',
      };
      const mockResult = {
        transaction: {
          id: 1,
          type: TransactionType.DEBIT,
          amount: 500,
          reference: 'TXN123456789',
          status: TransactionStatus.COMPLETED,
          description: 'Test transfer',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        newBalance: 1500,
      };

      mockRequest.body = transferData;
      mockWalletService.transferFunds.mockResolvedValue(mockResult);

      await walletController.transferFunds(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.transferFunds).toHaveBeenCalledWith(1, transferData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Funds transferred successfully',
        data: mockResult,
      });
    });

    it('should handle insufficient funds error', async () => {
      const transferData = { recipientAccountNumber: '0987654321', amount: 5000 };
      const error = new InsufficientFundsError('Insufficient funds');

      mockRequest.body = transferData;
      mockWalletService.transferFunds.mockRejectedValue(error);

      await walletController.transferFunds(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Insufficient funds',
      });
    });
  });

  describe('withdrawFunds', () => {
    it('should withdraw funds successfully', async () => {
      const withdrawData = { amount: 300, description: 'ATM withdrawal' };
      const mockResult = {
        transaction: {
          id: 1,
          type: TransactionType.DEBIT,
          amount: 300,
          reference: 'TXN123456789',
          status: TransactionStatus.COMPLETED,
          description: 'ATM withdrawal',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        newBalance: 1700,
      };

      mockRequest.body = withdrawData;
      mockWalletService.withdrawFunds.mockResolvedValue(mockResult);

      await walletController.withdrawFunds(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.withdrawFunds).toHaveBeenCalledWith(1, withdrawData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Funds withdrawn successfully',
        data: mockResult,
      });
    });
  });

  describe('getTransactionHistory', () => {
    it('should get transaction history successfully', async () => {
      const mockHistory = {
        transactions: [
          {
            id: 1,
            type: TransactionType.CREDIT,
            amount: 1000,
            reference: 'TXN123456789',
            status: TransactionStatus.COMPLETED,
            description: 'Test transaction',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          nextPage: null,
          previousPage: null,
        },
      };

      mockRequest.query = { page: '1', limit: '20' };
      mockWalletService.getTransactionHistory.mockResolvedValue(mockHistory);

      await walletController.getTransactionHistory(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getTransactionHistory).toHaveBeenCalledWith(1, {
        page: 1,
        limit: 20,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Transaction history retrieved successfully',
        data: mockHistory,
      });
    });

    it('should handle query parameters correctly', async () => {
      mockRequest.query = {
        page: '2',
        limit: '10',
        type: 'CREDIT',
        status: 'COMPLETED',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      };

      const mockHistory = {
        transactions: [],
        pagination: {
          currentPage: 2,
          totalPages: 1,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: true,
          nextPage: null,
          previousPage: 1,
        },
      };

      mockWalletService.getTransactionHistory.mockResolvedValue(mockHistory);

      await walletController.getTransactionHistory(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getTransactionHistory).toHaveBeenCalledWith(1, {
        page: 2,
        limit: 10,
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      });
    });
  });

  describe('getTransactionByReference', () => {
    it('should get transaction by reference successfully', async () => {
      const reference = 'TXN123456789';
      const mockTransaction = {
        id: 1,
        type: TransactionType.CREDIT,
        amount: 1000,
        reference,
        status: TransactionStatus.COMPLETED,
        description: 'Test transaction',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { reference };
      mockWalletService.getTransactionByReference.mockResolvedValue(mockTransaction);

      await walletController.getTransactionByReference(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getTransactionByReference).toHaveBeenCalledWith(1, reference);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Transaction retrieved successfully',
        data: mockTransaction,
      });
    });

    it('should handle not found error', async () => {
      const reference = 'INVALID_REF';
      const error = new NotFoundError('Transaction not found');

      mockRequest.params = { reference };
      mockWalletService.getTransactionByReference.mockRejectedValue(error);

      await walletController.getTransactionByReference(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Transaction not found',
      });
    });
  });

  describe('getAccountSummary', () => {
    it('should get account summary successfully', async () => {
      const mockSummary = {
        balance: 2000,
        accountNumber: '1234567890',
        totalCredits: 5000,
        totalDebits: 3000,
        transactionCount: 15,
      };

      mockWalletService.getAccountSummary.mockResolvedValue(mockSummary);

      await walletController.getAccountSummary(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getAccountSummary).toHaveBeenCalledWith(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Account summary retrieved successfully',
        data: mockSummary,
      });
    });
  });
});
