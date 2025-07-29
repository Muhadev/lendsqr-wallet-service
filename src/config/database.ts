import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lendsqr_wallet',
    charset: 'utf8mb4',
  },
  pool: {
    min: 1,  // Reduced from 2
    max: 5,  // Reduced from 10
    acquireTimeoutMillis: 30000,  // Reduced from 60000
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,  // Reduced from 30000
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
    propagateCreateError: false,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './src/database/migrations',
  },
  seeds: {
    directory: './src/database/seeds',
  },
  // Add debug for development
  debug: process.env.NODE_ENV === 'development',
};

// Create a single database instance
let dbInstance: any = null;

export const db = (() => {
  if (!dbInstance) {
    dbInstance = knex(config);
    
    // Handle connection errors
    dbInstance.on('query-error', (error: any, obj: any) => {
      console.error('Database query error:', error);
    });
  }
  return dbInstance;
})();

// Graceful shutdown function
export const closeDatabase = async () => {
  if (dbInstance) {
    console.log('Closing database connections...');
    await dbInstance.destroy();
    dbInstance = null;
    console.log('Database connections closed');
  }
};

export default config;