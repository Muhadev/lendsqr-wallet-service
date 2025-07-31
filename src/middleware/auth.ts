import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { AppError } from '../utils/AppError';

/**
 * Extended Express Request interface to include authenticated user info.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Express middleware to authenticate requests using JWT.
 * - Checks for Bearer token in Authorization header.
 * - Verifies token and attaches user info to the request object.
 * - Throws AppError if authentication fails.
 *
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token required', 401);
    }

    const token = authHeader.substring(7);

    if (!token) {
      throw new AppError('Access token required', 401);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError('JWT secret not configured', 500);
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    const userRepository = new UserRepository();
    const user = await userRepository.findById(decoded.userId);

    if (!user) {
      throw new AppError('User not found', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        typeof (error as any).name === "string" &&
        (error as any).name.startsWith("TokenExpiredError"))
    ) {
      next(new AppError("Invalid token", 401));
    } else {
      next(error);
    }
  }
};