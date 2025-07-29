import { UserRepository } from "../../repositories/UserRepository"
import type { CreateUserData } from "../../models/User"
import { NotFoundError } from "../../utils/AppError"
import { db } from "../../config/database"
import { jest } from "@jest/globals"

jest.mock("../../config/database")

describe("UserRepository", () => {
  let userRepository: UserRepository
  let mockDb: any

  const mockUser = {
    id: 1,
    email: "test@example.com",
    phone: "08123456789",
    first_name: "John",
    last_name: "Doe",
    bvn: "12345678901",
    password_hash: "hashed-password",
    created_at: new Date(),
    updated_at: new Date(),
  }

  const mockUserData: CreateUserData & { passwordHash: string } = {
    email: "test@example.com",
    phone: "08123456789",
    firstName: "John",
    lastName: "Doe",
    bvn: "12345678901",
    password: "Password123!",
    passwordHash: "hashed-password",
  }

  beforeEach(() => {
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      update: jest.fn(),
      del: jest.fn(),
      select: jest.fn().mockReturnThis(),
    }
    ;(db as any).mockImplementation(() => mockDb)
    userRepository = new UserRepository()
  })

  describe("create", () => {
    it("should create user successfully", async () => {
      mockDb.insert.mockResolvedValue([1])
      mockDb.first.mockResolvedValue(mockUser)

      const result = await userRepository.create(mockUserData)

      expect(mockDb.insert).toHaveBeenCalledWith({
        email: mockUserData.email,
        phone: mockUserData.phone,
        first_name: mockUserData.firstName,
        last_name: mockUserData.lastName,
        bvn: mockUserData.bvn,
        password_hash: mockUserData.passwordHash,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      })
      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
        }),
      )
    })

    it("should throw error if user creation fails", async () => {
      mockDb.insert.mockResolvedValue([1])
      mockDb.first.mockResolvedValue(null)

      await expect(userRepository.create(mockUserData)).rejects.toThrow("Failed to create user")
    })
  })

  describe("findById", () => {
    it("should find user by id successfully", async () => {
      mockDb.first.mockResolvedValue(mockUser)

      const result = await userRepository.findById(1)

      expect(mockDb.where).toHaveBeenCalledWith({ id: 1 })
      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
        }),
      )
    })

    it("should return null if user not found", async () => {
      mockDb.first.mockResolvedValue(null)

      const result = await userRepository.findById(999)

      expect(result).toBeNull()
    })
  })

  describe("findByEmail", () => {
    it("should find user by email successfully", async () => {
      mockDb.first.mockResolvedValue(mockUser)

      const result = await userRepository.findByEmail("test@example.com")

      expect(mockDb.where).toHaveBeenCalledWith({ email: "test@example.com" })
      expect(result).toEqual(
        expect.objectContaining({
          email: "test@example.com",
        }),
      )
    })

    it("should return null if user not found", async () => {
      mockDb.first.mockResolvedValue(null)

      const result = await userRepository.findByEmail("nonexistent@example.com")

      expect(result).toBeNull()
    })
  })

  describe("findByPhone", () => {
    it("should find user by phone successfully", async () => {
      mockDb.first.mockResolvedValue(mockUser)

      const result = await userRepository.findByPhone("08123456789")

      expect(mockDb.where).toHaveBeenCalledWith({ phone: "08123456789" })
      expect(result).toEqual(
        expect.objectContaining({
          phone: "08123456789",
        }),
      )
    })
  })

  describe("findByBvn", () => {
    it("should find user by BVN successfully", async () => {
      mockDb.first.mockResolvedValue(mockUser)

      const result = await userRepository.findByBvn("12345678901")

      expect(mockDb.where).toHaveBeenCalledWith({ bvn: "12345678901" })
      expect(result).toEqual(
        expect.objectContaining({
          bvn: "12345678901",
        }),
      )
    })
  })

  describe("update", () => {
    it("should update user successfully", async () => {
      const updateData = { firstName: "Jane" }
      mockDb.update.mockResolvedValue(1)
      mockDb.first.mockResolvedValue({ ...mockUser, first_name: "Jane" })

      const result = await userRepository.update(1, updateData)

      expect(mockDb.update).toHaveBeenCalledWith({
        ...updateData,
        updated_at: expect.any(Date),
      })
      expect(result.firstName).toBe("Jane")
    })

    it("should throw NotFoundError if user not found", async () => {
      mockDb.update.mockResolvedValue(1)
      mockDb.first.mockResolvedValue(null)

      await expect(userRepository.update(999, { firstName: "Jane" })).rejects.toThrow(NotFoundError)
    })
  })

  describe("delete", () => {
    it("should delete user successfully", async () => {
      mockDb.del.mockResolvedValue(1)

      const result = await userRepository.delete(1)

      expect(mockDb.where).toHaveBeenCalledWith({ id: 1 })
      expect(result).toBe(true)
    })

    it("should return false if user not found", async () => {
      mockDb.del.mockResolvedValue(0)

      const result = await userRepository.delete(999)

      expect(result).toBe(false)
    })
  })

  describe("existsByEmail", () => {
    it("should return true if email exists", async () => {
      mockDb.first.mockResolvedValue({ id: 1 })

      const result = await userRepository.existsByEmail("test@example.com")

      expect(result).toBe(true)
    })

    it("should return false if email does not exist", async () => {
      mockDb.first.mockResolvedValue(null)

      const result = await userRepository.existsByEmail("nonexistent@example.com")

      expect(result).toBe(false)
    })
  })

  describe("existsByPhone", () => {
    it("should return true if phone exists", async () => {
      mockDb.first.mockResolvedValue({ id: 1 })

      const result = await userRepository.existsByPhone("08123456789")

      expect(result).toBe(true)
    })
  })

  describe("existsByBvn", () => {
    it("should return true if BVN exists", async () => {
      mockDb.first.mockResolvedValue({ id: 1 })

      const result = await userRepository.existsByBvn("12345678901")

      expect(result).toBe(true)
    })
  })
})
