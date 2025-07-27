import { db } from '../config/database';
import { User, CreateUserData } from '../models/User';
import { NotFoundError } from '../utils/AppError';

export class UserRepository {
  private tableName = 'users';

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

  async findById(id: number): Promise<User | null> {
    const result = await db(this.tableName)
      .where({ id })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db(this.tableName)
      .where({ email })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  async findByPhone(phone: string): Promise<User | null> {
    const result = await db(this.tableName)
      .where({ phone })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

  async findByBvn(bvn: string): Promise<User | null> {
    const result = await db(this.tableName)
      .where({ bvn })
      .first();

    if (!result) {
      return null;
    }

    return this.mapDbToModel(result);
  }

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

  async delete(id: number): Promise<boolean> {
    const deletedCount = await db(this.tableName)
      .where({ id })
      .del();

    return deletedCount > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await db(this.tableName)
      .where({ email })
      .select('id')
      .first();

    return !!result;
  }

  async existsByPhone(phone: string): Promise<boolean> {
    const result = await db(this.tableName)
      .where({ phone })
      .select('id')
      .first();

    return !!result;
  }

  async existsByBvn(bvn: string): Promise<boolean> {
    const result = await db(this.tableName)
      .where({ bvn })
      .select('id')
      .first();

    return !!result;
  }

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