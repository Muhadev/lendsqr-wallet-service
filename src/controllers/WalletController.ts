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

export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  getBalance = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const balance = await this.walletService.getBalance(req.user.id);

      res.status(200).json({
        status: 'success',
        message: 'Balance retrieved successfully',
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  };

  fundAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate request data
      const { error, value } = fundAccountSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const fundData: FundAccountData = value;

      // Fund account
      const result = await this.walletService.fundAccount(req.user.id, fundData);

      res.status(200).json({
        status: 'success',
        message: 'Account funded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  transferFunds = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate request data
      const { error, value } = transferSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const transferData: TransferData = value;

      // Transfer funds
      const result = await this.walletService.transferFunds(req.user.id, transferData);

      res.status(200).json({
        status: 'success',
        message: 'Funds transferred successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  withdrawFunds = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate request data
      const { error, value } = withdrawSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const withdrawData: WithdrawData = value;

      // Withdraw funds
      const result = await this.walletService.withdrawFunds(req.user.id, withdrawData);

      res.status(200).json({
        status: 'success',
        message: 'Funds withdrawn successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getTransactionHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate query parameters
      const { error, value } = paginationSchema.validate(req.query);
      if (error) {
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

      res.status(200).json({
        status: 'success',
        message: 'Transaction history retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

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

      res.status(200).json({
        status: 'success',
        message: 'Transaction retrieved successfully',
        data: { transaction },
      });
    } catch (error) {
      next(error);
    }
  };

  getAccountSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const summary = await this.walletService.getAccountSummary(req.user.id);

      res.status(200).json({
        status: 'success',
        message: 'Account summary retrieved successfully',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };
}