// src/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit"
import type { Request } from "express"

/**
 * General API rate limiter for all endpoints
 */
export const generalLimiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: {
    status: "error",
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: Number.parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || "5"),
  message: {
    status: "error",
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
})

/**
 * Transaction rate limiter for wallet operations
 */
export const transactionLimiter = rateLimit({
  windowMs: Number.parseInt(process.env.TRANSACTION_RATE_LIMIT_WINDOW_MS || "60000"), // 1 minute
  max: Number.parseInt(process.env.TRANSACTION_RATE_LIMIT_MAX_REQUESTS || "10"),
  message: {
    status: "error",
    message: "Too many transaction requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Create a user-based rate limiter
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum requests per window
 * @returns Rate limiter middleware
 */
export const createUserBasedLimiter = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request): string => {
      const user = (req as any).user
      return user && typeof user.id === "string" ? `user_${user.id}` : (req.ip as string)
    },
    message: {
      status: "error",
      message: "Rate limit exceeded for this user.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  })
}

/**
 * User-specific transaction limiter
 */
export const userTransactionLimiter = createUserBasedLimiter(
  Number.parseInt(process.env.USER_TRANSACTION_RATE_LIMIT_WINDOW_MS || "60000"), // 1 minute
  Number.parseInt(process.env.USER_TRANSACTION_RATE_LIMIT_MAX_REQUESTS || "5"), // 5 transactions per minute per user
)
