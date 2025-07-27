import request from 'supertest';
import app from '../app';
import { db } from '../config/database';

describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    // Run migrations
    await db.migrate.latest();
  });

  afterAll(async () => {
    // Clean up database
    await db.migrate.rollback();
    await db.destroy();
  });

  beforeEach(async () => {
    // Clean up tables before each test
    await db('transactions').del();
    await db('accounts').del();
    await db('users').del();
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      phone: '08123456789',
      firstName: 'Test',
      lastName: 'User',
      bvn: '12345678901',
      password: 'Password123!',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.account.accountNumber).toBeDefined();
    });

    it('should return validation error for invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('valid email');
    });

    it('should return validation error for weak password', async () => {
      const invalidData = { ...validUserData, password: '123' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Password must');
    });

    it('should return validation error for invalid phone number', async () => {
      const invalidData = { ...validUserData, phone: '123456' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('phone number');
    });

    it('should return validation error for invalid BVN', async () => {
      const invalidData = { ...validUserData, bvn: '123' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('BVN must be exactly 11 digits');
    });

    it('should return conflict error for duplicate email', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same email
      const duplicateData = { ...validUserData, phone: '08198765432', bvn: '10987654321' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Email address is already registered');
    });

    it('should return conflict error for duplicate phone', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same phone
      const duplicateData = { ...validUserData, email: 'another@example.com', bvn: '10987654321' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Phone number is already registered');
    });

    it('should return conflict error for duplicate BVN', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same BVN
      const duplicateData = { ...validUserData, email: 'another@example.com', phone: '08198765432' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('BVN is already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      email: 'test@example.com',
      phone: '08123456789',
      firstName: 'Test',
      lastName: 'User',
      bvn: '12345678901',
      password: 'Password123!',
    };

    beforeEach(async () => {
      // Register a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.account).toBeDefined();
    });

    it('should return error for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userData.password,
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should return error for invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should return validation error for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: userData.password,
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Email is required');
    });

    it('should return validation error for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Password is required');
    });
  });

  describe('GET /api/auth/profile', () => {
    let token: string;
    const userData = {
      email: 'test@example.com',
      phone: '08123456789',
      firstName: 'Test',
      lastName: 'User',
      bvn: '12345678901',
      password: 'Password123!',
    };

    beforeEach(async () => {
      // Register and login to get token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      token = registerResponse.body.data.token;
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
    });

    it('should return error for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Access token required');
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid token');
    });
  });
});