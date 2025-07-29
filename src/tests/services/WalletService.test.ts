import { WalletService } from "../../services/WalletService";
import { AccountRepository } from "../../repositories/AccountRepository";
import { TransactionRepository } from "../../repositories/TransactionRepository";
import { UserRepository } from "../../repositories/UserRepository";
import { 
  TransactionType, 
  TransactionStatus, 
  FundAccountData, 
  TransferData, 
  WithdrawData, 
  TransactionResponse 
} from "../../models/Transaction";
import { AccountStatus } from "../../models/Account";
import * as helpers from "../../utils/helpers";
import { db } from "../../config/database";
import { NotFoundError, ValidationError, InsufficientFundsError, AppError } from "../../utils/AppError";

// Helper for Knex trx mock (moved to top level for all tests)
let referenceCounter = 0;
function uniqueReference() {
  referenceCounter += 1;
  return `TXNTEST${referenceCounter}`;
}

type TrxQuery<T> = {
  where: (arg: any) => { first: () => Promise<T | null> };
  insert: (...args: any[]) => Promise<number[]>;
};

function makeTrxMock<T>(result: T | null): TrxQuery<T> {
  return {
    where: (arg: any) => ({
      first: () => (arg && arg.id === 1 ? Promise.resolve(result) : Promise.resolve(null)),
    }),
    insert: jest.fn().mockResolvedValue([1]),
  };
}

// Mock dependencies
jest.mock("../../repositories/AccountRepository");
jest.mock("../../repositories/TransactionRepository");
jest.mock("../../repositories/UserRepository");
jest.mock("../../utils/helpers");
jest.mock("../../config/database");

describe("WalletService", () => {
  let walletService: WalletService;
  let mockAccountRepository: jest.Mocked<AccountRepository>;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockDb: any;

  const mockAccount = {
    id: 1,
    userId: 1,
    accountNumber: "1234567890",
    balance: 5000,
    status: AccountStatus.ACTIVE,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  };

  const mockRecipientAccount = {
    id: 2,
    userId: 2,
    accountNumber: "0987654321",
    balance: 3000,
    status: AccountStatus.ACTIVE,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  };

  const mockTransaction: TransactionResponse = {
    id: 1,
    accountId: 1,
    type: TransactionType.CREDIT,
    amount: 1000,
    recipientId: 2,
    reference: "TXN123456789",
    status: TransactionStatus.COMPLETED,
    description: "Test transaction",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  };

  beforeEach(() => {
    mockAccountRepository = {
      findByUserId: jest.fn(),
      findByAccountNumber: jest.fn(),
      updateBalance: jest.fn(),
      updateStatus: jest.fn(),
      getBalance: jest.fn(),
      existsByAccountNumber: jest.fn(),
      delete: jest.fn(),
      transferFunds: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<AccountRepository>;

    mockTransactionRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByReference: jest.fn(),
      findByAccountId: jest.fn(),
      updateStatus: jest.fn(),
      getAccountTransactionsSummary: jest.fn(),
      createTransferTransactions: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<TransactionRepository>;

    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      findByBvn: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByEmail: jest.fn(),
      existsByPhone: jest.fn(),
      existsByBvn: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    // Mock helpers
    // (helpers.generateTransactionReference as jest.Mock).mockReturnValue("TXN123456789"); // Removed to allow real unique references
    (helpers.getPaginationMetadata as jest.Mock).mockReturnValue({
      currentPage: 1,
      totalPages: 1,
      totalCount: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      nextPage: null,
      previousPage: null,
    });

    // Mock db.transaction
    mockDb = {
      transaction: jest.fn(),
    };
    (db as any).transaction = mockDb.transaction;

    // Inject mocks into WalletService
    walletService = new WalletService();
    (walletService as any).accountRepository = mockAccountRepository;
    (walletService as any).transactionRepository = mockTransactionRepository;
    (walletService as any).userRepository = mockUserRepository;

    referenceCounter = 0;
    jest.clearAllMocks();
  });

  describe("getBalance", () => {
    it("should return wallet balance successfully", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      const result = await walletService.getBalance(1);
      expect(result).toEqual({
        accountNumber: mockAccount.accountNumber,
        balance: mockAccount.balance,
        status: mockAccount.status,
      });
    });

    it("should throw NotFoundError when account does not exist", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(null);
      await expect(walletService.getBalance(1)).rejects.toThrow(NotFoundError);
    });
  });

  describe("fundAccount", () => {

    it("should fund account successfully", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      const trx = ((table: string) => {
        if (table === "transactions") {
          return makeTrxMock({
            id: 1,
            account_id: mockAccount.id,
            type: TransactionType.CREDIT,
            amount: 1000,
            recipient_id: null,
            reference: uniqueReference(),
            status: TransactionStatus.COMPLETED,
            description: "Account funding",
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
        if (table === "accounts") {
          return {
            where: (_: any) => ({
              update: jest.fn().mockResolvedValue(undefined),
            }),
            insert: jest.fn().mockResolvedValue([1]),
          };
        }
        return {
          where: (_: any) => ({ first: () => Promise.resolve(null) }),
          insert: jest.fn().mockResolvedValue([1]),
        };
      }) as any;
      mockDb.transaction.mockImplementation(async (cb: any) => cb(trx));

      const fundData: FundAccountData = { amount: 1000, description: "Account funding" };
      const result = await walletService.fundAccount(1, fundData);
      expect(result.transaction.reference).toMatch(/^TXNTEST\d+$/);
      expect(result.newBalance).toBe(mockAccount.balance + fundData.amount);
    });

    it("should throw ValidationError for invalid amount", async () => {
      await expect(walletService.fundAccount(1, { amount: -100, description: "" }))
        .rejects.toThrow(ValidationError);
    });

    it("should throw NotFoundError if account not found", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(null);
      await expect(walletService.fundAccount(1, { amount: 1000, description: "" }))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe("transferFunds", () => {

    it("should transfer funds successfully", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockAccountRepository.findByAccountNumber.mockResolvedValue(mockRecipientAccount);

      const trx = ((table: string) => {
        if (table === "transactions") {
          return makeTrxMock({
            id: 1,
            account_id: mockAccount.id,
            type: TransactionType.DEBIT,
            amount: 1000,
            recipient_id: mockRecipientAccount.id,
            reference: uniqueReference(),
            status: TransactionStatus.COMPLETED,
            description: "Fund transfer",
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
        if (table === "accounts") {
          return {
            where: (_: any) => ({
              update: jest.fn().mockResolvedValue(undefined),
            }),
            insert: jest.fn().mockResolvedValue([1]),
          };
        }
        return {
          where: (_: any) => ({ first: () => Promise.resolve(null) }),
          insert: jest.fn().mockResolvedValue([1]),
        };
      }) as any;
      mockDb.transaction.mockImplementation(async (cb: any) => cb(trx));

      const transferData: TransferData = {
        amount: 1000,
        recipientAccountNumber: mockRecipientAccount.accountNumber,
        description: "Fund transfer",
      };
      const result = await walletService.transferFunds(1, transferData);
      expect(result.transaction.reference).toMatch(/^TXNTEST\d+$/);
      expect(result.newBalance).toBe(mockAccount.balance - transferData.amount);
    });

    it("should throw NotFoundError if sender account not found", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(null);
      await expect(walletService.transferFunds(1, {
        amount: 1000,
        recipientAccountNumber: "0987654321",
        description: "",
      })).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if recipient account not found", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockAccountRepository.findByAccountNumber.mockResolvedValue(null);
      await expect(walletService.transferFunds(1, {
        amount: 1000,
        recipientAccountNumber: "0987654321",
        description: "",
      })).rejects.toThrow(NotFoundError);
    });

    it("should throw InsufficientFundsError if balance is low", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue({ ...mockAccount, balance: 100 });
      mockAccountRepository.findByAccountNumber.mockResolvedValue(mockRecipientAccount);
      await expect(walletService.transferFunds(1, {
        amount: 1000,
        recipientAccountNumber: "0987654321",
        description: "",
      })).rejects.toThrow(InsufficientFundsError);
    });
  });

  describe("withdrawFunds", () => {

    it("should withdraw funds successfully", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);

      const trx = ((table: string) => {
        if (table === "transactions") {
          return makeTrxMock({
            id: 1,
            account_id: mockAccount.id,
            type: TransactionType.DEBIT,
            amount: 1000,
            recipient_id: null,
            reference: uniqueReference(),
            status: TransactionStatus.COMPLETED,
            description: "Cash withdrawal",
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
        if (table === "accounts") {
          return {
            where: (_: any) => ({
              update: jest.fn().mockResolvedValue(undefined),
            }),
            insert: jest.fn().mockResolvedValue([1]),
          };
        }
        return {
          where: (_: any) => ({ first: () => Promise.resolve(null) }),
          insert: jest.fn().mockResolvedValue([1]),
        };
      }) as any;
      mockDb.transaction.mockImplementation(async (cb: any) => cb(trx));

      const withdrawData: WithdrawData = { amount: 1000, description: "Cash withdrawal" };
      const result = await walletService.withdrawFunds(1, withdrawData);
      expect(result.transaction.reference).toMatch(/^TXNTEST\d+$/);
      expect(result.newBalance).toBe(mockAccount.balance - withdrawData.amount);
    });

    it("should throw NotFoundError if account not found", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(null);
      await expect(walletService.withdrawFunds(1, { amount: 1000, description: "" }))
        .rejects.toThrow(NotFoundError);
    });

    it("should throw InsufficientFundsError if balance is low", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue({ ...mockAccount, balance: 100 });
      await expect(walletService.withdrawFunds(1, { amount: 1000, description: "" }))
        .rejects.toThrow(InsufficientFundsError);
    });
  });

  describe("getTransactionHistory", () => {
    it("should return transaction history with pagination", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockTransactionRepository.findByAccountId.mockResolvedValue({
        transactions: [mockTransaction],
        totalCount: 1,
      });

      const result = await walletService.getTransactionHistory(1, { page: 1, limit: 10 });
      expect(result.transactions.length).toBe(1);
      expect(result.pagination.totalCount).toBe(1);
    });

    it("should throw NotFoundError if account not found", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(null);
      await expect(walletService.getTransactionHistory(1, {}))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe("getTransactionByReference", () => {
    it("should return transaction by reference", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockTransactionRepository.findByReference.mockResolvedValue({
        ...mockTransaction,
        accountId: mockAccount.id,
        reference: uniqueReference(),
      });

      const ref = mockTransactionRepository.findByReference.mock.calls[0]?.[0] || uniqueReference();
      const result = await walletService.getTransactionByReference(1, ref);
      expect(result.reference).toMatch(/^TXNTEST\d+$/);
    });

    it("should throw NotFoundError if account not found", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(null);
      await expect(walletService.getTransactionByReference(1, "TXN123456789"))
        .rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if transaction not found", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockTransactionRepository.findByReference.mockResolvedValue(null);
      await expect(walletService.getTransactionByReference(1, "TXN123456789"))
        .rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if transaction does not belong to user", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockTransactionRepository.findByReference.mockResolvedValue({
        ...mockTransaction,
        accountId: 999,
      });
      await expect(walletService.getTransactionByReference(1, "TXN123456789"))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe("getAccountSummary", () => {
    it("should return account summary", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(mockAccount);
      mockTransactionRepository.getAccountTransactionsSummary.mockResolvedValue({
        totalCredits: 10000,
        totalDebits: 5000,
        transactionCount: 10,
      });

      const result = await walletService.getAccountSummary(1);
      expect(result.accountNumber).toBe(mockAccount.accountNumber);
      expect(result.balance).toBe(mockAccount.balance);
      expect(result.totalCredits).toBe(10000);
      expect(result.totalDebits).toBe(5000);
      expect(result.transactionCount).toBe(10);
    });

    it("should throw NotFoundError if account not found", async () => {
      mockAccountRepository.findByUserId.mockResolvedValue(null);
      await expect(walletService.getAccountSummary(1))
        .rejects.toThrow(NotFoundError);
    });
  });
});