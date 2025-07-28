import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload: object): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
};

export const generateAccountNumber = (): string => {
  // Generate a 10-digit account number
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return timestamp + random;
};

export const generateTransactionReference = (): string => {
  const prefix = process.env.TRANSACTION_REF_PREFIX || 'TXN';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
};

export const generateUUID = (): string => {
  return uuidv4();
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidNigerianPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
  return phoneRegex.test(phone);
};

export const isValidBVN = (bvn: string): boolean => {
  const bvnRegex = /^\d{11}$/;
  return bvnRegex.test(bvn);
};

export const maskSensitiveData = (data: string): string => {
  if (data.length <= 4) {
    return '*'.repeat(data.length);
  }
  const start = data.slice(0, 2);
  const end = data.slice(-2);
  const middle = '*'.repeat(data.length - 4);
  return start + middle + end;
};

export const validateEmail = (email: string): boolean => {
  return isValidEmail(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  return isValidNigerianPhone(phone);
};

export const sanitizeUser = (user: any) => {
  const { passwordHash, ...sanitizedUser } = user;
  return sanitizedUser;
};

export const getPaginationMetadata = (
  totalCount: number,
  page: number,
  limit: number
) => {
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    nextPage: hasNextPage ? page + 1 : null,
    previousPage: hasPreviousPage ? page - 1 : null,
  };
};