// src/services/WalletService.ts - Fixed version with better transaction handling
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
import type { Knex } from 'knex';

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
      throw new ValidationError('Amount must be a positive number');
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

    // Use database transaction for atomicity
    const result = await db.transaction(async (trx: Knex.Transaction) => {
      // Generate unique transaction reference
      let reference: string;
      let referenceExists = true;
      let attempts = 0;
      const maxAttempts = 20; // Increased attempts for assessment

      while (referenceExists && attempts < maxAttempts) {
        reference = generateTransactionReference();
        const existingTransaction = await trx('transactions')
          .where({ reference })
          .first();
        if (existingTransaction) {
          console.warn(`Duplicate transaction reference generated: ${reference} (attempt ${attempts + 1})`);
        }
        referenceExists = !!existingTransaction;
        attempts++;
      }

      if (referenceExists) {
        console.error(`Failed to generate unique transaction reference after ${maxAttempts} attempts.`);
        throw new AppError('Unable to generate unique transaction reference', 500);
      }

      // Calculate new balance
      const newBalance = account.balance + fundData.amount;

      // Update account balance
      await trx('accounts')
        .where({ id: account.id })
        .update({
          balance: newBalance,
          updated_at: new Date(),
        });

      // Create credit transaction
      const [transactionId] = await trx('transactions').insert({
        account_id: account.id,
        type: TransactionType.CREDIT,
        amount: fundData.amount,
        reference: reference!,
        status: TransactionStatus.COMPLETED,
        description: fundData.description || 'Account funding',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Get the created transaction
      const transaction = await trx('transactions')
        .where({ id: transactionId })
        .first();

      return { 
        transaction: this.mapDbToTransaction(transaction), 
        newBalance 
      };
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
      throw new ValidationError('Amount must be a positive number');
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

    // Use database transaction for atomicity
    const result = await db.transaction(async (trx: Knex.Transaction) => {
      // Generate unique transaction references for each transaction
      let debitReference: string;
      let creditReference: string;
      let referenceExists = true;
      let attempts = 0;
      const maxAttempts = 20;

      // Generate unique reference for debit transaction
      while (referenceExists && attempts < maxAttempts) {
        debitReference = generateTransactionReference();
        const existingTransaction = await trx('transactions')
          .where({ reference: debitReference })
          .first();
        if (existingTransaction) {
          console.warn(`Duplicate debit transaction reference generated: ${debitReference} (attempt ${attempts + 1})`);
        }
        referenceExists = !!existingTransaction;
        attempts++;
      }
      if (referenceExists) {
        console.error(`Failed to generate unique debit transaction reference after ${maxAttempts} attempts.`);
        throw new AppError('Unable to generate unique transaction reference', 500);
      }

      // Generate unique reference for credit transaction
      referenceExists = true;
      attempts = 0;
      while (referenceExists && attempts < maxAttempts) {
        creditReference = generateTransactionReference();
        const existingTransaction = await trx('transactions')
          .where({ reference: creditReference })
          .first();
        if (existingTransaction) {
          console.warn(`Duplicate credit transaction reference generated: ${creditReference} (attempt ${attempts + 1})`);
        }
        referenceExists = !!existingTransaction;
        attempts++;
      }
      if (referenceExists) {
        console.error(`Failed to generate unique credit transaction reference after ${maxAttempts} attempts.`);
        throw new AppError('Unable to generate unique transaction reference', 500);
      }

      // Calculate new balances
      const newSenderBalance = senderAccount.balance - transferData.amount;
      const newRecipientBalance = recipientAccount.balance + transferData.amount;

      // Update sender account balance
      await trx('accounts')
        .where({ id: senderAccount.id })
        .update({
          balance: newSenderBalance,
          updated_at: new Date(),
        });

      // Update recipient account balance
      await trx('accounts')
        .where({ id: recipientAccount.id })
        .update({
          balance: newRecipientBalance,
          updated_at: new Date(),
        });

      // Create debit transaction for sender
      const [debitTransactionId] = await trx('transactions').insert({
        account_id: senderAccount.id,
        type: TransactionType.DEBIT,
        amount: transferData.amount,
        recipient_id: recipientAccount.id,
        reference: debitReference!,
        status: TransactionStatus.COMPLETED,
        description: transferData.description || 'Fund transfer',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Create credit transaction for recipient
      await trx('transactions').insert({
        account_id: recipientAccount.id,
        type: TransactionType.CREDIT,
        amount: transferData.amount,
        recipient_id: senderAccount.id,
        reference: creditReference!,
        status: TransactionStatus.COMPLETED,
        description: transferData.description || 'Fund transfer',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Get the debit transaction
      const debitTransaction = await trx('transactions')
        .where({ id: debitTransactionId })
        .first();

      return { 
        transaction: this.mapDbToTransaction(debitTransaction), 
        newBalance: newSenderBalance 
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
      throw new ValidationError('Amount must be a positive number');
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

    // Use database transaction for atomicity
    const result = await db.transaction(async (trx: Knex.Transaction) => {
      // Generate unique transaction reference
      let reference: string;
      let referenceExists = true;
      let attempts = 0;
      const maxAttempts = 20; // Increased attempts for assessment

      while (referenceExists && attempts < maxAttempts) {
        reference = generateTransactionReference();
        const existingTransaction = await trx('transactions')
          .where({ reference })
          .first();
        if (existingTransaction) {
          console.warn(`Duplicate transaction reference generated: ${reference} (attempt ${attempts + 1})`);
        }
        referenceExists = !!existingTransaction;
        attempts++;
      }

      if (referenceExists) {
        console.error(`Failed to generate unique transaction reference after ${maxAttempts} attempts.`);
        throw new AppError('Unable to generate unique transaction reference', 500);
      }

      // Calculate new balance
      const newBalance = account.balance - withdrawData.amount;

      // Update account balance  
      await trx('accounts')
        .where({ id: account.id })
        .update({
          balance: newBalance,
          updated_at: new Date(),
        });

      // Create debit transaction
      const [transactionId] = await trx('transactions').insert({
        account_id: account.id,
        type: TransactionType.DEBIT,
        amount: withdrawData.amount,
        reference: reference!,
        status: TransactionStatus.COMPLETED,
        description: withdrawData.description || 'Cash withdrawal',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Get the created transaction
      const transaction = await trx('transactions')
        .where({ id: transactionId })
        .first();

      return { 
        transaction: this.mapDbToTransaction(transaction), 
        newBalance 
      };
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

  private mapDbToTransaction(dbResult: any): any {
    return {
      id: dbResult.id,
      accountId: dbResult.account_id,
      type: dbResult.type,
      amount: parseFloat(dbResult.amount),
      recipientId: dbResult.recipient_id,
      reference: dbResult.reference,
      status: dbResult.status,
      description: dbResult.description,
      createdAt: dbResult.created_at,
      updatedAt: dbResult.updated_at,
    };
  }

  private sanitizeTransaction(transaction: any): TransactionResponse {
    return {
      id: transaction.id,
      accountId: transaction.accountId,
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