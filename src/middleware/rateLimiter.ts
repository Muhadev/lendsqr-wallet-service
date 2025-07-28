// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'), // limit each IP to 5 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Transaction rate limiter
export const transactionLimiter = rateLimit({
  windowMs: parseInt(process.env.TRANSACTION_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.TRANSACTION_RATE_LIMIT_MAX_REQUESTS || '10'), // limit each IP to 10 transactions per minute
  message: {
    status: 'error',
    message: 'Too many transaction requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Custom key generator for user-based rate limiting
export const createUserBasedLimiter = (windowMs: number, max: number) => {
return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request): string => {
        // Use user ID if authenticated, otherwise fall back to IP
        const user = (req as any).user;
        return user && typeof user.id === 'string' ? `user_${user.id}` : req.ip as string;
    },
    message: {
        status: 'error',
        message: 'Rate limit exceeded for this user.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
};

// User-specific transaction limiter
export const userTransactionLimiter = createUserBasedLimiter(
  parseInt(process.env.USER_TRANSACTION_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  parseInt(process.env.USER_TRANSACTION_RATE_LIMIT_MAX_REQUESTS || '5') // 5 transactions per minute per user
);