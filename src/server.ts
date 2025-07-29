// src/server.ts
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import app from './app';
import { db, closeDatabase } from './config/database';

const PORT = process.env.PORT || 3000;

// Track if server is shutting down
let isShuttingDown = false;

console.log('Starting server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', PORT);

const startServer = async () => {
  try {
    // Test database connection
    console.log('Testing database connection...');
    await db.raw('SELECT 1+1 as result');
    console.log('✅ Database connection successful');
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`✅ Health check: http://localhost:${PORT}/health`);
      console.log(`✅ API Base: http://localhost:${PORT}/api/v1`);
    });

    // Graceful shutdown function
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      console.log(`\n${signal} received, starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async () => {
        console.log('HTTP server closed');
        
        try {
          // Close database connections
          await closeDatabase();
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
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
    console.error('❌ Failed to start server:', error);
    await closeDatabase();
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await closeDatabase();
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await closeDatabase();
  process.exit(1);
});

startServer();