import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { CreateUserData, LoginCredentials } from '../models/User';
import { registerSchema, loginSchema } from '../utils/validators';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request data
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const userData: CreateUserData = value;

      // Register user
      const result = await this.authService.register(userData);

      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request data
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const credentials: LoginCredentials = value;

      // Login user
      const result = await this.authService.login(credentials);

      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const token = await this.authService.refreshToken(req.user.id);

      res.status(200).json({
        status: 'success',
        message: 'Token refreshed successfully',
        data: { token },
      });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const user = await this.authService.getUserProfile(req.user.id);

      res.status(200).json({
        status: 'success',
        message: 'Profile retrieved successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };
}