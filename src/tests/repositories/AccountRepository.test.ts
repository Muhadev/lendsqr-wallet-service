// src/repositories/AccountRepository.ts
import { db } from '../../config/database';
import { Account, CreateAccountData, AccountStatus } from '../../models/Account';
import { Knex } from 'knex';

export class AccountRepository {
  private tableName = 'accounts';

  async findById(id: number, trx?: Knex.Transaction): Promise<Account | null> {
    const query = trx ? trx(this.tableName) : db(this.tableName);
    const result = await query
      .select('*')
      .where('id', id)
      .first();

    return result ? this.mapDbToAccount(result) : null;
  }

  async findByUserId(userId: number, trx?: Knex.Transaction): Promise<Account | null> {
    const query = trx ? trx(this.tableName) : db(this.tableName);
    const result = await query
      .select('*')
      .where('user_id', userId)
      .first();

    return result ? this.mapDbToAccount(result) : null;
  }

  async findByAccountNumber(accountNumber: string, trx?: Knex.Transaction): Promise<Account | null> {
    const query = trx ? trx(this.tableName) : db(this.tableName);
    const result = await query
      .select('*')
      .where('account_number', accountNumber)
      .first();

    return result ? this.mapDbToAccount(result) : null;
  }

  async existsByAccountNumber(accountNumber: string, trx?: Knex.Transaction): Promise<boolean> {
    const query = trx ? trx(this.tableName) : db(this.tableName);
    const result = await query
      .select('id')
      .where('account_number', accountNumber)
      .first();

    return !!result;
  }

  async create(accountData: CreateAccountData, trx?: Knex.Transaction): Promise<Account> {
    const query = trx ? trx(this.tableName) : db(this.tableName);
    const [result] = await query
      .insert({
        user_id: accountData.userId,
        account_number: accountData.accountNumber,
        balance: accountData.balance || 0,
        status: accountData.status || AccountStatus.ACTIVE,
      })
      .returning('*');

    return this.mapDbToAccount(result);
  }

  async updateBalance(id: number, newBalance: number, trx?: Knex.Transaction): Promise<Account> {
    const query = trx ? trx(this.tableName) : db(this.tableName);
    const [result] = await query
      .where('id', id)
      .update({ balance: newBalance })
      .returning('*');

    return this.mapDbToAccount(result);
  }

  async updateStatus(id: number, status: AccountStatus, trx?: Knex.Transaction): Promise<Account> {
    const query = trx ? trx(this.tableName) : db(this.tableName);
    const [result] = await query
      .where('id', id)
      .update({ status })
      .returning('*');

    return this.mapDbToAccount(result);
  }

  async transferFunds(
    senderAccountId: number,
    recipientAccountId: number,
    amount: number,
    trx?: Knex.Transaction
  ): Promise<{ senderAccount: Account; recipientAccount: Account }> {
    const query = trx ? trx(this.tableName) : db(this.tableName);

    // Debit sender account
    const [senderResult] = await query
      .where('id', senderAccountId)
      .decrement('balance', amount)
      .returning('*');

    // Credit recipient account
    const [recipientResult] = await query
      .where('id', recipientAccountId)
      .increment('balance', amount)
      .returning('*');

    return {
      senderAccount: this.mapDbToAccount(senderResult),
      recipientAccount: this.mapDbToAccount(recipientResult),
    };
  }

  private mapDbToAccount(dbRow: any): Account {
    return {
      id: dbRow.id,
      userId: dbRow.user_id,
      accountNumber: dbRow.account_number,
      balance: parseFloat(dbRow.balance),
      status: dbRow.status as AccountStatus,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };
  }
}
