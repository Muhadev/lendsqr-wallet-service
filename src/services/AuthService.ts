// src/services/AuthService.ts - Updated register method with debug logging
import { UserRepository } from '../repositories/UserRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { AdjutorService } from './AdjutorService';
import { CreateUserData, LoginCredentials, UserResponse } from '../models/User';
import { AccountStatus } from '../models/Account';
import { 
  hashPassword, 
  comparePassword, 
  generateToken,
  generateAccountNumber,
  sanitizeUser 
} from '../utils/helpers';
import { 
  AppError, 
  ValidationError, 
  AuthenticationError,
  ConflictError,
  BlacklistError 
} from '../utils/AppError';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import type { Knex } from 'knex';

export interface AuthResponse {
  user: UserResponse;
  token: string;
  account: {
    accountNumber: string;
    balance: number;
    status: AccountStatus;
  };
}

export class AuthService {
  private userRepository: UserRepository;
  private accountRepository: AccountRepository;
  private adjutorService: AdjutorService;

  constructor() {
    this.userRepository = new UserRepository();
    this.accountRepository = new AccountRepository();
    // Skip AdjutorService for now during debugging
    try {
      this.adjutorService = new AdjutorService();
    } catch (error) {
      console.log('AdjutorService initialization failed, will skip blacklist check');
      this.adjutorService = null as any;
    }
  }

  async register(userData: CreateUserData): Promise<AuthResponse> {
    try {
      console.log('1. Starting registration process...');
      
      // Validate input data
      console.log('2. Validating registration data...');
      await this.validateRegistrationData(userData);
      console.log('   ✓ Validation passed');

      // Real blacklist check
      console.log('3. Checking for blacklist...');
      if (this.adjutorService) {
        const isVerified = await this.adjutorService.verifyUser({
          email: userData.email,
          phone: userData.phone,
          bvn: userData.bvn,
        });
        if (!isVerified) {
          throw new BlacklistError('User is blacklisted and cannot be onboarded');
        }
        console.log('   ✓ Blacklist check passed');
      }

      // Check for existing users
      console.log('4. Checking for existing users...');
      await this.checkExistingUser(userData);
      console.log('   ✓ No existing user found');

      // Use database transaction for user and account creation
      console.log('5. Creating user and account in database transaction...');
      const result = await db.transaction(async (trx: Knex.Transaction) => {
        console.log('   5a. Hashing password...');
        const passwordHash = await hashPassword(userData.password);

        console.log('   5b. Creating user...');
        const user = await this.createUserInTransaction(userData, passwordHash, trx);
        console.log('   ✓ User created with ID:', user.id);

        console.log('   5c. Generating account number...');
        const accountNumber = await this.generateUniqueAccountNumber();
        console.log('   ✓ Account number generated:', accountNumber);

        console.log('   5d. Creating account...');
        const account = await this.createAccountInTransaction({
          userId: user.id,
          accountNumber,
          balance: 0,
          status: AccountStatus.ACTIVE,
        }, trx);
        console.log('   ✓ Account created with ID:', account.id);

        return { user, account };
      });

      // Generate JWT token
      console.log('6. Generating JWT token...');
      const token = generateToken({
        userId: result.user.id,
        email: result.user.email,
      });
      console.log('   ✓ Token generated');

      console.log('7. Registration completed successfully!');

      return {
        user: sanitizeUser(result.user),
        token,
        account: {
          accountNumber: result.account.accountNumber,
          balance: result.account.balance,
          status: result.account.status,
        },
      };
    } catch (error: any) {
      console.error('Registration failed at step:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  // Helper method to create user within transaction
  private async createUserInTransaction(userData: CreateUserData, passwordHash: string, trx: Knex.Transaction) {
    const [id] = await trx('users').insert({
      email: userData.email,
      phone: userData.phone,
      first_name: userData.firstName,
      last_name: userData.lastName,
      bvn: userData.bvn,
      password_hash: passwordHash,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const user = await trx('users').where({ id }).first();
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      bvn: user.bvn,
      passwordHash: user.password_hash,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  // Helper method to create account within transaction
  private async createAccountInTransaction(accountData: any, trx: Knex.Transaction) {
    const [id] = await trx('accounts').insert({
      user_id: accountData.userId,
      account_number: accountData.accountNumber,
      balance: accountData.balance || 0,
      status: accountData.status || AccountStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const account = await trx('accounts').where({ id }).first();
    return {
      id: account.id,
      userId: account.user_id,
      accountNumber: account.account_number,
      balance: parseFloat(account.balance),
      status: account.status,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    };
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Get user's account
    const account = await this.accountRepository.findByUserId(user.id);
    if (!account) {
      throw new AppError('Account not found', 500);
    }

    // Check if account is active
    if (account.status !== AccountStatus.ACTIVE) {
      throw new AuthenticationError('Account is not active');
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    return {
      user: sanitizeUser(user),
      token,
      account: {
        accountNumber: account.accountNumber,
        balance: account.balance,
        status: account.status,
      },
    };
  }

  private async validateRegistrationData(userData: CreateUserData): Promise<void> {
    // Basic validation
    if (!userData.email || !userData.phone || !userData.firstName || 
        !userData.lastName || !userData.bvn || !userData.password) {
      throw new ValidationError('All fields are required');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new ValidationError('Invalid email format');
    }

    // Phone number validation (Nigerian format)
    const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(userData.phone)) {
      throw new ValidationError('Invalid phone number format');
    }

    // BVN validation (11 digits)
    const bvnRegex = /^\d{11}$/;
    if (!bvnRegex.test(userData.bvn)) {
      throw new ValidationError('BVN must be exactly 11 digits');
    }

    // Password strength validation
    if (userData.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(userData.password)) {
      throw new ValidationError(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      );
    }
  }

  private async checkExistingUser(userData: CreateUserData): Promise<void> {
    // Check for existing email
    const existingUserByEmail = await this.userRepository.findByEmail(userData.email);
    if (existingUserByEmail) {
      throw new ConflictError('Email address is already registered');
    }

    // Check for existing phone
    const existingUserByPhone = await this.userRepository.findByPhone(userData.phone);
    if (existingUserByPhone) {
      throw new ConflictError('Phone number is already registered');
    }

    // Check for existing BVN
    const existingUserByBvn = await this.userRepository.findByBvn(userData.bvn);
    if (existingUserByBvn) {
      throw new ConflictError('BVN is already registered');
    }
  }

  private async generateUniqueAccountNumber(): Promise<string> {
    let accountNumber: string;
    let exists: boolean;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      accountNumber = generateAccountNumber();
      // Check directly in database within transaction
      const result = await db('accounts').where({ account_number: accountNumber }).first();
      exists = !!result;
      attempts++;
    } while (exists && attempts < maxAttempts);

    if (exists) {
      throw new AppError('Unable to generate unique account number', 500);
    }

    return accountNumber;
  }

  async refreshToken(userId: number): Promise<string> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    return generateToken({
      userId: user.id,
      email: user.email,
    });
  }

  async getUserProfile(userId: number): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    return sanitizeUser(user);
  }
}