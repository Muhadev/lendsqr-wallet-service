// src/tests/routes/authRoutes.test.ts
import request from 'supertest';
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import authRoutes from '../../routes/authRoutes';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { AuthController } from '../../controllers/AuthController';

// Mock middleware and controller
jest.mock('../../middleware/auth');
jest.mock('../../controllers/AuthController');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  const mockAuthMiddleware = authenticate as jest.MockedFunction<typeof authenticate>;
  const mockAuthController = AuthController as jest.MockedClass<typeof AuthController>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock controller methods with proper typing
    const mockControllerInstance = {
      register: jest.fn((req: Request, res: Response, next: NextFunction) => 
        res.status(201).json({ status: 'success' })
      ),
      login: jest.fn((req: Request, res: Response, next: NextFunction) => 
        res.json({ status: 'success' })
      ),
      refreshToken: jest.fn((req: Request, res: Response, next: NextFunction) => 
        res.json({ status: 'success' })
      ),
      getProfile: jest.fn((req: Request, res: Response, next: NextFunction) => 
        res.json({ status: 'success' })
      ),
    };

    mockAuthController.mockImplementation(() => mockControllerInstance as any);
  });

  describe('Public routes', () => {
    it('should handle POST /register without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ status: 'success' });
      expect(mockAuthMiddleware).not.toHaveBeenCalled();
    });

    it('should handle POST /login without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
      expect(mockAuthMiddleware).not.toHaveBeenCalled();
    });
  });

  describe('Protected routes', () => {
    beforeEach(() => {
      // Mock authenticate middleware to call next() for protected routes
      mockAuthMiddleware.mockImplementation((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        // Add user to request object
        req.user = { id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User' };
        next();
      });
    });

    it('should require authentication for POST /refresh-token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
      expect(mockAuthMiddleware).toHaveBeenCalled();
    });

    it('should require authentication for GET /profile', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
      expect(mockAuthMiddleware).toHaveBeenCalled();
    });

    it('should handle authentication failure', async () => {
      mockAuthMiddleware.mockImplementation((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
      });

      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ status: 'error', message: 'Unauthorized' });
    });
  });
});
