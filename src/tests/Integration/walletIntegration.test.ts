// walletIntegration.test.ts
import request from 'supertest';
import app from '../../app';
import { db } from '../../config/database';
import bcrypt from 'bcryptjs';


const API_VERSION = process.env.API_VERSION || 'v1';
const baseAuthPath = `/api/${API_VERSION}/auth`;
const baseWalletPath = `/api/${API_VERSION}/wallet`;

describe('Wallet Integration Tests', () => {
  let authToken: string;
  let userId: number;
  let accountNumber: string;

  beforeAll(async () => {
    // Run migrations
    await db.migrate.latest();
  });

  afterAll(async () => {
    // Clean up database
    await db.migrate.rollback();
    await db.destroy();
  });

  beforeEach(async () => {
    // Clean up tables before each test
    await db('transactions').del();
    await db('accounts').del();
    await db('users').del();

    // Register a test user
    const userData = {
      email: 'test@example.com',
      phone: '08123456789',
      firstName: 'Test',
      lastName: 'User',
      bvn: '12345678901',
      password: 'Password123!',
    };

    const registerResponse = await request(app)
      .post(`${baseAuthPath}/register`) // ✅ FIXED
      .send(userData)
      .expect(201);


    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;
    accountNumber = registerResponse.body.data.account.accountNumber;
  });

  describe('Complete wallet workflow', () => {
    it('should handle full wallet operations flow', async () => {
      // 1. Check initial balance
      const balanceResponse = await request(app)
        .get(`${baseWalletPath}/balance`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(balanceResponse.body.data.balance).toBe(0);
      expect(balanceResponse.body.data.accountNumber).toBe(accountNumber);

      // 2. Fund account
      const fundResponse = await request(app)
        .post(`${baseWalletPath}/fund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000,
          description: 'Initial funding',
        })
        .expect(200);

      expect(fundResponse.body.data.newBalance).toBe(5000);
      expect(fundResponse.body.data.transaction.type).toBe('CREDIT');

      // 3. Check balance after funding
      const balanceAfterFunding = await request(app)
        .get(`${baseWalletPath}/balance`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(balanceAfterFunding.body.data.balance).toBe(5000);

      // 4. Create another user for transfer test
      const recipient = {
        email: 'recipient@example.com',
        phone: '08198765432',
        firstName: 'Recipient',
        lastName: 'User',
        bvn: '10987654321',
        password: 'Password123!',
      };

      const recipientResponse = await request(app)
        .post(`${baseAuthPath}/register`)
        .send(recipient)
        .expect(201);

      const recipientAccountNumber = recipientResponse.body.data.account.accountNumber;

      // 5. Transfer funds
      const transferResponse = await request(app)
        .post(`${baseWalletPath}/transfer`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientAccountNumber,
          amount: 1500,
          description: 'Test transfer',
        })
        .expect(200);

      expect(transferResponse.body.data.newBalance).toBe(3500);
      expect(transferResponse.body.data.transaction.type).toBe('DEBIT');

      // 6. Withdraw funds
      const withdrawResponse = await request(app)
        .post(`${baseWalletPath}/withdraw`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 1000,
          description: 'ATM withdrawal',
        })
        .expect(200);

      expect(withdrawResponse.body.data.newBalance).toBe(2500);
      expect(withdrawResponse.body.data.transaction.type).toBe('DEBIT');

      // 7. Check transaction history
      const historyResponse = await request(app)
        .get(`${baseWalletPath}/transactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.data.transactions).toHaveLength(3);
      expect(historyResponse.body.data.pagination.totalCount).toBe(3);

      // 8. Get account summary
      const summaryResponse = await request(app)
        .get(`${baseWalletPath}/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(summaryResponse.body.data.balance).toBe(2500);
      expect(summaryResponse.body.data.totalCredits).toBe(5000);
      expect(summaryResponse.body.data.totalDebits).toBe(2500);
      expect(summaryResponse.body.data.transactionCount).toBe(3);

      // 9. Get specific transaction by reference
      const transactionRef = withdrawResponse.body.data.transaction.reference;
      const transactionResponse = await request(app)
        .get(`${baseWalletPath}/transactions/${transactionRef}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(transactionResponse.body.data.reference).toBe(transactionRef);
      expect(transactionResponse.body.data.amount).toBe(1000);
    });

    it('should handle edge cases and error scenarios', async () => {
      // Test insufficient funds
      await request(app)
        .post(`${baseWalletPath}/withdraw`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 1000 })
        .expect(400);

      // Test invalid recipient account
      await request(app)
        .post(`${baseWalletPath}/transfer`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientAccountNumber: 'INVALID_ACCOUNT',
          amount: 100,
        })
        .expect(400);

      // Test amount validation
      await request(app)
        .post(`${baseWalletPath}/fund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: -100 })
        .expect(400);

      // Test maximum limits
      await request(app)
        .post(`${baseWalletPath}/fund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 2000000 })
        .expect(400);
    });
  });
});