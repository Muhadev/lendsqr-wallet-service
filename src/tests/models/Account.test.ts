import { Account, AccountStatus, CreateAccountData, AccountResponse } from '../../models/Account';

describe('Account model', () => {
  it('should match the Account interface shape', () => {
    const acc: Account = {
      id: 1,
      userId: 2,
      accountNumber: '1234567890',
      balance: 1000,
      status: AccountStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(acc).toHaveProperty('accountNumber');
    expect(acc.status).toBe(AccountStatus.ACTIVE);
  });

  it('should have correct AccountStatus enum values', () => {
    expect(AccountStatus.ACTIVE).toBe('active');
    expect(AccountStatus.INACTIVE).toBe('inactive');
    expect(AccountStatus.SUSPENDED).toBe('suspended');
  });

  it('should match the CreateAccountData interface shape', () => {
    const data: CreateAccountData = {
      userId: 2,
      accountNumber: '1234567890',
    };
    expect(data).toHaveProperty('userId');
    expect(data).toHaveProperty('accountNumber');
  });

  it('should match the AccountResponse interface shape', () => {
    const resp: AccountResponse = {
      id: 1,
      accountNumber: '1234567890',
      balance: 1000,
      status: AccountStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(resp).toHaveProperty('id');
    expect(resp).toHaveProperty('createdAt');
  });
});
