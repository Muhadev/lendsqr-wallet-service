import { db } from '../config/database';
import type { Knex } from 'knex';
import { Transaction, CreateTransactionData, TransactionType, TransactionStatus } from '../models/Transaction';
import { NotFoundError } from '../utils/AppError';

/**
 * Repository for managing transaction data in the database.
 */
export class TransactionRepository {
  private tableName = 'transactions';

  /**
   * Create a new transaction.
   * @param transactionData Data for the new transaction
   * @param trx Optional transaction context
   * @returns The created Transaction
   */
  async create(transactionData: CreateTransactionData, trx?: Knex.Transaction): Promise<Transaction> {
    const query = trx || db;
    
    const [id] = await query(this.tableName).insert({
      account_id: transactionData.accountId,
      type: transactionData.type,
      amount: transactionData.amount,
      recipient_id: transactionData.recipientId,
      reference: transactionData.reference,
      status: transactionData.status || TransactionStatus.PENDING,
      description: transactionData.description,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const transaction = await this.findById(id, trx);
    if (!transaction) {
      throw new Error('Failed to create transaction');
    }

    return transaction;
  }

  /**
   * Find a transaction by its ID.
   * @param id Transaction ID
   * @param trx Optional transaction context
   * @returns The Transaction or null if not found
   */
  async findById(id: number, trx?: Knex.Transaction): Promise<Transaction | null> {
    const query = trx || db;
    
    const result: any = await query(this.tableName)
      .where({ id })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  /**
   * Find a transaction by its reference.
   * @param reference Transaction reference
   * @returns The Transaction or null if not found
   */
  async findByReference(reference: string): Promise<Transaction | null> {
    const result = await db(this.tableName)
      .where({ reference })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  /**
   * Find transactions by account ID with optional filters and pagination.
   * @param accountId Account ID
   * @param options Filter and pagination options
   * @returns Transactions and total count
   */
  async findByAccountId(
    accountId: number,
    options: {
      page?: number;
      limit?: number;
      type?: TransactionType;
      status?: TransactionStatus;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ transactions: Transaction[]; totalCount: number }> {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      startDate,
      endDate,
    } = options;

    let query = db(this.tableName)
      .where({ account_id: accountId });

    if (type) {
      query = query.where({ type });
    }

    if (status) {
      query = query.where({ status });
    }

    if (startDate) {
      query = query.where('created_at', '>=', startDate);
    }

    if (endDate) {
      query = query.where('created_at', '<=', endDate);
    }

    // Get total count
    const countResult = await query.clone().count('id as count').first();
    const totalCount = countResult?.count as number || 0;

    // Get paginated results
    const results = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const transactions = results.map((result: any) => this.mapDbToModel(result));

    return { transactions, totalCount };
  }

  /**
   * Update the status of a transaction.
   * @param id Transaction ID
   * @param status New transaction status
   * @param trx Optional transaction context
   * @returns The updated Transaction
   */
  async updateStatus(id: number, status: TransactionStatus, trx?: Knex.Transaction): Promise<Transaction> {
    const query = trx || db;
    
    await query(this.tableName)
      .where({ id })
      .update({
        status,
        updated_at: new Date(),
      });

    const transaction = await this.findById(id, trx);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return transaction;
  }

  /**
   * Get a summary of completed transactions for an account.
   * @param accountId Account ID
   * @returns Summary of credits, debits, and transaction count
   */
  async getAccountTransactionsSummary(accountId: number): Promise<{
    totalCredits: number;
    totalDebits: number;
    transactionCount: number;
  }> {
    const results = await db(this.tableName)
      .where({ account_id: accountId, status: TransactionStatus.COMPLETED })
      .select(
        db.raw('SUM(CASE WHEN type = ? THEN amount ELSE 0 END) as total_credits', [TransactionType.CREDIT]),
        db.raw('SUM(CASE WHEN type = ? THEN amount ELSE 0 END) as total_debits', [TransactionType.DEBIT]),
        db.raw('COUNT(*) as transaction_count')
      )
      .first();

    return {
      totalCredits: parseFloat(results?.total_credits || '0'),
      totalDebits: parseFloat(results?.total_debits || '0'),
      transactionCount: parseInt(results?.transaction_count || '0'),
    };
  }

  /**
   * Create debit and credit transactions for a transfer.
   * @param senderAccountId Sender's account ID
   * @param recipientAccountId Recipient's account ID
   * @param amount Amount to transfer
   * @param reference Transaction reference
   * @param description Transaction description
   * @param trx Optional transaction context
   * @returns Debit and credit transactions
   */
  async createTransferTransactions(
    senderAccountId: number,
    recipientAccountId: number,
    amount: number,
    reference: string,
    description: string,
    trx?: Knex.Transaction
  ): Promise<{ debitTransaction: Transaction; creditTransaction: Transaction }> {
    // Create debit transaction for sender
    const debitTransaction = await this.create({
      accountId: senderAccountId,
      type: TransactionType.DEBIT,
      amount,
      recipientId: recipientAccountId,
      reference,
      status: TransactionStatus.COMPLETED,
      description: description || 'Transfer to another account',
    }, trx);

    // Create credit transaction for recipient
    const creditTransaction = await this.create({
      accountId: recipientAccountId,
      type: TransactionType.CREDIT,
      amount,
      recipientId: senderAccountId,
      reference,
      status: TransactionStatus.COMPLETED,
      description: description || 'Transfer from another account',
    }, trx);

    return { debitTransaction, creditTransaction };
  }

  /**
   * Delete a transaction by ID.
   * @param id Transaction ID
   * @returns True if deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    const deletedCount = await db(this.tableName)
      .where({ id })
      .del();

    return deletedCount > 0;
  }

  /**
   * Map a database row to the Transaction model.
   * @param dbResult Database row
   * @returns Transaction model
   */
  private mapDbToModel(dbResult: any): Transaction {
    return {
      id: dbResult.id,
      accountId: dbResult.account_id,
      type: dbResult.type as TransactionType,
      amount: parseFloat(dbResult.amount),
      recipientId: dbResult.recipient_id,
      reference: dbResult.reference,
      status: dbResult.status as TransactionStatus,
      description: dbResult.description,
      createdAt: dbResult.created_at,
      updatedAt: dbResult.updated_at,
    };
  }
}