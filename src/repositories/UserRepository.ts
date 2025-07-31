import { db } from '../config/database';
import { User, CreateUserData } from '../models/User';
import { NotFoundError } from '../utils/AppError';

/**
 * Repository for managing user data in the database.
 */
export class UserRepository {
  private tableName = 'users';

  /**
   * Create a new user.
   * @param userData Data for the new user (including password hash)
   * @returns The created User
   */
  async create(userData: CreateUserData & { passwordHash: string }): Promise<User> {
    const [id] = await db(this.tableName).insert({
      email: userData.email,
      phone: userData.phone,
      first_name: userData.firstName,
      last_name: userData.lastName,
      bvn: userData.bvn,
      password_hash: userData.passwordHash,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const user = await this.findById(id);
    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  /**
   * Find a user by ID.
   * @param id User ID
   * @returns The User or null if not found
   */
  async findById(id: number): Promise<User | null> {
    const result = await db(this.tableName)
      .where({ id })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  /**
   * Find a user by email.
   * @param email User email
   * @returns The User or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await db(this.tableName)
      .where({ email })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  /**
   * Find a user by phone number.
   * @param phone User phone number
   * @returns The User or null if not found
   */
  async findByPhone(phone: string): Promise<User | null> {
    const result = await db(this.tableName)
      .where({ phone })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  /**
   * Find a user by BVN.
   * @param bvn User BVN
   * @returns The User or null if not found
   */
  async findByBvn(bvn: string): Promise<User | null> {
    const result = await db(this.tableName)
      .where({ bvn })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  /**
   * Update a user's data.
   * @param id User ID
   * @param updateData Partial user data to update
   * @returns The updated User
   */
  async update(id: number, updateData: Partial<User>): Promise<User> {
    await db(this.tableName)
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      });

    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Delete a user by ID.
   * @param id User ID
   * @returns True if deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    const deletedCount = await db(this.tableName)
      .where({ id })
      .del();

    return deletedCount > 0;
  }

  /**
   * Check if a user exists by email.
   * @param email User email
   * @returns True if exists, false otherwise
   */
  async existsByEmail(email: string): Promise<boolean> {
    const result = await db(this.tableName)
      .where({ email })
      .select('id')
      .first();

    return !!result;
  }

  /**
   * Check if a user exists by phone number.
   * @param phone User phone number
   * @returns True if exists, false otherwise
   */
  async existsByPhone(phone: string): Promise<boolean> {
    const result = await db(this.tableName)
      .where({ phone })
      .select('id')
      .first();

    return !!result;
  }

  /**
   * Check if a user exists by BVN.
   * @param bvn User BVN
   * @returns True if exists, false otherwise
   */
  async existsByBvn(bvn: string): Promise<boolean> {
    const result = await db(this.tableName)
      .where({ bvn })
      .select('id')
      .first();

    return !!result;
  }

  /**
   * Map a database row to the User model.
   * @param dbResult Database row
   * @returns User model
   */
  private mapDbToModel(dbResult: any): User {
    return {
      id: dbResult.id,
      email: dbResult.email,
      phone: dbResult.phone,
      firstName: dbResult.first_name,
      lastName: dbResult.last_name,
      bvn: dbResult.bvn,
      passwordHash: dbResult.password_hash,
      createdAt: dbResult.created_at,
      updatedAt: dbResult.updated_at,
    };
  }
}