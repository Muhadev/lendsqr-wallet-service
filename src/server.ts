import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

import app from "./app";
import { db, closeDatabase } from "./config/database";
import { logger } from "./utils/logger";

/**
 * List of required environment variables for the application to run.
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
];

/**
 * Validate all required environment variables are present.
 * Exits the process if any are missing.
 */
const validateEnvironmentVariables = (): void => {
  const missingEnvs = requiredEnvs.filter((env) => !process.env[env]);
  if (missingEnvs.length > 0) {
    logger.error("Missing required environment variables", {
      missingVariables: missingEnvs,
    });
    process.exit(1);
  }
};

let isShuttingDown = false;

/**
 * Start the server with proper error handling and graceful shutdown.
 * - Validates environment variables.
 * - Tests database connection.
 * - Starts the HTTP server.
 * - Handles graceful shutdown on signals.
 */
const startServer = async (): Promise<void> => {
  try {
    validateEnvironmentVariables();

    const PORT = process.env.PORT!;
    const API_VERSION = process.env.API_VERSION!;
    const API_BASE_URL = process.env.API_BASE_URL!;
    const SHUTDOWN_TIMEOUT_ENV = process.env.SHUTDOWN_TIMEOUT;
    if (!SHUTDOWN_TIMEOUT_ENV) {
      logger.error("Missing required environment variable: SHUTDOWN_TIMEOUT");
      process.exit(1);
    }
    const SHUTDOWN_TIMEOUT = Number.parseInt(SHUTDOWN_TIMEOUT_ENV);

    logger.info("Starting Lendsqr Wallet Service", {
      environment: process.env.NODE_ENV,
      port: PORT,
      version: API_VERSION,
    });

    // Test database connection
    logger.info("Testing database connection...");
    await db.raw("SELECT 1+1 as result");
    logger.info("Database connection successful");

    // Start the server
    const server = app.listen(PORT, () => {
      logger.info("Server started successfully", {
        port: PORT,
        healthCheck: `${API_BASE_URL}/health`,
        apiBase: `${API_BASE_URL}/api/${API_VERSION}`,
      });
    });

    /**
     * Graceful shutdown handler.
     * @param signal - Signal that triggered the shutdown
     */
    const gracefulShutdown = async (signal: string): Promise<void> => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info("Graceful shutdown initiated", { signal });

      server.close(async () => {
        logger.info("HTTP server closed");
        try {
          await closeDatabase();
          logger.info("Graceful shutdown completed successfully");
          process.exit(0);
        } catch (error: any) {
          logger.error("Error during shutdown", { error: error.message });
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error("Forced shutdown due to timeout", { timeout: SHUTDOWN_TIMEOUT });
        process.exit(1);
      }, SHUTDOWN_TIMEOUT);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.once("SIGUSR2", async () => {
      await gracefulShutdown("SIGUSR2 (nodemon restart)");
      process.kill(process.pid, "SIGUSR2");
    });
  } catch (error: any) {
    logger.error("Failed to start server", {
      error: error.message,
      stack: error.stack,
    });
    await closeDatabase();
    process.exit(1);
  }
};

/**
 * Handle unhandled promise rejections.
 */
process.on("unhandledRejection", async (reason: any, promise: Promise<any>) => {
  logger.error("Unhandled Promise Rejection", {
    reason: reason?.message || reason,
    promise: promise.toString(),
  });
  await closeDatabase();
  process.exit(1);
});

/**
 * Handle uncaught exceptions.
 */
process.on("uncaughtException", async (error: Error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  await closeDatabase();
  process.exit(1);
});

// Start the server
startServer();