import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

export interface KarmaIdentity {
  identity_number: string;
  identity_type: 'BVN' | 'NIN' | 'PHONE_NUMBER' | 'EMAIL';
}

export interface KarmaCheckResponse {
  status: boolean;
  message: string;
  data?: {
    karma_identity: string;
    amount_in_contention: number;
    reason: string;
    default_date: string;
    lender: string;
  };
}

export class AdjutorService {
  private client: AxiosInstance;
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = process.env.ADJUTOR_API_URL || 'https://adjutor.lendsqr.com/v2';
    this.apiKey = process.env.ADJUTOR_API_KEY || '';

    if (!this.apiKey) {
      logger.error('Adjutor API key not configured');
      throw new AppError('Adjutor API configuration missing', 500);
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info(`Adjutor API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Adjutor API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info(`Adjutor API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('Adjutor API Response Error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if a user is blacklisted in Karma
   */
  async checkKarmaBlacklist(identity: KarmaIdentity): Promise<KarmaCheckResponse> {
    try {
      const response = await this.client.post('/verification/karma', identity);
      
      logger.info('Karma blacklist check completed', {
        identity_type: identity.identity_type,
        identity_number: identity.identity_number.slice(-4), // Log only last 4 digits for privacy
        is_blacklisted: response.data.status,
      });

      return {
        status: response.data.status || false,
        message: response.data.message || 'Check completed',
        data: response.data.data,
      };
    } catch (error: any) {
      logger.error('Karma blacklist check failed:', {
        identity_type: identity.identity_type,
        error: error.response?.data?.message || error.message,
      });

      // If API is down, we'll allow user registration but log the issue
      if (error.code === 'ECONNREFUSED' || error.response?.status === 503) {
        logger.warn('Adjutor API unavailable, allowing registration');
        return {
          status: false,
          message: 'Blacklist check temporarily unavailable',
        };
      }

      // For other errors, we'll be more restrictive
      if (error.response?.status === 401) {
        throw new AppError('Invalid API credentials', 500);
      }

      if (error.response?.status === 429) {
        throw new AppError('Too many requests to verification service', 429);
      }

      // Default to allowing registration if we can't verify
      return {
        status: false,
        message: 'Blacklist verification completed',
      };
    }
  }

  /**
   * Check multiple identities against Karma blacklist
   */
  async checkMultipleIdentities(identities: KarmaIdentity[]): Promise<KarmaCheckResponse[]> {
    const results = await Promise.allSettled(
      identities.map(identity => this.checkKarmaBlacklist(identity))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.error(`Karma check failed for identity ${index}:`, result.reason);
        return {
          status: false,
          message: 'Verification failed',
        };
      }
    });
  }

  /**
   * Comprehensive user verification
   */
  async verifyUser(userData: {
    email: string;
    phone: string;
    bvn: string;
  }): Promise<boolean> {
    const identities: KarmaIdentity[] = [
      { identity_number: userData.bvn, identity_type: 'BVN' },
      { identity_number: userData.phone, identity_type: 'PHONE_NUMBER' },
      { identity_number: userData.email, identity_type: 'EMAIL' },
    ];

    try {
      const results = await this.checkMultipleIdentities(identities);
      
      // If any identity is blacklisted, reject the user
      const isBlacklisted = results.some(result => result.status === true);
      
      if (isBlacklisted) {
        const blacklistedIdentities = results
          .filter(result => result.status === true)
          .map((result, index) => identities[index].identity_type);
        
        logger.warn('User failed blacklist verification', {
          email: userData.email,
          blacklisted_identities: blacklistedIdentities,
        });
        
        return false;
      }

      logger.info('User passed blacklist verification', {
        email: userData.email,
      });

      return true;
    } catch (error) {
      logger.error('User verification process failed:', error);
      // In case of service failure, we'll allow registration but log the issue
      return true;
    }
  }
}