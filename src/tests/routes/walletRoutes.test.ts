
// Place all mock function declarations at the very top
const mockGetBalance = jest.fn();
const mockFundAccount = jest.fn();
const mockTransferFunds = jest.fn();
const mockWithdrawFunds = jest.fn();
const mockGetTransactionHistory = jest.fn();
const mockGetTransactionByReference = jest.fn();
const mockGetAccountSummary = jest.fn();

jest.mock('../../controllers/WalletController', () => {
  return {
    WalletController: jest.fn().mockImplementation(() => ({
      getBalance: mockGetBalance,
      fundAccount: mockFundAccount,
      transferFunds: mockTransferFunds,
      withdrawFunds: mockWithdrawFunds,
      getTransactionHistory: mockGetTransactionHistory,
      getTransactionByReference: mockGetTransactionByReference,
      getAccountSummary: mockGetAccountSummary,
    })),
  };
});
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req: any, res: any, next: any) => next()),
}));

import request from 'supertest';
import express, { Express } from 'express';
import walletRoutes from '../../routes/walletRoutes';
import { WalletController } from '../../controllers/WalletController';
import { authenticate } from '../../middleware/auth';

describe('walletRoutes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/wallet', walletRoutes);
    jest.clearAllMocks();
  });

  it('GET /wallet/balance should call WalletController.getBalance', async () => {
    mockGetBalance.mockImplementation((req, res) => res.status(200).json({ status: 'success' }));
    const res = await request(app).get('/wallet/balance');
    expect(mockGetBalance).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('POST /wallet/fund should call WalletController.fundAccount', async () => {
    mockFundAccount.mockImplementation((req, res) => res.status(200).json({ status: 'success' }));
    const res = await request(app).post('/wallet/fund').send({});
    expect(mockFundAccount).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('POST /wallet/transfer should call WalletController.transferFunds', async () => {
    mockTransferFunds.mockImplementation((req, res) => res.status(200).json({ status: 'success' }));
    const res = await request(app).post('/wallet/transfer').send({});
    expect(mockTransferFunds).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('POST /wallet/withdraw should call WalletController.withdrawFunds', async () => {
    mockWithdrawFunds.mockImplementation((req, res) => res.status(200).json({ status: 'success' }));
    const res = await request(app).post('/wallet/withdraw').send({});
    expect(mockWithdrawFunds).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('GET /wallet/transactions should call WalletController.getTransactionHistory', async () => {
    mockGetTransactionHistory.mockImplementation((req, res) => res.status(200).json({ status: 'success' }));
    const res = await request(app).get('/wallet/transactions');
    expect(mockGetTransactionHistory).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('GET /wallet/transactions/:reference should call WalletController.getTransactionByReference', async () => {
    mockGetTransactionByReference.mockImplementation((req, res) => res.status(200).json({ status: 'success' }));
    const res = await request(app).get('/wallet/transactions/abc123');
    expect(mockGetTransactionByReference).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('GET /wallet/summary should call WalletController.getAccountSummary', async () => {
    mockGetAccountSummary.mockImplementation((req, res) => res.status(200).json({ status: 'success' }));
    const res = await request(app).get('/wallet/summary');
    expect(mockGetAccountSummary).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
