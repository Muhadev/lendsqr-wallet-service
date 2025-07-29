import request from 'supertest';
import express from 'express';
import { generalLimiter, authLimiter, transactionLimiter, createUserBasedLimiter } from '../../middleware/rateLimiter';

describe('rateLimiter middleware', () => {
  let app: express.Express;
  beforeEach(() => {
    app = express();
    app.get('/test', generalLimiter, (req, res) => res.json({ ok: true }));
    app.get('/auth', authLimiter, (req, res) => res.json({ ok: true }));
    app.get('/txn', transactionLimiter, (req, res) => res.json({ ok: true }));
  });

  it('should allow requests under the limit', async () => {
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should use custom user-based limiter key', async () => {
    const userLimiter = createUserBasedLimiter(1000, 1);
    const userApp = express();
    userApp.use((req, res, next) => {
      (req as any).user = { id: 'abc' };
      next();
    });
    userApp.get('/user', userLimiter, (req, res) => res.json({ ok: true }));
    const res = await request(userApp).get('/user');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
