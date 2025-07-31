/**
 * Represents a transaction in the wallet system.
 */
export interface Transaction {
  id: number;
  accountId: number;
  type: TransactionType;
  amount: number;
  recipientId?: number;
  reference: string;
  status: TransactionStatus;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enum for transaction types.
 */
export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

/**
 * Enum for transaction statuses.
 */
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

/**
 * Data required to create a new transaction.
 */
export interface CreateTransactionData {
  accountId: number;
  type: TransactionType;
  amount: number;
  recipientId?: number;
  reference: string;
  status?: TransactionStatus;
  description?: string;
}

/**
 * Response shape for transaction-related API responses.
 */
export interface TransactionResponse {
  id: number;
  accountId: number;
  type: TransactionType;
  amount: number;
  recipientId?: number;
  reference: string;
  status: TransactionStatus;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data required to transfer funds between accounts.
 */
export interface TransferData {
  recipientAccountNumber: string;
  amount: number;
  description?: string;
}

/**
 * Data required to fund an account.
 */
export interface FundAccountData {
  amount: number;
  description?: string;
}

/**
 * Data required to withdraw funds from an account.
 */
export interface WithdrawData {
  amount: number;
  description?: string;
}