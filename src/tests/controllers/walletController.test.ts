// walletController.test.ts
import { Request, Response, NextFunction } from 'express';
import { WalletController } from '../../controllers/WalletController';
import { WalletService } from '../../services/WalletService';
import { TransactionType, TransactionStatus } from '../../models/Transaction';
import { AccountStatus } from '../../models/Account';
import { ValidationError, NotFoundError, InsufficientFundsError } from '../../utils/AppError';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock the WalletService
jest.mock('../../services/WalletService');

describe('WalletController', () => {
  let walletController: WalletController;
  let mockWalletService: jest.Mocked<WalletService>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    walletController = new WalletController();
    mockWalletService = new WalletService() as jest.Mocked<WalletService>;
    
    // Mock all WalletService methods
    mockWalletService.getBalance = jest.fn();
    mockWalletService.fundAccount = jest.fn();
    mockWalletService.transferFunds = jest.fn();
    mockWalletService.withdrawFunds = jest.fn();
    mockWalletService.getTransactionHistory = jest.fn();
    mockWalletService.getTransactionByReference = jest.fn();
    mockWalletService.getAccountSummary = jest.fn();

    // Replace the service instance
    (walletController as any).walletService = mockWalletService;

    mockRequest = {
      user: { id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User' },
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getBalance', () => {
    it('should return wallet balance successfully', async () => {
      const mockBalance = {
        accountNumber: '1234567890',
        balance: 1000,
        status: AccountStatus.ACTIVE,
      };

      mockWalletService.getBalance.mockResolvedValue(mockBalance);

      await walletController.getBalance(
        mockRequest as AuthenticatedRequest, 
        mockResponse as Response, 
        mockNext
      );

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

      await walletController.getBalance(
        mockRequest as AuthenticatedRequest, 
        mockResponse as Response, 
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
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

      await walletController.fundAccount(
        mockRequest as AuthenticatedRequest, 
        mockResponse as Response, 
        mockNext
      );

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
      // Updated error message to match what the service actually throws
      const error = new ValidationError('Amount must be a positive number');

      mockRequest.body = fundData;
      mockWalletService.fundAccount.mockRejectedValue(error);

      await walletController.fundAccount(
        mockRequest as AuthenticatedRequest, 
        mockResponse as Response, 
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
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

      await walletController.transferFunds(
        mockRequest as AuthenticatedRequest, 
        mockResponse as Response, 
        mockNext
      );

      expect(mockWalletService.transferFunds).toHaveBeenCalledWith(1, transferData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Funds transferred successfully',
        data: mockResult,
      });
    });

    it('should handle insufficient funds error', async () => {
      const transferData = { 
        recipientAccountNumber: '0987654321', 
        amount: 5000 
      };
      const error = new InsufficientFundsError('Insufficient funds');

      mockRequest.body = transferData;
      mockWalletService.transferFunds.mockRejectedValue(error);

      await walletController.transferFunds(
        mockRequest as AuthenticatedRequest, 
        mockResponse as Response, 
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
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

      await walletController.withdrawFunds(
        mockRequest as AuthenticatedRequest, 
        mockResponse as Response, 
        mockNext
      );

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

      await walletController.getTransactionHistory(
        mockRequest as AuthenticatedRequest, 
        mockResponse as Response, 
        mockNext
      );

      expect(mockWalletService.getTransactionHistory).toHaveBeenCalledWith(1, {
        page: 1,
        limit: 20,
        type: undefined,
        status: undefined,
        startDate: undefined,
        endDate: undefined,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Transaction history retrieved successfully',
        data: mockHistory,
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

      await walletController.getTransactionByReference(
        mockRequest as AuthenticatedRequest, 
        mockResponse as Response, 
        mockNext
      );

      expect(mockWalletService.getTransactionByReference).toHaveBeenCalledWith(1, reference);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Transaction retrieved successfully',
        data: { transaction: mockTransaction },
      });
    });

    it('should handle not found error', async () => {
      const reference = 'INVALID_REF';
      const error = new NotFoundError('Transaction not found');

      mockRequest.params = { reference };
      mockWalletService.getTransactionByReference.mockRejectedValue(error);

      await walletController.getTransactionByReference(
        mockRequest as AuthenticatedRequest, 
        mockResponse as Response, 
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
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

      await walletController.getAccountSummary(
        mockRequest as AuthenticatedRequest, 
        mockResponse as Response, 
        mockNext
      );

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