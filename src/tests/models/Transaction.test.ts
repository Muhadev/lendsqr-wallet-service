import { Transaction, TransactionType, TransactionStatus, CreateTransactionData, TransactionResponse, TransferData, FundAccountData } from '../../models/Transaction';

describe('Transaction model', () => {
  it('should match the Transaction interface shape', () => {
    const t: Transaction = {
      id: 1,
      accountId: 2,
      type: TransactionType.CREDIT,
      amount: 100,
      recipientId: 3,
      reference: 'ref',
      status: TransactionStatus.PENDING,
      description: 'desc',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(t).toHaveProperty('type');
    expect(t.type).toBe(TransactionType.CREDIT);
  });

  it('should have correct TransactionType enum values', () => {
    expect(TransactionType.CREDIT).toBe('CREDIT');
    expect(TransactionType.DEBIT).toBe('DEBIT');
  });

  it('should have correct TransactionStatus enum values', () => {
    expect(TransactionStatus.PENDING).toBe('pending');
    expect(TransactionStatus.COMPLETED).toBe('completed');
    expect(TransactionStatus.FAILED).toBe('failed');
    expect(TransactionStatus.REVERSED).toBe('reversed');
  });

  it('should match the CreateTransactionData interface shape', () => {
    const data: CreateTransactionData = {
      accountId: 2,
      type: TransactionType.DEBIT,
      amount: 50,
      reference: 'ref',
    };
    expect(data).toHaveProperty('type');
    expect(data).toHaveProperty('reference');
  });

  it('should match the TransactionResponse interface shape', () => {
    const resp: TransactionResponse = {
      id: 1,
      accountId: 2,
      type: TransactionType.DEBIT,
      amount: 50,
      reference: 'ref',
      status: TransactionStatus.COMPLETED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(resp).toHaveProperty('id');
    expect(resp).toHaveProperty('createdAt');
  });

  it('should match the TransferData and FundAccountData interface shapes', () => {
    const transfer: TransferData = { recipientAccountNumber: '123', amount: 10 };
    const fund: FundAccountData = { amount: 10 };
    expect(transfer).toHaveProperty('recipientAccountNumber');
    expect(fund).toHaveProperty('amount');
  });
});
