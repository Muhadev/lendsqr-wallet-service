/**
 * Represents a user account in the wallet system.
 */
export interface Account {
  id: number;
  userId: number;
  accountNumber: string;
  balance: number;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enum for possible account statuses.
 */
export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * Data required to create a new account.
 */
export interface CreateAccountData {
  userId: number;
  accountNumber: string;
  balance?: number;
  status?: AccountStatus;
}

/**
 * Response shape for account-related API responses.
 */
export interface AccountResponse {
  id: number;
  accountNumber: string;
  balance: number;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}