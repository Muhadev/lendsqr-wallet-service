import { UserRepository } from "../repositories/UserRepository"
import { AccountRepository } from "../repositories/AccountRepository"
import { AdjutorService } from "./AdjutorService"
import type { CreateUserData, LoginCredentials, UserResponse } from "../models/User"
import { AccountStatus } from "../models/Account"
import { hashPassword, comparePassword, generateToken, generateAccountNumber, sanitizeUser } from "../utils/helpers"
import { AppError, ValidationError, AuthenticationError, ConflictError, BlacklistError } from "../utils/AppError"
import { logger } from "../utils/logger"
import { db } from "../config/database"
import type { Knex } from "knex"

export interface AuthResponse {
  user: UserResponse
  token: string
  account: {
    accountNumber: string
    balance: number
    status: AccountStatus
  }
}

/**
 * Authentication service handling user registration, login, and profile management
 */
export class AuthService {
  private userRepository: UserRepository
  private accountRepository: AccountRepository
  private adjutorService: AdjutorService

  constructor() {
    this.userRepository = new UserRepository()
    this.accountRepository = new AccountRepository()

    try {
      this.adjutorService = new AdjutorService()
    } catch (error: any) {
      logger.error("AdjutorService initialization failed", { error: error.message })
      throw new AppError("Failed to initialize blacklist verification service", 500)
    }
  }

  /**
   * Register a new user with account creation
   * @param userData - User registration data
   * @returns Promise<AuthResponse>
   */
  // Add this method to your AuthService class
  async register(userData: CreateUserData): Promise<AuthResponse> {
    try {
      logger.info("Starting user registration process", { email: userData.email })

      // Validate input data
      await this.validateRegistrationData(userData)
      logger.debug("Registration data validation passed", { email: userData.email })

      // Blacklist verification with bypass option
      try {
        const isVerified = await this.adjutorService.verifyUser({
          email: userData.email,
          phone: userData.phone,
          bvn: userData.bvn,
        })

        if (!isVerified) {
          logger.warn("User failed blacklist verification", { email: userData.email })
          throw new BlacklistError("User is blacklisted and cannot be onboarded")
        }
        
        logger.debug("Blacklist verification passed", { email: userData.email })
      } catch (error: any) {
        logger.error("Blacklist verification failed", {
          email: userData.email,
          error: error.message
        })
          throw error // No fallback, always deny registration
        }
      // Continue with the rest of your registration logic...
      await this.checkExistingUser(userData)
      logger.debug("Existing user check passed", { email: userData.email })

      // Use database transaction for user and account creation
      const result = await db.transaction(async (trx: Knex.Transaction) => {
        const passwordHash = await hashPassword(userData.password)
        logger.debug("Password hashed successfully", { email: userData.email })

        const user = await this.createUserInTransaction(userData, passwordHash, trx)
        logger.debug("User created in transaction", { userId: user.id, email: userData.email })

        const accountNumber = await this.generateUniqueAccountNumber()
        logger.debug("Unique account number generated", {
          userId: user.id,
          accountNumber: accountNumber.slice(-4), // Log only last 4 digits
        })

        const account = await this.createAccountInTransaction(
          {
            userId: user.id,
            accountNumber,
            balance: 0,
            status: AccountStatus.ACTIVE,
          },
          trx,
        )

        logger.debug("Account created in transaction", {
          userId: user.id,
          accountId: account.id,
        })

        return { user, account }
      })

      // Generate JWT token
      const token = generateToken({
        userId: result.user.id,
        email: result.user.email,
      })

      logger.info("User registration completed successfully", {
        userId: result.user.id,
        email: result.user.email,
        accountNumber: result.account.accountNumber.slice(-4),
      })

      return {
        user: sanitizeUser(result.user),
        token,
        account: {
          accountNumber: result.account.accountNumber,
          balance: result.account.balance,
          status: result.account.status,
        },
      }
    } catch (error: any) {
      logger.error("User registration failed", {
        error: error.message,
        email: userData.email,
        stack: error.stack,
      })
      throw error
    }
  }

  /**
   * Create user within database transaction
   * @private
   */
  private async createUserInTransaction(userData: CreateUserData, passwordHash: string, trx: Knex.Transaction) {
    const [id] = await trx("users").insert({
      email: userData.email,
      phone: userData.phone,
      first_name: userData.firstName,
      last_name: userData.lastName,
      bvn: userData.bvn,
      password_hash: passwordHash,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const user = await trx("users").where({ id }).first()
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
    }
  }

  /**
   * Create account within database transaction
   * @private
   */
  private async createAccountInTransaction(accountData: any, trx: Knex.Transaction) {
    const [id] = await trx("accounts").insert({
      user_id: accountData.userId,
      account_number: accountData.accountNumber,
      balance: accountData.balance || 0,
      status: accountData.status || AccountStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const account = await trx("accounts").where({ id }).first()
    return {
      id: account.id,
      userId: account.user_id,
      accountNumber: account.account_number,
      balance: Number.parseFloat(account.balance),
      status: account.status,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    }
  }

  /**
   * Login user
   * @param credentials - User login credentials
   * @returns Promise<AuthResponse>
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials

    // Find user by email
    const user = await this.userRepository.findByEmail(email)
    if (!user) {
      logger.warn("Login attempt with non-existent email", { email })
      throw new AuthenticationError("Invalid email or password")
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash)
    if (!isValidPassword) {
      logger.warn("Login attempt with invalid password", { email, userId: user.id })
      throw new AuthenticationError("Invalid email or password")
    }

    // Get user's account
    const account = await this.accountRepository.findByUserId(user.id)
    if (!account) {
      logger.error("User account not found during login", { userId: user.id, email })
      throw new AppError("Account not found", 500)
    }

    // Check if account is active
    if (account.status !== AccountStatus.ACTIVE) {
      logger.warn("Login attempt with inactive account", {
        userId: user.id,
        email,
        accountStatus: account.status,
      })
      throw new AuthenticationError("Account is not active")
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    })

    logger.info("User logged in successfully", {
      userId: user.id,
      email: user.email,
    })

    return {
      user: sanitizeUser(user),
      token,
      account: {
        accountNumber: account.accountNumber,
        balance: account.balance,
        status: account.status,
      },
    }
  }

  /**
   * Validate registration data
   * @private
   */
  private async validateRegistrationData(userData: CreateUserData): Promise<void> {
    // Basic validation
    if (
      !userData.email ||
      !userData.phone ||
      !userData.firstName ||
      !userData.lastName ||
      !userData.bvn ||
      !userData.password
    ) {
      throw new ValidationError("All fields are required")
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userData.email)) {
      throw new ValidationError("Invalid email format")
    }

    // Phone number validation (Nigerian format)
    const phoneRegex = /^(\+234|0)[789][01]\d{8}$/
    if (!phoneRegex.test(userData.phone)) {
      throw new ValidationError("Invalid phone number format")
    }

    // BVN validation (11 digits)
    const bvnRegex = /^\d{11}$/
    if (!bvnRegex.test(userData.bvn)) {
      throw new ValidationError("BVN must be exactly 11 digits")
    }

    // Password strength validation
    if (userData.password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters long")
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
    if (!passwordRegex.test(userData.password)) {
      throw new ValidationError(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      )
    }
  }

  /**
   * Check for existing user
   * @private
   */
  private async checkExistingUser(userData: CreateUserData): Promise<void> {
    // Check for existing email
    const existingUserByEmail = await this.userRepository.findByEmail(userData.email)
    if (existingUserByEmail) {
      throw new ConflictError("Email address is already registered")
    }

    // Check for existing phone
    const existingUserByPhone = await this.userRepository.findByPhone(userData.phone)
    if (existingUserByPhone) {
      throw new ConflictError("Phone number is already registered")
    }

    // Check for existing BVN
    const existingUserByBvn = await this.userRepository.findByBvn(userData.bvn)
    if (existingUserByBvn) {
      throw new ConflictError("BVN is already registered")
    }
  }

  /**
   * Generate unique account number
   * @private
   */
  private async generateUniqueAccountNumber(): Promise<string> {
    let accountNumber: string
    let exists: boolean
    let attempts = 0
    if (!process.env.ACCOUNT_NUMBER_MAX_ATTEMPTS) {
      throw new AppError("ACCOUNT_NUMBER_MAX_ATTEMPTS environment variable is required", 500)
    }
    const maxAttempts = Number.parseInt(process.env.ACCOUNT_NUMBER_MAX_ATTEMPTS)

    do {
      accountNumber = generateAccountNumber()
      const result = await db("accounts").where({ account_number: accountNumber }).first()
      exists = !!result
      attempts++
    } while (exists && attempts < maxAttempts)

    if (exists) {
      logger.error("Failed to generate unique account number", { attempts })
      throw new AppError("Unable to generate unique account number", 500)
    }

    return accountNumber
  }

  /**
   * Refresh user token
   * @param userId - User ID
   * @returns Promise<string>
   */
  async refreshToken(userId: number): Promise<string> {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      logger.warn("Token refresh attempt for non-existent user", { userId })
      throw new AuthenticationError("User not found")
    }

    logger.info("Token refreshed", { userId })
    return generateToken({
      userId: user.id,
      email: user.email,
    })
  }

  /**
   * Get user profile
   * @param userId - User ID
   * @returns Promise<UserResponse>
   */
  async getUserProfile(userId: number): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      logger.warn("Profile request for non-existent user", { userId })
      throw new AuthenticationError("User not found")
    }

    return sanitizeUser(user)
  }
}
