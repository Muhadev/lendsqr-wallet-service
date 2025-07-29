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

export enum TransactionType {
  CREDIT = 'CREDIT',  // Changed to uppercase
  DEBIT = 'DEBIT',    // Changed to uppercase
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

export interface CreateTransactionData {
  accountId: number;
  type: TransactionType;
  amount: number;
  recipientId?: number;
  reference: string;
  status?: TransactionStatus;
  description?: string;
}

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

export interface TransferData {
  recipientAccountNumber: string;
  amount: number;
  description?: string;
}

export interface FundAccountData {
  amount: number;
  description?: string;
}

export interface WithdrawData {
  amount: number;
  description?: string;
}