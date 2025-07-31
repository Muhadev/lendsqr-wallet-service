import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import app from './app';
import { db, closeDatabase } from './config/database';
import { logger } from './utils/logger';

const PORT = process.env.PORT;

// List all required envs here
const requiredEnvs = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'ADJUTOR_API_URL',
  'ADJUTOR_API_KEY',
  // add others as needed
];
requiredEnvs.forEach((env) => {
  if (!process.env[env]) {
    logger.error(`Missing required environment variable: ${env}`);
    process.exit(1);
  }
});

// Track if server is shutting down
let isShuttingDown = false;

logger.info('Starting server...');
logger.info(`Environment: ${process.env.NODE_ENV}`);
logger.info(`Port: ${PORT}`);

const startServer = async () => {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    await db.raw('SELECT 1+1 as result');
    logger.info('✅ Database connection successful');
    
    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`✅ Server is running on http://localhost:${PORT}`);
      logger.info(`✅ Health check: http://localhost:${PORT}/health`);
      logger.info(`✅ API Base: http://localhost:${PORT}/api/v1`);
    });

    // Graceful shutdown function
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      logger.info(`${signal} received, starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Close database connections
          await closeDatabase();
          logger.info('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Handle different shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle nodemon restart
    process.once('SIGUSR2', async () => {
      await gracefulShutdown('SIGUSR2 (nodemon restart)');
      process.kill(process.pid, 'SIGUSR2');
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    await closeDatabase();
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  await closeDatabase();
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught Exception:', error);
  await closeDatabase();
  process.exit(1);
});

startServer();