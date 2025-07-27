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

export interface CreateUserData {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  bvn: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

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