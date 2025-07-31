import dotenv from "dotenv"

// Load environment variables first
dotenv.config()

import app from "./app"
import { db, closeDatabase } from "./config/database"
import { logger } from "./utils/logger"

/**
 * Required environment variables for the application
 */
const requiredEnvs = [
  "PORT",
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "JWT_SECRET",
  "ADJUTOR_API_URL",
  "ADJUTOR_API_KEY",
]

/**
 * Validate all required environment variables are present
 */
const validateEnvironmentVariables = (): void => {
  const missingEnvs = requiredEnvs.filter((env) => !process.env[env])

  if (missingEnvs.length > 0) {
    logger.error("Missing required environment variables", {
      missingVariables: missingEnvs,
    })
    process.exit(1)
  }
}

// Track if server is shutting down
let isShuttingDown = false

/**
 * Start the server with proper error handling and graceful shutdown
 */
const startServer = async (): Promise<void> => {
  try {
    // Validate environment variables
    validateEnvironmentVariables()

    const PORT = process.env.PORT!

    logger.info("Starting Lendsqr Wallet Service", {
      environment: process.env.NODE_ENV,
      port: PORT,
      version: process.env.API_VERSION || "1.0.0",
    })

    // Test database connection
    logger.info("Testing database connection...")
    await db.raw("SELECT 1+1 as result")
    logger.info("Database connection successful")

    // Start the server
    const server = app.listen(PORT, () => {
      logger.info("Server started successfully", {
        port: PORT,
        healthCheck: `http://localhost:${PORT}/health`,
        apiBase: `http://localhost:${PORT}/api/v1`,
      })
    })

    /**
     * Graceful shutdown handler
     */
    const gracefulShutdown = async (signal: string): Promise<void> => {
      if (isShuttingDown) return
      isShuttingDown = true

      logger.info("Graceful shutdown initiated", { signal })

      // Stop accepting new connections
      server.close(async () => {
        logger.info("HTTP server closed")

        try {
          // Close database connections
          await closeDatabase()
          logger.info("Graceful shutdown completed successfully")
          process.exit(0)
        } catch (error: any) {
          logger.error("Error during shutdown", { error: error.message })
          process.exit(1)
        }
      })

      // Force close after timeout
      const shutdownTimeout = Number.parseInt(process.env.SHUTDOWN_TIMEOUT || "10000")
      setTimeout(() => {
        logger.error("Forced shutdown due to timeout", { timeout: shutdownTimeout })
        process.exit(1)
      }, shutdownTimeout)
    }

    // Handle different shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
    process.on("SIGINT", () => gracefulShutdown("SIGINT"))

    // Handle nodemon restart
    process.once("SIGUSR2", async () => {
      await gracefulShutdown("SIGUSR2 (nodemon restart)")
      process.kill(process.pid, "SIGUSR2")
    })
  } catch (error: any) {
    logger.error("Failed to start server", {
      error: error.message,
      stack: error.stack,
    })
    await closeDatabase()
    process.exit(1)
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", async (reason: any, promise: Promise<any>) => {
  logger.error("Unhandled Promise Rejection", {
    reason: reason?.message || reason,
    promise: promise.toString(),
  })
  await closeDatabase()
  process.exit(1)
})

// Handle uncaught exceptions
process.on("uncaughtException", async (error: Error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  })
  await closeDatabase()
  process.exit(1)
})

// Start the server
startServer()
