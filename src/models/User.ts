/**
 * Represents a user in the wallet system.
 */
export interface User {
  id: number;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  bvn: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data required to create a new user.
 */
export interface CreateUserData {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  bvn: string;
  password: string;
}

/**
 * Credentials required for user login.
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Response shape for user-related API responses.
 */
export interface UserResponse {
  id: number;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  bvn: string;
  createdAt: Date;
  updatedAt: Date;
}