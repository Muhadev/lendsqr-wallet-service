export interface Account {
  id: number;
  userId: number;
  accountNumber: string;
  balance: number;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface CreateAccountData {
  userId: number;
  accountNumber: string;
  balance?: number;
  status?: AccountStatus;
}

export interface AccountResponse {
  id: number;
  accountNumber: string;
  balance: number;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}