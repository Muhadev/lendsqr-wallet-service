import { User, CreateUserData, LoginCredentials, UserResponse } from '../../models/User';

describe('User model', () => {
  it('should match the User interface shape', () => {
    const user: User = {
      id: 1,
      email: 'test@example.com',
      phone: '1234567890',
      firstName: 'John',
      lastName: 'Doe',
      bvn: '12345678901',
      passwordHash: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('bvn');
    expect(user).toHaveProperty('passwordHash');
  });

  it('should match the CreateUserData interface shape', () => {
    const data: CreateUserData = {
      email: 'test@example.com',
      phone: '1234567890',
      firstName: 'John',
      lastName: 'Doe',
      bvn: '12345678901',
      password: 'password',
    };
    expect(data).toHaveProperty('password');
  });

  it('should match the LoginCredentials interface shape', () => {
    const creds: LoginCredentials = { email: 'test@example.com', password: 'pass' };
    expect(creds).toHaveProperty('email');
    expect(creds).toHaveProperty('password');
  });

  it('should match the UserResponse interface shape', () => {
    const resp: UserResponse = {
      id: 1,
      email: 'test@example.com',
      phone: '1234567890',
      firstName: 'John',
      lastName: 'Doe',
      bvn: '12345678901',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(resp).toHaveProperty('id');
    expect(resp).toHaveProperty('createdAt');
  });
});
