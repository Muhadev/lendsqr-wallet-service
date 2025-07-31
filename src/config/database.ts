import knex from 'knex';
import { logger } from '../utils/logger';

/**
 * Database configuration and connection management
 * Provides a singleton database instance with proper error handling
 */

// Required environment variables for database connection
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT', 
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'DB_POOL_MIN',
  'DB_POOL_MAX',
  'DB_ACQUIRE_TIMEOUT',
  'DB_CREATE_TIMEOUT',
  'DB_DESTROY_TIMEOUT',
  'DB_IDLE_TIMEOUT',
  'DB_REAP_INTERVAL',
  'DB_CREATE_RETRY_INTERVAL'
];

// Validate required environment variables
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

const config = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT!),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN!),
    max: parseInt(process.env.DB_POOL_MAX!),
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT!),
    createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT!),
    destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT!),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT!),
    reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL!),
    createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL!),
    propagateCreateError: false,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './src/database/migrations',
  },
  seeds: {
    directory: './src/database/seeds',
  },
  debug: process.env.NODE_ENV === 'development',
};

// Create a single database instance
let dbInstance: any = null;

/**
 * Get database instance (singleton pattern)
 * @returns {knex.Knex} Database instance
 */
export const db = (() => {
  if (!dbInstance) {
    dbInstance = knex(config);
    
    // Handle connection errors
    dbInstance.on('query-error', (error: any, obj: any) => {
      logger.error('Database query error:', { error: error.message, query: obj.sql });
    });
  }
  return dbInstance;
})();

/**
 * Gracefully close database connections
 * @returns {Promise<void>}
 */
export const closeDatabase = async (): Promise<void> => {
  if (dbInstance) {
    logger.info('Closing database connections...');
    await dbInstance.destroy();
    dbInstance = null;
    logger.info('Database connections closed');
  }
};

export default config;
