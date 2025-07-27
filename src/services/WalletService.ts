import { AccountRepository } from '../repositories/AccountRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { UserRepository } from '../repositories/UserRepository';
import { 
  TransferData, 
  FundAccountData, 
  WithdrawData,
  TransactionType,
  TransactionStatus,
  TransactionResponse 
} from '../models/Transaction';
import { AccountResponse, AccountStatus } from '../models/Account';
import { generateTransactionReference, getPaginationMetadata } from '../utils/helpers';
import { 
  AppError, 
  NotFoundError, 
  InsufficientFundsError,
  ValidationError 
} from '../utils/AppError';
import { logger } from '../utils/logger';
import { db } from '../config/database';

export interface WalletBalance {
  accountNumber: string;
  balance: number;
  status: AccountStatus;
}

export interface TransactionHistory {
  transactions: TransactionResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextPage: number | null;
    previousPage: number | null;
  };
}

export class WalletService {
  private accountRepository: AccountRepository;
  private transactionRepository: TransactionRepository;
  private userRepository: UserRepository;

  constructor() {
    this.accountRepository = new AccountRepository();
    this.transactionRepository = new TransactionRepository();
    this.userRepository = new UserRepository();
  }

  async getBalance(userId: number): Promise<WalletBalance> {
    const account = await this.accountRepository.findByUserId(userId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    return {
      accountNumber: account.accountNumber,
      balance: account.balance,
      status: account.status,
    };
  }

  async fundAccount(userId: number, fundData: FundAccountData): Promise<{
    transaction: TransactionResponse;
    newBalance: number;
  }> {
    // Validate amount
    if (fundData.amount <= 0) {
      throw new ValidationError('Amount must be greater than zero');
    }

    if (fundData.amount < 100) {
      throw new ValidationError('Minimum funding amount is ₦100');
    }

    if (fundData.amount > 1000000) {
      throw new ValidationError('Maximum funding amount is ₦1,000,000');
    }

    // Get user account
    const account = await this.accountRepository.findByUserId(userId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Check account status
    if (account.status !== AccountStatus.ACTIVE) {
      throw new AppError('Account is not active', 403);
    }

    // Use database transaction
    const result = await db.transaction(async (trx) => {
      // Generate transaction reference
      const reference = generateTransactionReference();

      // Create credit transaction
      const transaction = await this.transactionRepository.create({
        accountId: account.id,
        type: TransactionType.CREDIT,
        amount: fundData.amount,
        reference,
        status: TransactionStatus.COMPLETED,
        description: fundData.description || 'Account funding',
      }, trx);

      // Update account balance
      const newBalance = account.balance + fundData.amount;
      const updatedAccount = await this.accountRepository.updateBalance(
        account.id, 
        newBalance, 
        trx
      );

      return { transaction, newBalance: updatedAccount.balance };
    });

    logger.info('Account funded successfully', {
      userId,
      accountNumber: account.accountNumber,
      amount: fundData.amount,
      reference: result.transaction.reference,
      newBalance: result.newBalance,
    });

    return {
      transaction: this.sanitizeTransaction(result.transaction),
      newBalance: result.newBalance,
    };
  }

  async transferFunds(userId: number, transferData: TransferData): Promise<{
    transaction: TransactionResponse;
    newBalance: number;
  }> {
    // Validate amount
    if (transferData.amount <= 0) {
      throw new ValidationError('Amount must be greater than zero');
    }

    if (transferData.amount < 10) {
      throw new ValidationError('Minimum transfer amount is ₦10');
    }

    if (transferData.amount > 500000) {
      throw new ValidationError('Maximum transfer amount is ₦500,000');
    }

    // Get sender account
    const senderAccount = await this.accountRepository.findByUserId(userId);
    if (!senderAccount) {
      throw new NotFoundError('Sender account not found');
    }

    // Check sender account status
    if (senderAccount.status !== AccountStatus.ACTIVE) {
      throw new AppError('Sender account is not active', 403);
    }

    // Get recipient account
    const recipientAccount = await this.accountRepository.findByAccountNumber(
      transferData.recipientAccountNumber
    );
    if (!recipientAccount) {
      throw new NotFoundError('Recipient account not found');
    }

    // Check recipient account status
    if (recipientAccount.status !== AccountStatus.ACTIVE) {
      throw new AppError('Recipient account is not active', 403);
    }

    // Check if sender is trying to transfer to themselves
    if (senderAccount.id === recipientAccount.id) {
      throw new ValidationError('Cannot transfer funds to the same account');
    }

    // Check sufficient balance
    if (senderAccount.balance < transferData.amount) {
      throw new InsufficientFundsError(
        `Insufficient funds. Available balance: ₦${senderAccount.balance.toFixed(2)}`
      );
    }

    // Use database transaction
    const result = await db.transaction(async (trx) => {
      // Generate transaction reference
      const reference = generateTransactionReference();

      // Transfer funds between accounts
      const { senderAccount: updatedSenderAccount } = await this.accountRepository.transferFunds(
        senderAccount.id,
        recipientAccount.id,
        transferData.amount,
        trx
      );

      // Create transaction records
      const { debitTransaction } = await this.transactionRepository.createTransferTransactions(
        senderAccount.id,
        recipientAccount.id,
        transferData.amount,
        reference,
        transferData.description || 'Fund transfer',
        trx
      );

      return { 
        transaction: debitTransaction, 
        newBalance: updatedSenderAccount.balance 
      };
    });

    logger.info('Funds transferred successfully', {
      senderUserId: userId,
      senderAccountNumber: senderAccount.accountNumber,
      recipientAccountNumber: transferData.recipientAccountNumber,
      amount: transferData.amount,
      reference: result.transaction.reference,
      newBalance: result.newBalance,
    });

    return {
      transaction: this.sanitizeTransaction(result.transaction),
      newBalance: result.newBalance,
    };
  }

  async withdrawFunds(userId: number, withdrawData: WithdrawData): Promise<{
    transaction: TransactionResponse;
    newBalance: number;
  }> {
    // Validate amount
    if (withdrawData.amount <= 0) {
      throw new ValidationError('Amount must be greater than zero');
    }

    if (withdrawData.amount < 100) {
      throw new ValidationError('Minimum withdrawal amount is ₦100');
    }

    if (withdrawData.amount > 200000) {
      throw new ValidationError('Maximum withdrawal amount is ₦200,000');
    }

    // Get user account
    const account = await this.accountRepository.findByUserId(userId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Check account status
    if (account.status !== AccountStatus.ACTIVE) {
      throw new AppError('Account is not active', 403);
    }

    // Check sufficient balance
    if (account.balance < withdrawData.amount) {
      throw new InsufficientFundsError(
        `Insufficient funds. Available balance: ₦${account.balance.toFixed(2)}`
      );
    }

    // Use database transaction
    const result = await db.transaction(async (trx) => {
      // Generate transaction reference
      const reference = generateTransactionReference();

      // Create debit transaction
      const transaction = await this.transactionRepository.create({
        accountId: account.id,
        type: TransactionType.DEBIT,
        amount: withdrawData.amount,
        reference,
        status: TransactionStatus.COMPLETED,
        description: withdrawData.description || 'Cash withdrawal',
      }, trx);

      // Update account balance
      const newBalance = account.balance - withdrawData.amount;
      const updatedAccount = await this.accountRepository.updateBalance(
        account.id, 
        newBalance, 
        trx
      );

      return { transaction, newBalance: updatedAccount.balance };
    });

    logger.info('Funds withdrawn successfully', {
      userId,
      accountNumber: account.accountNumber,
      amount: withdrawData.amount,
      reference: result.transaction.reference,
      newBalance: result.newBalance,
    });

    return {
      transaction: this.sanitizeTransaction(result.transaction),
      newBalance: result.newBalance,
    };
  }

  async getTransactionHistory(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      type?: TransactionType;
      status?: TransactionStatus;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<TransactionHistory> {
    // Get user account
    const account = await this.accountRepository.findByUserId(userId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    const { page = 1, limit = 20 } = options;

    // Get transactions
    const { transactions, totalCount } = await this.transactionRepository.findByAccountId(
      account.id,
      options
    );

    // Generate pagination metadata
    const pagination = getPaginationMetadata(totalCount, page, limit);

    return {
      transactions: transactions.map(transaction => this.sanitizeTransaction(transaction)),
      pagination,
    };
  }

  async getTransactionByReference(
    userId: number,
    reference: string
  ): Promise<TransactionResponse> {
    // Get user account
    const account = await this.accountRepository.findByUserId(userId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Get transaction
    const transaction = await this.transactionRepository.findByReference(reference);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    // Verify transaction belongs to user
    if (transaction.accountId !== account.id) {
      throw new NotFoundError('Transaction not found');
    }

    return this.sanitizeTransaction(transaction);
  }

  async getAccountSummary(userId: number): Promise<{
    balance: number;
    accountNumber: string;
    totalCredits: number;
    totalDebits: number;
    transactionCount: number;
  }> {
    // Get user account
    const account = await this.accountRepository.findByUserId(userId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Get transaction summary
    const summary = await this.transactionRepository.getAccountTransactionsSummary(account.id);

    return {
      balance: account.balance,
      accountNumber: account.accountNumber,
      ...summary,
    };
  }

  private sanitizeTransaction(transaction: any): TransactionResponse {
    return {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      recipientId: transaction.recipientId,
      reference: transaction.reference,
      status: transaction.status,
      description: transaction.description,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}