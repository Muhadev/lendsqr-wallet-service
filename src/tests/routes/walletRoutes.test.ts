// src/tests/routes/walletRoutes.test.ts
import request from 'supertest';
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import walletRoutes from '../../routes/walletRoutes';
import { authenticate } from '../../middleware/auth';
import { WalletController } from '../../controllers/WalletController';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock middleware and controller
jest.mock('../../middleware/auth');
jest.mock('../../controllers/WalletController');

const app = express();
app.use(express.json());
app.use('/api/wallet', walletRoutes);

describe('Wallet Routes', () => {
  const mockAuthMiddleware = authenticate as jest.MockedFunction<typeof authenticate>;
  const mockWalletController = WalletController as jest.MockedClass<typeof WalletController>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticate middleware to call next()
    mockAuthMiddleware.mockImplementation((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      req.user = { id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User' };
      next();
    });

    // Mock controller methods
    const mockControllerInstance = {
      getBalance: jest.fn((req: Request, res: Response) => res.json({ status: 'success' })),
      fundAccount: jest.fn((req: Request, res: Response) => res.json({ status: 'success' })),
      transferFunds: jest.fn((req: Request, res: Response) => res.json({ status: 'success' })),
      withdrawFunds: jest.fn((req: Request, res: Response) => res.json({ status: 'success' })),
      getTransactionHistory: jest.fn((req: Request, res: Response) => res.json({ status: 'success' })),
      getTransactionByReference: jest.fn((req: Request, res: Response) => res.json({ status: 'success' })),
      getAccountSummary: jest.fn((req: Request, res: Response) => res.json({ status: 'success' })),
    };

    mockWalletController.mockImplementation(() => mockControllerInstance as any);
  });

  it('should require authentication for all routes', async () => {
    const routes = [
      { method: 'get', path: '/api/wallet/balance' },
      { method: 'post', path: '/api/wallet/fund' },
      { method: 'post', path: '/api/wallet/transfer' },
      { method: 'post', path: '/api/wallet/withdraw' },
      { method: 'get', path: '/api/wallet/transactions' },
      { method: 'get', path: '/api/wallet/transactions/TXN123' },
      { method: 'get', path: '/api/wallet/summary' },
    ];

    for (const route of routes) {
      await request(app)[route.method as keyof typeof request](route.path).expect(200);
      expect(mockAuthMiddleware).toHaveBeenCalled();
    }
  });

  it('should handle GET /balance', async () => {
    await request(app)
      .get('/api/wallet/balance')
      .expect(200)
      .expect({ status: 'success' });
  });

  it('should handle POST /fund', async () => {
    await request(app)
      .post('/api/wallet/fund')
      .send({ amount: 1000 })
      .expect(200)
      .expect({ status: 'success' });
  });

  it('should handle POST /transfer', async () => {
    await request(app)
      .post('/api/wallet/transfer')
      .send({ amount: 500, recipientAccountNumber: '1234567890' })
      .expect(200)
      .expect({ status: 'success' });
  });

  it('should handle POST /withdraw', async () => {
    await request(app)
      .post('/api/wallet/withdraw')
      .send({ amount: 200 })
      .expect(200)
      .expect({ status: 'success' });
  });

  it('should handle GET /transactions', async () => {
    await request(app)
      .get('/api/wallet/transactions')
      .expect(200)
      .expect({ status: 'success' });
  });

  it('should handle GET /transactions/:reference', async () => {
    await request(app)
      .get('/api/wallet/transactions/TXN123456789')
      .expect(200)
      .expect({ status: 'success' });
  });

  it('should handle GET /summary', async () => {
    await request(app)
      .get('/api/wallet/summary')
      .expect(200)
      .expect({ status: 'success' });
  });
});
