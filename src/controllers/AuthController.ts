import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { CreateUserData, LoginCredentials } from '../models/User';
import { registerSchema, loginSchema } from '../utils/validators';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

/**
 * Controller for authentication-related endpoints.
 */
export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register a new user.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      logger.info('Registration request received', { body: req.body });

      // Validate request data
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        logger.warn('Validation error during registration', { error: error.details[0].message });
        throw new AppError(error.details[0].message, 400);
      }

      const userData: CreateUserData = value;

      // Register user
      const result = await this.authService.register(userData);
      logger.info('Registration successful', { userId: result.user.id });

      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: result,
      });
    } catch (error: any) {
      logger.error('Registration error', {
        message: error.message,
        stack: error.stack,
        name: error.constructor.name
      });
      next(error);
    }
  };

  /**
   * Login a user.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request data
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        logger.warn('Validation error during login', { error: error.details[0].message });
        throw new AppError(error.details[0].message, 400);
      }

      const credentials: LoginCredentials = value;

      // Login user
      const result = await this.authService.login(credentials);

      logger.info('Login successful', { userId: result.user.id });

      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      logger.error('Login error', { error });
      next(error);
    }
  };

  /**
   * Refresh authentication token for the authenticated user.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  refreshToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const token = await this.authService.refreshToken(req.user.id);

      logger.info('Token refreshed', { userId: req.user.id });

      res.status(200).json({
        status: 'success',
        message: 'Token refreshed successfully',
        data: { token },
      });
    } catch (error) {
      logger.error('Refresh token error', { error });
      next(error);
    }
  };

  /**
   * Get profile for the authenticated user.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const user = await this.authService.getUserProfile(req.user.id);

      logger.info('Profile retrieved', { userId: req.user.id });

      res.status(200).json({
        status: 'success',
        message: 'Profile retrieved successfully',
        data: { user },
      });
    } catch (error) {
      logger.error('Get profile error', { error });
      next(error);
    }
  };
}