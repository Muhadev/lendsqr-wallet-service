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
    this.adjutorService = new AdjutorService();
  }

  async register(userData: CreateUserData): Promise<AuthResponse> {
    // Validate input data
    await this.validateRegistrationData(userData);

    // Check if user is blacklisted
    const isVerified = await this.adjutorService.verifyUser({
      email: userData.email,
      phone: userData.phone,
      bvn: userData.bvn,
    });

    if (!isVerified) {
      throw new BlacklistError('User is blacklisted and cannot be onboarded');
    }

    // Check for existing users
    await this.checkExistingUser(userData);

    // Use database transaction for user and account creation
    const result = await db.transaction(async (trx) => {
      // Hash password
      const passwordHash = await hashPassword(userData.password);

      // Create user
      const user = await this.userRepository.create({
        ...userData,
        passwordHash,
      });

      // Generate unique account number
      const accountNumber = await this.generateUniqueAccountNumber();

      // Create account
      const account = await this.accountRepository.create({
        userId: user.id,
        accountNumber,
        balance: 0,
        status: AccountStatus.ACTIVE,
      });

      return { user, account };
    });

    // Generate JWT token
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
    });

    logger.info('User registered successfully', {
      userId: result.user.id,
      email: result.user.email,
      accountNumber: result.account.accountNumber,
    });

    return {
      user: sanitizeUser(result.user),
      token,
      account: {
        accountNumber: result.account.accountNumber,
        balance: result.account.balance,
        status: result.account.status,
      },
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

    do {
      accountNumber = generateAccountNumber();
      exists = await this.accountRepository.existsByAccountNumber(accountNumber);
    } while (exists);

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