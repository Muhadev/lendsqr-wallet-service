import { db } from '../config/database';
import { Account, CreateAccountData, AccountStatus } from '../models/Account';
import { NotFoundError } from '../utils/AppError';

/**
 * Repository for managing account data in the database.
 */
export class AccountRepository {
  private tableName = 'accounts';

  /**
   * Create a new account.
   * @param accountData Data for the new account
   * @returns The created Account
   */
  async create(accountData: CreateAccountData): Promise<Account> {
    const [id] = await db(this.tableName).insert({
      user_id: accountData.userId,
      account_number: accountData.accountNumber,
      balance: accountData.balance || 0,
      status: accountData.status || AccountStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const account = await this.findById(id);
    if (!account) {
      throw new Error('Failed to create account');
    }

    return account;
  }

  /**
   * Find an account by its ID.
   * @param id Account ID
   * @returns The Account or null if not found
   */
  async findById(id: number): Promise<Account | null> {
    const result = await db(this.tableName)
      .where({ id })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  /**
   * Find an account by user ID.
   * @param userId User ID
   * @returns The Account or null if not found
   */
  async findByUserId(userId: number): Promise<Account | null> {
    const result = await db(this.tableName)
      .where({ user_id: userId })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  /**
   * Find an account by account number.
   * @param accountNumber Account number
   * @returns The Account or null if not found
   */
  async findByAccountNumber(accountNumber: string): Promise<Account | null> {
    const result = await db(this.tableName)
      .where({ account_number: accountNumber })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  /**
   * Update the balance of an account.
   * @param id Account ID
   * @param newBalance New balance value
   * @param trx Optional transaction context
   * @returns The updated Account
   */
  async updateBalance(id: number, newBalance: number, trx?: any): Promise<Account> {
    const query = trx || db;
    
    await query(this.tableName)
      .where({ id })
      .update({
        balance: newBalance,
        updated_at: new Date(),
      });
      
    // Get updated account using the same transaction context
    const result = await query(this.tableName)
      .where({ id })
      .first();

    if (!result) {
      throw new NotFoundError('Account not found');
    }

    return this.mapDbToModel(result);
  }

  /**
   * Update the status of an account.
   * @param id Account ID
   * @param status New account status
   * @returns The updated Account
   */
  async updateStatus(id: number, status: AccountStatus): Promise<Account> {
    await db(this.tableName)
      .where({ id })
      .update({
        status,
        updated_at: new Date(),
      });

    const account = await this.findById(id);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    return account;
  }

  /**
   * Get the balance of an account.
   * @param id Account ID
   * @returns The account balance
   */
  async getBalance(id: number): Promise<number> {
    const result = await db(this.tableName)
      .where({ id })
      .select('balance')
      .first();

    if (!result) {
      throw new NotFoundError('Account not found');
    }

    return result.balance;
  }

  /**
   * Check if an account exists by account number.
   * @param accountNumber Account number
   * @returns True if exists, false otherwise
   */
  async existsByAccountNumber(accountNumber: string): Promise<boolean> {
    const result = await db(this.tableName)
      .where({ account_number: accountNumber })
      .select('id')
      .first();

    return !!result;
  }

  /**
   * Delete an account by ID.
   * @param id Account ID
   * @returns True if deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    const deletedCount = await db(this.tableName)
      .where({ id })
      .del();

    return deletedCount > 0;
  }

  /**
   * Transfer funds between accounts within a transaction.
   * @param senderAccountId Sender's account ID
   * @param recipientAccountId Recipient's account ID
   * @param amount Amount to transfer
   * @param trx Transaction context
   * @returns Updated sender and recipient accounts
   */
  async transferFunds(
    senderAccountId: number,
    recipientAccountId: number,
    amount: number,
    trx: any
  ): Promise<{ senderAccount: Account; recipientAccount: Account }> {
    // Get current balances
    const senderAccount = await trx(this.tableName)
      .where({ id: senderAccountId })
      .first();
    
    const recipientAccount = await trx(this.tableName)
      .where({ id: recipientAccountId })
      .first();

    if (!senderAccount || !recipientAccount) {
      throw new NotFoundError('One or both accounts not found');
    }

    const newSenderBalance = senderAccount.balance - amount;
    const newRecipientBalance = recipientAccount.balance + amount;

    // Update balances
    await trx(this.tableName)
      .where({ id: senderAccountId })
      .update({
        balance: newSenderBalance,
        updated_at: new Date(),
      });

    await trx(this.tableName)
      .where({ id: recipientAccountId })
      .update({
        balance: newRecipientBalance,
        updated_at: new Date(),
      });

    // Return updated accounts
    const updatedSenderAccount = await this.findById(senderAccountId);
    const updatedRecipientAccount = await this.findById(recipientAccountId);

    if (!updatedSenderAccount || !updatedRecipientAccount) {
      throw new Error('Failed to retrieve updated accounts');
    }

    return {
      senderAccount: updatedSenderAccount,
      recipientAccount: updatedRecipientAccount,
    };
  }

  /**
   * Map a database row to the Account model.
   * @param dbResult Database row
   * @returns Account model
   */
  private mapDbToModel(dbResult: any): Account {
    return {
      id: dbResult.id,
      userId: dbResult.user_id,
      accountNumber: dbResult.account_number,
      balance: parseFloat(dbResult.balance),
      status: dbResult.status as AccountStatus,
      createdAt: dbResult.created_at,
      updatedAt: dbResult.updated_at,
    };
  }
}