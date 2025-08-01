import axios from "axios"
import { AdjutorService, type KarmaIdentity } from "../../services/AdjutorService"
import { AppError } from "../../utils/AppError"
import { jest } from "@jest/globals"

jest.mock("axios")
const mockedAxios = axios as jest.Mocked<typeof axios>

interface CustomError extends Error {
  code?: string
  response?: {
    status: number
    data?: any
  }
}

describe("AdjutorService", () => {
  let adjutorService: AdjutorService
  let mockAxiosInstance: any

  beforeEach(() => {
    process.env.ADJUTOR_API_URL = "https://test-adjutor.com/v2"
    process.env.ADJUTOR_API_KEY = "test-api-key"
    process.env.ADJUTOR_API_TIMEOUT = "5000"
    process.env.KARMA_ENDPOINT = "/test"
    process.env.KARMA_MAX_CONCURRENT_REQUESTS = "3"
    process.env.ALLOW_REGISTRATION_ON_KARMA_FAILURE = "false"
    process.env.API_VERSION = "v1"

    mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    }

    mockedAxios.create.mockReturnValue(mockAxiosInstance)

    adjutorService = new AdjutorService()
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.ADJUTOR_API_URL
    delete process.env.ADJUTOR_API_KEY
    delete process.env.ADJUTOR_API_TIMEOUT
    delete process.env.KARMA_ENDPOINT
    delete process.env.KARMA_MAX_CONCURRENT_REQUESTS
    delete process.env.ALLOW_REGISTRATION_ON_KARMA_FAILURE
  })

  describe("constructor", () => {
    it("should throw AppError if API key is not configured", () => {
      delete process.env.ADJUTOR_API_KEY
      jest.resetModules()
      expect(() => {
        require("../../services/AdjutorService")
      }).toThrow("Missing required environment variable: ADJUTOR_API_KEY")
    })

    it("should create axios instance with correct configuration", () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "https://test-adjutor.com/v2",
        timeout: 5000,
        headers: {
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
          "User-Agent": expect.stringContaining("Lendsqr-Wallet-Service"),
          "Accept": "application/json",
        },
      })
    })
  })

  describe("checkKarmaBlacklist", () => {
    const mockIdentity: KarmaIdentity = {
      identity_number: "12345678901",
      identity_type: "BVN",
    }

    it("should return blacklist status successfully", async () => {
      const mockResponse = {
        data: {
          status: false,
          message: "User is not blacklisted",
          data: null,
        },
      }

      mockAxiosInstance.get.mockResolvedValue(mockResponse)

      const result = await adjutorService.checkKarmaBlacklist(mockIdentity)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/test/12345678901",
        { params: { identity_type: "BVN" } }
      )
      expect(result).toEqual({
        status: false,
        message: "User is not blacklisted",
        data: null,
      })
    })

    it("should return blacklisted status with data", async () => {
      const mockResponse = {
        data: {
          status: true,
          message: "User is blacklisted",
          data: {
            karma_identity: "12345678901",
            amount_in_contention: 50000,
            reason: "Loan default",
            default_date: "2023-01-15",
            lender: "Test Bank",
          },
        },
      }

      mockAxiosInstance.get.mockResolvedValue(mockResponse)

      const result = await adjutorService.checkKarmaBlacklist(mockIdentity)

      expect(result.status).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.amount_in_contention).toBe(50000)
    })

    it("should handle API connection errors gracefully", async () => {
      const error: CustomError = new Error("Connection refused")
      error.code = "ECONNREFUSED"
      mockAxiosInstance.get.mockRejectedValue(error)

      await expect(adjutorService.checkKarmaBlacklist(mockIdentity))
        .rejects.toThrow("Unable to verify blacklist status. Registration denied.")
    })

    it("should handle service unavailable errors", async () => {
      const error: CustomError = new Error("Service unavailable")
      error.response = { status: 503 }
      mockAxiosInstance.get.mockRejectedValue(error)

      await expect(adjutorService.checkKarmaBlacklist(mockIdentity))
        .rejects.toThrow("Unable to verify blacklist status. Registration denied.")
    })

    it("should throw AppError for unauthorized access", async () => {
      const error: CustomError = new Error("Unauthorized")
      error.response = { status: 401 }
      mockAxiosInstance.get.mockRejectedValue(error)

      await expect(adjutorService.checkKarmaBlacklist(mockIdentity)).rejects.toThrow(AppError)
    })

    it("should throw AppError for rate limiting", async () => {
      const error: CustomError = new Error("Too many requests")
      error.response = { status: 429 }
      mockAxiosInstance.get.mockRejectedValue(error)

      await expect(adjutorService.checkKarmaBlacklist(mockIdentity)).rejects.toThrow(AppError)
    })
  })

  describe("checkMultipleIdentities", () => {
    const mockIdentities: KarmaIdentity[] = [
      { identity_number: "12345678901", identity_type: "BVN" },
      { identity_number: "08123456789", identity_type: "PHONE_NUMBER" },
      { identity_number: "test@example.com", identity_type: "EMAIL" },
    ]

    it("should check multiple identities successfully", async () => {
      const mockResponses = [
        { data: { status: false, message: "Not blacklisted" } },
        { data: { status: false, message: "Not blacklisted" } },
        { data: { status: true, message: "Blacklisted" } },
      ]

      mockAxiosInstance.get
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2])

      const results = await adjutorService.checkMultipleIdentities(mockIdentities)

      expect(results).toHaveLength(3)
      expect(results[0].status).toBe(false)
      expect(results[1].status).toBe(false)
      expect(results[2].status).toBe(true)
    })

    it("should handle partial failures gracefully", async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: { status: false, message: "Not blacklisted" } })
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ data: { status: true, message: "Blacklisted" } })

      await expect(adjutorService.checkMultipleIdentities(mockIdentities))
        .rejects.toThrow("Unable to verify blacklist status. Registration denied.")
    })
  })

  describe("verifyUser", () => {
    const mockUserData = {
      email: "test@example.com",
      phone: "08123456789",
      bvn: "12345678901",
    }

    it("should handle verification service failure", async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error("Service error"))

      await expect(adjutorService.verifyUser(mockUserData))
        .rejects.toThrow("Unable to verify blacklist status. Registration denied.")
    })

    it("should reject user if any identity is blacklisted", async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: { status: false, message: "Not blacklisted" } })
        .mockResolvedValueOnce({ data: { status: true, message: "Blacklisted" } })
        .mockResolvedValueOnce({ data: { status: false, message: "Not blacklisted" } })

      const result = await adjutorService.verifyUser(mockUserData)

      expect(result).toBe(false)
    })

    it("should handle verification service failure based on configuration", async () => {
      process.env.ALLOW_REGISTRATION_ON_KARMA_FAILURE = "true"
      mockAxiosInstance.get.mockRejectedValue(new Error("Service error"))

      await expect(adjutorService.verifyUser(mockUserData))
        .rejects.toThrow("Unable to verify blacklist status. Registration denied.")
    })

    it("should reject on service failure when not configured to allow", async () => {
      process.env.ALLOW_REGISTRATION_ON_KARMA_FAILURE = "false"
      mockAxiosInstance.get.mockRejectedValue(new Error("Service error"))

      await expect(adjutorService.verifyUser(mockUserData))
        .rejects.toThrow("Unable to verify blacklist status. Registration denied.")
    })
  })
})