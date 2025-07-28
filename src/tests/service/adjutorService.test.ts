// src/tests/service/adjutorService.test.ts
import { AdjutorService, KarmaIdentity } from '../../services/AdjutorService';
import axios from 'axios';
import { AppError } from '../../utils/AppError';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AdjutorService', () => {
  let adjutorService: AdjutorService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create
    mockAxiosInstance = {
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Set environment variables
    process.env.ADJUTOR_API_URL = 'https://test-adjutor.com/v2';
    process.env.ADJUTOR_API_KEY = 'test-api-key';
    process.env.API_VERSION = '1.0.0';

    adjutorService = new AdjutorService();
  });

  afterEach(() => {
    delete process.env.ADJUTOR_API_URL;
    delete process.env.ADJUTOR_API_KEY;
    delete process.env.API_VERSION;
  });

  describe('constructor', () => {
    it('should throw error when API key is missing', () => {
      delete process.env.ADJUTOR_API_KEY;
      
      expect(() => new AdjutorService()).toThrow(
        new AppError('Adjutor API configuration missing', 500)
      );
    });

    it('should configure axios client correctly', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://test-adjutor.com/v2',
        timeout: 10000,
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
          'User-Agent': 'Lendsqr-Wallet-Service/1.0.0',
        },
      });
    });
  });

  describe('checkKarmaBlacklist', () => {
    const mockIdentity: KarmaIdentity = {
      identity_number: '12345678901',
      identity_type: 'BVN',
    };

    it('should return blacklisted status when user is blacklisted', async () => {
      const mockResponse = {
        data: {
          status: true,
          message: 'User is blacklisted',
          data: {
            karma_identity: '12345678901',
            amount_in_contention: 50000,
            reason: 'Default on loan',
            default_date: '2023-01-15',
            lender: 'Test Bank',
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await adjutorService.checkKarmaBlacklist(mockIdentity);

      expect(result.status).toBe(true);
      expect(result.message).toBe('User is blacklisted');
      expect(result.data).toBeDefined();
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/verification/karma', mockIdentity);
    });

    it('should return clean status when user is not blacklisted', async () => {
      const mockResponse = {
        data: {
          status: false,
          message: 'User is clean',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await adjutorService.checkKarmaBlacklist(mockIdentity);

      expect(result.status).toBe(false);
      expect(result.message).toBe('User is clean');
      expect(result.data).toBeUndefined();
    });

    it('should handle API unavailable error gracefully', async () => {
      const error: any = new Error('ECONNREFUSED');
      error.code = 'ECONNREFUSED';
      mockAxiosInstance.post.mockRejectedValue(error);

      const result = await adjutorService.checkKarmaBlacklist(mockIdentity);

      expect(result.status).toBe(false);
      expect(result.message).toBe('Blacklist check temporarily unavailable');
    });

    it('should handle 503 service unavailable', async () => {
      const error = {
        response: { status: 503 },
        message: 'Service Unavailable',
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      const result = await adjutorService.checkKarmaBlacklist(mockIdentity);

      expect(result.status).toBe(false);
      expect(result.message).toBe('Blacklist check temporarily unavailable');
    });

    it('should throw AppError for 401 unauthorized', async () => {
      const error = {
        response: { status: 401 },
        message: 'Unauthorized',
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(adjutorService.checkKarmaBlacklist(mockIdentity)).rejects.toThrow(
        new AppError('Invalid API credentials', 500)
      );
    });

    it('should throw AppError for 429 rate limit', async () => {
      const error = {
        response: { status: 429 },
        message: 'Too Many Requests',
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(adjutorService.checkKarmaBlacklist(mockIdentity)).rejects.toThrow(
        new AppError('Too many requests to verification service', 429)
      );
    });

    it('should default to clean status for other errors', async () => {
      const error = {
        response: { status: 500 },
        message: 'Internal Server Error',
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      const result = await adjutorService.checkKarmaBlacklist(mockIdentity);

      expect(result.status).toBe(false);
      expect(result.message).toBe('Blacklist verification completed');
    });
  });

  describe('checkMultipleIdentities', () => {
    const mockIdentities: KarmaIdentity[] = [
      { identity_number: '12345678901', identity_type: 'BVN' },
      { identity_number: '08123456789', identity_type: 'PHONE_NUMBER' },
      { identity_number: 'test@example.com', identity_type: 'EMAIL' },
    ];

    it('should check multiple identities successfully', async () => {
      const mockResponses = [
        { data: { status: false, message: 'Clean' } },
        { data: { status: false, message: 'Clean' } },
        { data: { status: true, message: 'Blacklisted' } },
      ];

      mockAxiosInstance.post
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      const results = await adjutorService.checkMultipleIdentities(mockIdentities);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe(false);
      expect(results[1].status).toBe(false);
      expect(results[2].status).toBe(true);
    });

    it('should handle mixed success and failure responses', async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { status: false, message: 'Clean' } })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { status: true, message: 'Blacklisted' } });

      const results = await adjutorService.checkMultipleIdentities(mockIdentities);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe(false);
      expect(results[1].status).toBe(false);
      expect(results[1].message).toBe('Blacklist verification completed');
      expect(results[2].status).toBe(true);
    });
  });

  describe('verifyUser', () => {
    const mockUserData = {
      email: 'test@example.com',
      phone: '08123456789',
      bvn: '12345678901',
    };

    it('should return true when all identities are clean', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { status: false, message: 'Clean' },
      });

      const result = await adjutorService.verifyUser(mockUserData);

      expect(result).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });

    it('should return false when any identity is blacklisted', async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { status: false, message: 'Clean' } })
        .mockResolvedValueOnce({ data: { status: true, message: 'Blacklisted' } })
        .mockResolvedValueOnce({ data: { status: false, message: 'Clean' } });

      const result = await adjutorService.verifyUser(mockUserData);

      expect(result).toBe(false);
    });

    it('should return true when verification service fails', async () => {
      process.env.ALLOW_REGISTRATION_ON_KARMA_FAILURE = 'true';
      mockAxiosInstance.post.mockRejectedValue(new Error('Service error'));

      const result = await adjutorService.verifyUser(mockUserData);

      expect(result).toBe(true);
    });
  });
});