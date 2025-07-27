import { db } from '../config/database';
import { Account, CreateAccountData, AccountStatus } from '../models/Account';
import { NotFoundError } from '../utils/AppError';

export class AccountRepository {
  private tableName = 'accounts';

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

  async findById(id: number): Promise<Account | null> {
    const result = await db(this.tableName)
      .where({ id })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  async findByUserId(userId: number): Promise<Account | null> {
    const result = await db(this.tableName)
      .where({ user_id: userId })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  async findByAccountNumber(accountNumber: string): Promise<Account | null> {
    const result = await db(this.tableName)
      .where({ account_number: accountNumber })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  async updateBalance(id: number, newBalance: number, trx?: any): Promise<Account> {
    const query = trx || db;
    
    await query(this.tableName)
      .where({ id })
      .update({
        balance: newBalance,
        updated_at: new Date(),
      });

    const account = await this.findById(id);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    return account;
  }

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

  async existsByAccountNumber(accountNumber: string): Promise<boolean> {
    const result = await db(this.tableName)
      .where({ account_number: accountNumber })
      .select('id')
      .first();

    return !!result;
  }

  async delete(id: number): Promise<boolean> {
    const deletedCount = await db(this.tableName)
      .where({ id })
      .del();

    return deletedCount > 0;
  }

  /**
   * Transfer funds between accounts within a transaction
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