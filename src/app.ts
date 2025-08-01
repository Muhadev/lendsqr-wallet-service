import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import dotenv from "dotenv"

// Import routes
import authRoutes from "./routes/authRoutes"
import walletRoutes from "./routes/walletRoutes"
import kycRoutes from "./routes/kycRoutes"

// Import middleware
import { errorHandler } from "./middleware/errorHandler"
import { generalLimiter, authLimiter, transactionLimiter } from "./middleware/rateLimiter"

// Import utilities
import { logger } from "./utils/logger"

dotenv.config()

const app = express()

// Validate required environment variables
const requiredEnvs = [
  "API_VERSION",
  "BODY_LIMIT",
  "NODE_ENV",
  "CLIENT_URL",
  "HSTS_MAX_AGE",
  "API_BASE_URL"
]
requiredEnvs.forEach((env) => {
  if (!process.env[env]) {
    throw new Error(`${env} environment variable is required`)
  }
})

// Trust proxy for accurate IP addresses behind reverse proxy
app.set("trust proxy", 1)

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: Number.parseInt(process.env.HSTS_MAX_AGE!),
      includeSubDomains: true,
      preload: true,
    },
  }),
)

// CORS configuration (no hardcoded URLs)
const clientUrls =
  process.env.CLIENT_URL?.split(",").map((url) => url.trim()).filter(Boolean) || []

if (clientUrls.length === 0) {
  throw new Error("CLIENT_URL environment variable is required for CORS configuration")
}

const corsOptions = {
  origin: clientUrls,
  credentials: true,
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))

// Request logging
app.use(
  morgan("combined", {
    stream: {
      write: (message: string) => {
        logger.info(message.trim())
      },
    },
  }),
)

// Body parsing middleware
const bodyLimit = process.env.BODY_LIMIT!
app.use(express.json({ limit: bodyLimit }))
app.use(express.urlencoded({ extended: true, limit: bodyLimit }))

// Apply general rate limiting to all requests
app.use(generalLimiter)

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Lendsqr Wallet Service is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.API_VERSION,
  })
})

/**
 * API info endpoint
 */
app.get(`/api/${process.env.API_VERSION}`, (req, res) => {
  const baseUrl = process.env.API_BASE_URL
  const apiVersion = process.env.API_VERSION

  res.status(200).json({
    status: "success",
    message: "Lendsqr Wallet Service API",
    version: apiVersion,
    documentation: baseUrl ? `${baseUrl}/docs` : undefined,
    endpoints: {
      auth: `${baseUrl}/api/${apiVersion}/auth`,
      wallet: `${baseUrl}/api/${apiVersion}/wallet`,
      kyc: `${baseUrl}/api/${apiVersion}/kyc`,
    },
  })
})

// Apply stricter rate limiting to auth routes
app.use(`/api/${process.env.API_VERSION}/auth`, authLimiter)

// Apply transaction rate limiting to wallet routes
app.use(`/api/${process.env.API_VERSION}/wallet`, transactionLimiter)

// API routes
app.use(`/api/${process.env.API_VERSION}/auth`, authRoutes)
app.use(`/api/${process.env.API_VERSION}/wallet`, walletRoutes)
app.use(`/api/${process.env.API_VERSION}/kyc`, kycRoutes)

/**
 * 404 handler for undefined routes
 */
app.use("*", (req, res) => {
  logger.warn("Route not found", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  })

  res.status(404).json({
    status: "error",
    message: `Route ${req.originalUrl} not found`,
  })
})

// Global error handler
app.use(errorHandler)

/**
 * Graceful shutdown handling
 */
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully")
  process.exit(0)
})

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully")
  process.exit(0)
})

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  logger.error("Unhandled Promise Rejection", {
    reason: reason?.message || reason,
    promise: promise.toString(),
  })
  process.exit(1)
})

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  })
  process.exit(1)
})

export default app