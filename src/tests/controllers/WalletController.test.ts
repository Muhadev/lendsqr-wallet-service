import type { Response, NextFunction } from "express"
import { WalletController } from "../../controllers/WalletController"
import { WalletService } from "../../services/WalletService"
import { AppError } from "../../utils/AppError"
import type { AuthenticatedRequest } from "../../middleware/auth"
import { TransactionType, TransactionStatus } from "../../models/Transaction"
import { AccountStatus } from "../../models/Account"
import { jest } from "@jest/globals"

jest.mock("../../services/WalletService")

describe("WalletController", () => {
  let walletController: WalletController
  let mockWalletService: jest.Mocked<WalletService>
  let mockRequest: Partial<AuthenticatedRequest>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    walletController = new WalletController()
    mockWalletService = new WalletService() as jest.Mocked<WalletService>
    ;(walletController as any).walletService = mockWalletService

    mockRequest = {
      user: { id: 1, email: "test@example.com", firstName: "John", lastName: "Doe" },
      body: {},
      query: {},
      params: {},
    }

    // Fix: Properly type the mock response methods
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    }

    mockNext = jest.fn()
  })

  describe("getBalance", () => {
    it("should get balance successfully", async () => {
      const mockBalance = {
        accountNumber: "1234567890",
        balance: 5000,
        status: AccountStatus.ACTIVE,
      }

      mockWalletService.getBalance.mockResolvedValue(mockBalance)

      await walletController.getBalance(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockWalletService.getBalance).toHaveBeenCalledWith(1)
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        message: "Balance retrieved successfully",
        data: mockBalance,
      })
    })

    it("should handle unauthenticated request", async () => {
      mockRequest.user = undefined

      await walletController.getBalance(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
    })
  })

  describe("fundAccount", () => {
    const validFundData = {
      amount: 1000,
      description: "Test funding",
    }

    it("should fund account successfully", async () => {
      const mockResult = {
        transaction: {
          id: 1,
          accountId: 1,
          type: TransactionType.CREDIT,
          amount: 1000,
          reference: "TXN123456789",
          status: TransactionStatus.COMPLETED,
          description: "Test funding",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        newBalance: 6000,
      }

      mockRequest.body = validFundData
      mockWalletService.fundAccount.mockResolvedValue(mockResult)

      await walletController.fundAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockWalletService.fundAccount).toHaveBeenCalledWith(1, validFundData)
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        message: "Account funded successfully",
        data: mockResult,
      })
    })

    it("should handle validation errors", async () => {
      mockRequest.body = { amount: -100 }

      await walletController.fundAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
    })
  })

  describe("transferFunds", () => {
    const validTransferData = {
      recipientAccountNumber: "0987654321",
      amount: 500,
      description: "Test transfer",
    }

    it("should transfer funds successfully", async () => {
      const mockResult = {
        transaction: {
          id: 2,
          accountId: 1,
          type: TransactionType.DEBIT,
          amount: 500,
          recipientId: 2,
          reference: "TXN123456790",
          status: TransactionStatus.COMPLETED,
          description: "Test transfer",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        newBalance: 4500,
      }

      mockRequest.body = validTransferData
      mockWalletService.transferFunds.mockResolvedValue(mockResult)

      await walletController.transferFunds(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockWalletService.transferFunds).toHaveBeenCalledWith(1, validTransferData)
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        message: "Funds transferred successfully",
        data: mockResult,
      })
    })

    it("should handle invalid account number format", async () => {
      mockRequest.body = {
        recipientAccountNumber: "123", // Invalid format
        amount: 500,
      }

      await walletController.transferFunds(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
    })

    it("should handle recipient not found error", async () => {
      const error = new Error("Recipient account not found")
      mockRequest.body = validTransferData
      mockWalletService.transferFunds.mockRejectedValue(error)

      await walletController.transferFunds(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
    })
  })

  describe("withdrawFunds", () => {
    const validWithdrawData = {
      amount: 200,
      description: "ATM withdrawal",
    }

    it("should withdraw funds successfully", async () => {
      const mockResult = {
        transaction: {
          id: 3,
          accountId: 1,
          type: TransactionType.DEBIT,
          amount: 200,
          reference: "TXN123456791",
          status: TransactionStatus.COMPLETED,
          description: "ATM withdrawal",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        newBalance: 4300,
      }

      mockRequest.body = validWithdrawData
      mockWalletService.withdrawFunds.mockResolvedValue(mockResult)

      await walletController.withdrawFunds(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockWalletService.withdrawFunds).toHaveBeenCalledWith(1, validWithdrawData)
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        message: "Funds withdrawn successfully",
        data: mockResult,
      })
    })
  })

  describe("getTransactionHistory", () => {
    it("should get transaction history successfully", async () => {
      const mockHistory = {
        transactions: [
          {
            id: 1,
            accountId: 1,
            type: TransactionType.CREDIT,
            amount: 1000,
            reference: "TXN123456789",
            status: TransactionStatus.COMPLETED,
            description: "Test funding",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          nextPage: null,
          previousPage: null,
        },
      }

      mockRequest.query = { page: "1", limit: "20" }
      mockWalletService.getTransactionHistory.mockResolvedValue(mockHistory)

      await walletController.getTransactionHistory(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      )

      expect(mockWalletService.getTransactionHistory).toHaveBeenCalledWith(1, {
        page: 1,
        limit: 20,
        type: undefined,
        status: undefined,
        startDate: undefined,
        endDate: undefined,
      })
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        message: "Transaction history retrieved successfully",
        data: mockHistory,
      })
    })
  })

  describe("getTransactionByReference", () => {
    it("should get transaction by reference successfully", async () => {
      const mockTransaction = {
        id: 1,
        accountId: 1,
        type: TransactionType.CREDIT,
        amount: 1000,
        reference: "TXN123456789",
        status: TransactionStatus.COMPLETED,
        description: "Test funding",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRequest.params = { reference: "TXN123456789" }
      mockWalletService.getTransactionByReference.mockResolvedValue(mockTransaction)

      await walletController.getTransactionByReference(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      )

      expect(mockWalletService.getTransactionByReference).toHaveBeenCalledWith(1, "TXN123456789")
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        message: "Transaction retrieved successfully",
        data: { transaction: mockTransaction },
      })
    })

    it("should handle missing reference parameter", async () => {
      mockRequest.params = {}

      await walletController.getTransactionByReference(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      )

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError))
    })
  })

  describe("getAccountSummary", () => {
    it("should get account summary successfully", async () => {
      const mockSummary = {
        balance: 5000,
        accountNumber: "1234567890",
        totalCredits: 10000,
        totalDebits: 5000,
        transactionCount: 10,
      }

      mockWalletService.getAccountSummary.mockResolvedValue(mockSummary)

      await walletController.getAccountSummary(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockWalletService.getAccountSummary).toHaveBeenCalledWith(1)
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        message: "Account summary retrieved successfully",
        data: mockSummary,
      })
    })
  })
})
