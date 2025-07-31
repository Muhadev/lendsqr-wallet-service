// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/authRoutes';
import walletRoutes from './routes/walletRoutes';
import kycRoutes from './routes/kycRoutes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { 
  generalLimiter, 
  authLimiter, 
  transactionLimiter 
} from './middleware/rateLimiter';

// Import utilities
import { logger } from './utils/logger';

dotenv.config();

const app = express();

// Trust proxy for accurate IP addresses behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL?.split(',') || []
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general rate limiting to all requests
app.use(generalLimiter);

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Lendsqr Wallet Service is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.API_VERSION,
  });
});

// API info endpoint
app.get(`/api/${process.env.API_VERSION}`, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Lendsqr Wallet Service API',
    version: process.env.API_VERSION,
    documentation: `${process.env.API_BASE_URL}/docs`,
    endpoints: {
      auth: `${process.env.API_BASE_URL}/api/${process.env.API_VERSION}/auth`,
      wallet: `${process.env.API_BASE_URL}/api/${process.env.API_VERSION}/wallet`,
    },
  });
});

// Apply stricter rate limiting to auth routes
app.use(`/api/${process.env.API_VERSION}/auth`, authLimiter);

// Apply transaction rate limiting to wallet routes
app.use(`/api/${process.env.API_VERSION}/wallet`, transactionLimiter);

// API routes
app.use(`/api/${process.env.API_VERSION}/auth`, authRoutes);
app.use(`/api/${process.env.API_VERSION}/wallet`, walletRoutes);
app.use(`/api/${process.env.API_VERSION}/kyc`, kycRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;