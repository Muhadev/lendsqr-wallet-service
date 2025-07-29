
// Define mocks before imports and jest.mock so they are in scope for the mock factory
const mockRegister = jest.fn();
const mockLogin = jest.fn();
const mockRefreshToken = jest.fn();
const mockGetProfile = jest.fn();

jest.mock('../../controllers/AuthController', () => {
  return {
    AuthController: jest.fn().mockImplementation(() => ({
      register: mockRegister,
      login: mockLogin,
      refreshToken: mockRefreshToken,
      getProfile: mockGetProfile,
    })),
  };
});
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req: any, res: any, next: any) => next()),
}));

import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from '../../routes/authRoutes';
import { AuthController } from '../../controllers/AuthController';
import { authenticate } from '../../middleware/auth';

describe('authRoutes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    jest.clearAllMocks();
  });

  it('POST /auth/register should call AuthController.register', async () => {
    mockRegister.mockImplementation((req, res) => res.status(201).json({ status: 'success' }));
    const res = await request(app).post('/auth/register').send({});
    expect(mockRegister).toHaveBeenCalled();
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
  });

  it('POST /auth/login should call AuthController.login', async () => {
    mockLogin.mockImplementation((req, res) => res.status(200).json({ status: 'success' }));
    const res = await request(app).post('/auth/login').send({});
    expect(mockLogin).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('POST /auth/refresh-token should call authenticate and AuthController.refreshToken', async () => {
    mockRefreshToken.mockImplementation((req, res) => res.status(200).json({ status: 'success' }));
    const res = await request(app).post('/auth/refresh-token').send({});
    expect(authenticate).toHaveBeenCalled();
    expect(mockRefreshToken).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('GET /auth/profile should call authenticate and AuthController.getProfile', async () => {
    mockGetProfile.mockImplementation((req, res) => res.status(200).json({ status: 'success' }));
    const res = await request(app).get('/auth/profile');
    expect(authenticate).toHaveBeenCalled();
    expect(mockGetProfile).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
