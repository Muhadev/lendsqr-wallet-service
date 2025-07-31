import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services/WalletService';
import { 
  TransferData, 
  FundAccountData, 
  WithdrawData,
  TransactionType,
  TransactionStatus 
} from '../models/Transaction';
import { 
  fundAccountSchema, 
  transferSchema, 
  withdrawSchema,
  paginationSchema 
} from '../utils/validators';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

/**
 * Controller for wallet/account-related endpoints.
 */
export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  /**
   * Get wallet balance for the authenticated user.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  getBalance = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const balance = await this.walletService.getBalance(req.user.id);

      logger.info('Balance retrieved', { userId: req.user.id });

      res.status(200).json({
        status: 'success',
        message: 'Balance retrieved successfully',
        data: balance,
      });
    } catch (error) {
      logger.error('Get balance error', { error });
      next(error);
    }
  };

  /**
   * Fund the authenticated user's account.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  fundAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate request data
      const { error, value } = fundAccountSchema.validate(req.body);
      if (error) {
        logger.warn('Validation error during fundAccount', { error: error.details[0].message });
        throw new AppError(error.details[0].message, 400);
      }

      const fundData: FundAccountData = value;

      // Fund account
      const result = await this.walletService.fundAccount(req.user.id, fundData);

      logger.info('Account funded', { userId: req.user.id, amount: fundData.amount });

      res.status(200).json({
        status: 'success',
        message: 'Account funded successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Fund account error', { error });
      next(error);
    }
  };

  /**
   * Transfer funds between accounts.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  transferFunds = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate request data
      const { error, value } = transferSchema.validate(req.body);
      if (error) {
        logger.warn('Validation error during transferFunds', { error: error.details[0].message });
        throw new AppError(error.details[0].message, 400);
      }

      const transferData: TransferData = value;

      // Additional validation: Check if account number format is valid
      if (!/^\d{10}$/.test(transferData.recipientAccountNumber)) {
        throw new AppError('Account number must be exactly 10 digits', 400);
      }

      // Transfer funds
      const result = await this.walletService.transferFunds(req.user.id, transferData);

      logger.info('Funds transferred', { userId: req.user.id, amount: transferData.amount });

      res.status(200).json({
        status: 'success',
        message: 'Funds transferred successfully',
        data: result,
      });
    } catch (error: any) {
      logger.error('Transfer funds error', { error });
      // Convert specific service errors to appropriate HTTP status codes
      if (error.message && error.message.includes('Recipient account not found')) {
        next(new AppError('Recipient account not found', 404));
        return;
      }
      if (error.message && error.message.includes('not found')) {
        next(new AppError(error.message, 404));
        return;
      }
      next(error);
    }
  };

  /**
   * Withdraw funds from the authenticated user's account.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  withdrawFunds = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate request data
      const { error, value } = withdrawSchema.validate(req.body);
      if (error) {
        logger.warn('Validation error during withdrawFunds', { error: error.details[0].message });
        throw new AppError(error.details[0].message, 400);
      }

      const withdrawData: WithdrawData = value;

      // Withdraw funds
      const result = await this.walletService.withdrawFunds(req.user.id, withdrawData);

      logger.info('Funds withdrawn', { userId: req.user.id, amount: withdrawData.amount });

      res.status(200).json({
        status: 'success',
        message: 'Funds withdrawn successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Withdraw funds error', { error });
      next(error);
    }
  };

  /**
   * Get transaction history for the authenticated user.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  getTransactionHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate query parameters
      const { error, value } = paginationSchema.validate(req.query);
      if (error) {
        logger.warn('Validation error during getTransactionHistory', { error: error.details[0].message });
        throw new AppError(error.details[0].message, 400);
      }

      // Extract additional filters from query
      const options = {
        ...value,
        type: req.query.type as TransactionType,
        status: req.query.status as TransactionStatus,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      // Get transaction history
      const result = await this.walletService.getTransactionHistory(req.user.id, options);

      logger.info('Transaction history retrieved', { userId: req.user.id });

      res.status(200).json({
        status: 'success',
        message: 'Transaction history retrieved successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Get transaction history error', { error });
      next(error);
    }
  };

  /**
   * Get transaction by reference for the authenticated user.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  getTransactionByReference = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { reference } = req.params;
      if (!reference) {
        throw new AppError('Transaction reference is required', 400);
      }

      const transaction = await this.walletService.getTransactionByReference(req.user.id, reference);

      logger.info('Transaction retrieved by reference', { userId: req.user.id, reference });

      res.status(200).json({
        status: 'success',
        message: 'Transaction retrieved successfully',
        data: { transaction },
      });
    } catch (error) {
      logger.error('Get transaction by reference error', { error });
      next(error);
    }
  };

  /**
   * Get account summary for the authenticated user.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  getAccountSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const summary = await this.walletService.getAccountSummary(req.user.id);

      logger.info('Account summary retrieved', { userId: req.user.id });

      res.status(200).json({
        status: 'success',
        message: 'Account summary retrieved successfully',
        data: summary,
      });
    } catch (error) {
      logger.error('Get account summary error', { error });
      next(error);
    }
  };
}