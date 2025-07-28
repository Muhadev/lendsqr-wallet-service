// src/tests/middleware/rateLimiter.test.ts
import request from 'supertest';
import express from 'express';
import { generalLimiter, authLimiter, transactionLimiter } from '../../middleware/rateLimiter';

describe('Rate Limiters', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('generalLimiter', () => {
    beforeEach(() => {
      app.use(generalLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));
    });

    it('should allow requests within limit', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    });
  });

  describe('authLimiter', () => {
    beforeEach(() => {
      app.use(authLimiter);
      app.post('/auth/login', (req, res) => res.json({ success: true }));
    });

    it('should allow auth requests within limit', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('transactionLimiter', () => {
    beforeEach(() => {
      app.use(transactionLimiter);
      app.post('/wallet/transfer', (req, res) => res.json({ success: true }));
    });

    it('should allow transaction requests within limit', async () => {
      const response = await request(app)
        .post('/wallet/transfer')
        .send({ amount: 1000, recipientAccountNumber: '1234567890' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });
});