// src/utils/helpers.ts - Fixed version with better reference generation
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { v4 as uuidv4 } from "uuid"
import crypto from "crypto"

/**
 * Hash a password using bcrypt
 * @param password - Plain text password to hash
 * @returns Promise<string> - Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || "12")
  return bcrypt.hash(password, saltRounds)
}

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password
 * @param hashedPassword - Hashed password to compare against
 * @returns Promise<boolean> - True if passwords match
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Generate a JWT token
 * @param payload - Token payload object
 * @returns string - JWT token
 * @throws Error if JWT_SECRET is not configured
 */
export const generateToken = (payload: object): string => {
  const jwtSecret = process.env.JWT_SECRET
  const expiresIn = process.env.JWT_EXPIRES_IN || "24h"

  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is required")
  }

  return jwt.sign(payload, jwtSecret, { expiresIn: '24h' })
}

/**
 * Generate a unique 10-digit account number
 * @returns string - 10-digit account number
 */
export const generateAccountNumber = (): string => {
  const timestamp = Date.now().toString().slice(-6)
  const random = crypto.randomInt(1000, 9999).toString()
  return timestamp + random
}

/**
 * Generate a unique transaction reference
 * @returns string - Unique transaction reference
 */
export const generateTransactionReference = (): string => {
  const prefix = process.env.TRANSACTION_REF_PREFIX || "TXN"
  const uuid = crypto.randomUUID().replace(/-/g, "").toUpperCase()
  return `${prefix}${uuid}`
}

/**
 * Format amount as Nigerian Naira currency
 * @param amount - Amount to format
 * @returns string - Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount)
}

/**
 * Generate a UUID v4
 * @returns string - UUID v4
 */
export const generateUUID = (): string => {
  return uuidv4()
}

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns boolean - True if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate Nigerian phone number format
 * @param phone - Phone number to validate
 * @returns boolean - True if phone number is valid
 */
export const isValidNigerianPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+234|0)[789][01]\d{8}$/
  return phoneRegex.test(phone)
}

/**
 * Validate BVN format (11 digits)
 * @param bvn - BVN to validate
 * @returns boolean - True if BVN is valid
 */
export const isValidBVN = (bvn: string): boolean => {
  const bvnRegex = /^\d{11}$/
  return bvnRegex.test(bvn)
}

/**
 * Mask sensitive data for logging
 * @param data - Data to mask
 * @returns string - Masked data
 */
export const maskSensitiveData = (data: string): string => {
  if (data.length <= 4) {
    return "*".repeat(data.length)
  }
  const start = data.slice(0, 2)
  const end = data.slice(-2)
  const middle = "*".repeat(data.length - 4)
  return start + middle + end
}

/**
 * Validate email format (alias for isValidEmail)
 * @param email - Email to validate
 * @returns boolean - True if email is valid
 */
export const validateEmail = (email: string): boolean => {
  return isValidEmail(email)
}

/**
 * Validate phone number format (alias for isValidNigerianPhone)
 * @param phone - Phone number to validate
 * @returns boolean - True if phone number is valid
 */
export const validatePhoneNumber = (phone: string): boolean => {
  return isValidNigerianPhone(phone)
}

/**
 * Remove sensitive fields from user object
 * @param user - User object to sanitize
 * @returns object - Sanitized user object without passwordHash
 */
export const sanitizeUser = (user: any) => {
  const { passwordHash, ...sanitizedUser } = user
  return sanitizedUser
}

/**
 * Generate pagination metadata
 * @param totalCount - Total number of items
 * @param page - Current page number
 * @param limit - Items per page
 * @returns object - Pagination metadata
 */
export const getPaginationMetadata = (totalCount: number, page: number, limit: number) => {
  const totalPages = Math.ceil(totalCount / limit)
  const hasNextPage = page < totalPages
  const hasPreviousPage = page > 1

  return {
    currentPage: page,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    nextPage: hasNextPage ? page + 1 : null,
    previousPage: hasPreviousPage ? page - 1 : null,
  }
}
