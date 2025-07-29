import { errorHandler } from '../../middleware/errorHandler';
import { AppError } from '../../utils/AppError';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';

describe('errorHandler middleware', () => {
  let app: express.Express;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Route that throws error
    app.get('/app-error', (req, res, next) => {
      next(new AppError('App error', 400));
    });
    app.get('/joi-error', (req, res, next) => {
      const err = new Error('Validation failed');
      (err as any).name = 'ValidationError';
      next(err);
    });
    app.get('/jwt-error', (req, res, next) => {
      const err = new Error('jwt malformed');
      (err as any).name = 'JsonWebTokenError';
      next(err);
    });
    app.get('/dup-error', (req, res, next) => {
      next(new Error('ER_DUP_ENTRY: Duplicate entry'));
    });
    app.get('/generic-error', (req, res, next) => {
      next(new Error('Something went wrong'));
    });
    app.use(errorHandler);
  });

  it('should handle AppError', async () => {
    const res = await request(app).get('/app-error');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('App error');
  });

  it('should handle Joi validation error', async () => {
    const res = await request(app).get('/joi-error');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/validation/i);
  });

  it('should handle JWT error', async () => {
    const res = await request(app).get('/jwt-error');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid token/i);
  });

  it('should handle duplicate entry error', async () => {
    const res = await request(app).get('/dup-error');
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/duplicate entry/i);
  });

  it('should handle generic error', async () => {
    const res = await request(app).get('/generic-error');
    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/internal server error/i);
  });
});
