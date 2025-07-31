import { AccountRepository } from "../repositories/AccountRepository"
import { TransactionRepository } from "../repositories/TransactionRepository"
import { UserRepository } from "../repositories/UserRepository"
import {
  type TransferData,
  type FundAccountData,
  type WithdrawData,
  TransactionType,
  TransactionStatus,
  type TransactionResponse,
} from "../models/Transaction"
import { AccountStatus } from "../models/Account"
import { generateTransactionReference, getPaginationMetadata } from "../utils/helpers"
import { AppError, NotFoundError, InsufficientFundsError, ValidationError } from "../utils/AppError"
import { logger } from "../utils/logger"
import { db } from "../config/database"
import type { Knex } from "knex"

const requiredAmountEnvs = [
  "MIN_FUNDING_AMOUNT",
  "MAX_FUNDING_AMOUNT",
  "MIN_TRANSFER_AMOUNT",
  "MAX_TRANSFER_AMOUNT",
  "MIN_WITHDRAWAL_AMOUNT",
  "MAX_WITHDRAWAL_AMOUNT",
  "TRANSACTION_REF_MAX_ATTEMPTS"
]
requiredAmountEnvs.forEach((env) => {
  if (!process.env[env]) {
    throw new AppError(`Missing required environment variable: ${env}`, 500)
  }
})

export interface WalletBalance {
  accountNumber: string
  balance: number
  status: AccountStatus
}

export interface TransactionHistory {
  transactions: TransactionResponse[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    hasNextPage: boolean
    hasPreviousPage: boolean
    nextPage: number | null
    previousPage: number | null
  }
}

/**
 * Wallet service handling account operations and transactions
 */
export class WalletService {
  private accountRepository: AccountRepository
  private transactionRepository: TransactionRepository
  private userRepository: UserRepository
  private maxReferenceAttempts: number

  private limits: {
    funding: { min: number; max: number };
    transfer: { min: number; max: number };
    withdrawal: { min: number; max: number };
  };


  constructor() {
    this.accountRepository = new AccountRepository()
    this.transactionRepository = new TransactionRepository()
    this.userRepository = new UserRepository()
    if (!process.env.TRANSACTION_REF_MAX_ATTEMPTS) {
      throw new AppError("TRANSACTION_REF_MAX_ATTEMPTS environment variable is required", 500)
    }
    this.maxReferenceAttempts = Number.parseInt(process.env.TRANSACTION_REF_MAX_ATTEMPTS)

     this.limits = {
      funding: {
        min: Number.parseInt(process.env.MIN_FUNDING_AMOUNT!),
        max: Number.parseInt(process.env.MAX_FUNDING_AMOUNT!),
      },
      transfer: {
        min: Number.parseInt(process.env.MIN_TRANSFER_AMOUNT!),
        max: Number.parseInt(process.env.MAX_TRANSFER_AMOUNT!),
      },
      withdrawal: {
        min: Number.parseInt(process.env.MIN_WITHDRAWAL_AMOUNT!),
        max: Number.parseInt(process.env.MAX_WITHDRAWAL_AMOUNT!),
      },
    }
  }

  /**
   * Get wallet balance for user
   * @param userId - User ID
   * @returns Promise<WalletBalance>
   */
  async getBalance(userId: number): Promise<WalletBalance> {
    const account = await this.accountRepository.findByUserId(userId)
    if (!account) {
      logger.warn("Balance request for non-existent account", { userId })
      throw new NotFoundError("Account not found")
    }

    logger.info("Balance retrieved", { userId, accountId: account.id })

    return {
      accountNumber: account.accountNumber,
      balance: account.balance,
      status: account.status,
    }
  }

  /**
   * Fund user account
   * @param userId - User ID
   * @param fundData - Funding data
   * @returns Promise with transaction and new balance
   */
  async fundAccount(
    userId: number,
    fundData: FundAccountData,
  ): Promise<{
    transaction: TransactionResponse
    newBalance: number
  }> {
    // Validate amount
    this.validateAmount(fundData.amount, "funding")

    // Get user account
    const account = await this.accountRepository.findByUserId(userId)
    if (!account) {
      logger.warn("Fund account attempt for non-existent account", { userId })
      throw new NotFoundError("Account not found")
    }

    // Check account status
    if (account.status !== AccountStatus.ACTIVE) {
      logger.warn("Fund account attempt for inactive account", {
        userId,
        accountStatus: account.status,
      })
      throw new AppError("Account is not active", 403)
    }

    // Use database transaction for atomicity
    const result = await db.transaction(async (trx: Knex.Transaction) => {
      // Generate unique transaction reference
      const reference = await this.generateUniqueTransactionReference(trx)

      // Calculate new balance
      const newBalance = account.balance + fundData.amount

      // Update account balance
      await trx("accounts").where({ id: account.id }).update({
        balance: newBalance,
        updated_at: new Date(),
      })

      // Create credit transaction
      const [transactionId] = await trx("transactions").insert({
        account_id: account.id,
        type: TransactionType.CREDIT,
        amount: fundData.amount,
        reference: reference,
        status: TransactionStatus.COMPLETED,
        description: fundData.description || "Account funding",
        created_at: new Date(),
        updated_at: new Date(),
      })

      // Get the created transaction
      const transaction = await trx("transactions").where({ id: transactionId }).first()

      return {
        transaction: this.mapDbToTransaction(transaction),
        newBalance,
      }
    })

    logger.info("Account funded successfully", {
      userId,
      accountId: account.id,
      amount: fundData.amount,
      reference: result.transaction.reference,
      newBalance: result.newBalance,
    })

    return {
      transaction: this.sanitizeTransaction(result.transaction),
      newBalance: result.newBalance,
    }
  }

  /**
   * Transfer funds between accounts
   * @param userId - Sender user ID
   * @param transferData - Transfer data
   * @returns Promise with transaction and new balance
   */
  async transferFunds(
    userId: number,
    transferData: TransferData,
  ): Promise<{
    transaction: TransactionResponse
    newBalance: number
  }> {
    // Validate amount
    this.validateAmount(transferData.amount, "transfer")

    // Get sender account
    const senderAccount = await this.accountRepository.findByUserId(userId)
    if (!senderAccount) {
      logger.warn("Transfer attempt from non-existent sender account", { userId })
      throw new NotFoundError("Sender account not found")
    }

    // Check sender account status
    if (senderAccount.status !== AccountStatus.ACTIVE) {
      logger.warn("Transfer attempt from inactive sender account", {
        userId,
        accountStatus: senderAccount.status,
      })
      throw new AppError("Sender account is not active", 403)
    }

    // Get recipient account
    const recipientAccount = await this.accountRepository.findByAccountNumber(transferData.recipientAccountNumber)
    if (!recipientAccount) {
      logger.warn("Transfer attempt to non-existent recipient account", {
        userId,
        recipientAccountNumber: transferData.recipientAccountNumber.slice(-4),
      })
      throw new NotFoundError("Recipient account not found")
    }

    // Check recipient account status
    if (recipientAccount.status !== AccountStatus.ACTIVE) {
      logger.warn("Transfer attempt to inactive recipient account", {
        userId,
        recipientAccountId: recipientAccount.id,
        recipientStatus: recipientAccount.status,
      })
      throw new AppError("Recipient account is not active", 403)
    }

    // Check if sender is trying to transfer to themselves
    if (senderAccount.id === recipientAccount.id) {
      logger.warn("Self-transfer attempt", { userId, accountId: senderAccount.id })
      throw new ValidationError("Cannot transfer funds to the same account")
    }

    // Check sufficient balance
    if (senderAccount.balance < transferData.amount) {
      logger.warn("Transfer attempt with insufficient funds", {
        userId,
        accountId: senderAccount.id,
        availableBalance: senderAccount.balance,
        requestedAmount: transferData.amount,
      })
      throw new InsufficientFundsError(`Insufficient funds. Available balance: ₦${senderAccount.balance.toFixed(2)}`)
    }

    // Use database transaction for atomicity
    const result = await db.transaction(async (trx: Knex.Transaction) => {
      // Generate unique transaction references
      const debitReference = await this.generateUniqueTransactionReference(trx)
      const creditReference = await this.generateUniqueTransactionReference(trx)

      // Calculate new balances
      const newSenderBalance = senderAccount.balance - transferData.amount
      const newRecipientBalance = recipientAccount.balance + transferData.amount

      // Update sender account balance
      await trx("accounts").where({ id: senderAccount.id }).update({
        balance: newSenderBalance,
        updated_at: new Date(),
      })

      // Update recipient account balance
      await trx("accounts").where({ id: recipientAccount.id }).update({
        balance: newRecipientBalance,
        updated_at: new Date(),
      })

      // Create debit transaction for sender
      const [debitTransactionId] = await trx("transactions").insert({
        account_id: senderAccount.id,
        type: TransactionType.DEBIT,
        amount: transferData.amount,
        recipient_id: recipientAccount.id,
        reference: debitReference,
        status: TransactionStatus.COMPLETED,
        description: transferData.description || "Fund transfer",
        created_at: new Date(),
        updated_at: new Date(),
      })

      // Create credit transaction for recipient
      await trx("transactions").insert({
        account_id: recipientAccount.id,
        type: TransactionType.CREDIT,
        amount: transferData.amount,
        recipient_id: senderAccount.id,
        reference: creditReference,
        status: TransactionStatus.COMPLETED,
        description: transferData.description || "Fund transfer",
        created_at: new Date(),
        updated_at: new Date(),
      })

      // Get the debit transaction
      const debitTransaction = await trx("transactions").where({ id: debitTransactionId }).first()

      return {
        transaction: this.mapDbToTransaction(debitTransaction),
        newBalance: newSenderBalance,
      }
    })

    logger.info("Funds transferred successfully", {
      senderUserId: userId,
      senderAccountId: senderAccount.id,
      recipientAccountId: recipientAccount.id,
      amount: transferData.amount,
      reference: result.transaction.reference,
      newBalance: result.newBalance,
    })

    return {
      transaction: this.sanitizeTransaction(result.transaction),
      newBalance: result.newBalance,
    }
  }

  /**
   * Withdraw funds from account
   * @param userId - User ID
   * @param withdrawData - Withdrawal data
   * @returns Promise with transaction and new balance
   */
  async withdrawFunds(
    userId: number,
    withdrawData: WithdrawData,
  ): Promise<{
    transaction: TransactionResponse
    newBalance: number
  }> {
    // Validate amount
    this.validateAmount(withdrawData.amount, "withdrawal")

    // Get user account
    const account = await this.accountRepository.findByUserId(userId)
    if (!account) {
      logger.warn("Withdrawal attempt from non-existent account", { userId })
      throw new NotFoundError("Account not found")
    }

    // Check account status
    if (account.status !== AccountStatus.ACTIVE) {
      logger.warn("Withdrawal attempt from inactive account", {
        userId,
        accountStatus: account.status,
      })
      throw new AppError("Account is not active", 403)
    }

    // Check sufficient balance
    if (account.balance < withdrawData.amount) {
      logger.warn("Withdrawal attempt with insufficient funds", {
        userId,
        accountId: account.id,
        availableBalance: account.balance,
        requestedAmount: withdrawData.amount,
      })
      throw new InsufficientFundsError(`Insufficient funds. Available balance: ₦${account.balance.toFixed(2)}`)
    }

    // Use database transaction for atomicity
    const result = await db.transaction(async (trx: Knex.Transaction) => {
      // Generate unique transaction reference
      const reference = await this.generateUniqueTransactionReference(trx)

      // Calculate new balance
      const newBalance = account.balance - withdrawData.amount

      // Update account balance
      await trx("accounts").where({ id: account.id }).update({
        balance: newBalance,
        updated_at: new Date(),
      })

      // Create debit transaction
      const [transactionId] = await trx("transactions").insert({
        account_id: account.id,
        type: TransactionType.DEBIT,
        amount: withdrawData.amount,
        reference: reference,
        status: TransactionStatus.COMPLETED,
        description: withdrawData.description || "Cash withdrawal",
        created_at: new Date(),
        updated_at: new Date(),
      })

      // Get the created transaction
      const transaction = await trx("transactions").where({ id: transactionId }).first()

      return {
        transaction: this.mapDbToTransaction(transaction),
        newBalance,
      }
    })

    logger.info("Funds withdrawn successfully", {
      userId,
      accountId: account.id,
      amount: withdrawData.amount,
      reference: result.transaction.reference,
      newBalance: result.newBalance,
    })

    return {
      transaction: this.sanitizeTransaction(result.transaction),
      newBalance: result.newBalance,
    }
  }

  /**
   * Get transaction history for user
   * @param userId - User ID
   * @param options - Query options
   * @returns Promise<TransactionHistory>
   */
  async getTransactionHistory(
    userId: number,
    options: {
      page?: number
      limit?: number
      type?: TransactionType
      status?: TransactionStatus
      startDate?: Date
      endDate?: Date
    } = {},
  ): Promise<TransactionHistory> {
    // Get user account
    const account = await this.accountRepository.findByUserId(userId)
    if (!account) {
      logger.warn("Transaction history request for non-existent account", { userId })
      throw new NotFoundError("Account not found")
    }

    const { page = 1, limit = 20 } = options

    // Get transactions
    const { transactions, totalCount } = await this.transactionRepository.findByAccountId(account.id, options)

    // Generate pagination metadata
    const pagination = getPaginationMetadata(totalCount, page, limit)

    logger.info("Transaction history retrieved", {
      userId,
      accountId: account.id,
      transactionCount: transactions.length,
      totalCount,
      page,
    })

    return {
      transactions: transactions.map((transaction) => this.sanitizeTransaction(transaction)),
      pagination,
    }
  }

  /**
   * Get transaction by reference
   * @param userId - User ID
   * @param reference - Transaction reference
   * @returns Promise<TransactionResponse>
   */
  async getTransactionByReference(userId: number, reference: string): Promise<TransactionResponse> {
    // Get user account
    const account = await this.accountRepository.findByUserId(userId)
    if (!account) {
      logger.warn("Transaction lookup for non-existent account", { userId, reference })
      throw new NotFoundError("Account not found")
    }

    // Get transaction
    const transaction = await this.transactionRepository.findByReference(reference)
    if (!transaction) {
      logger.warn("Transaction not found by reference", { userId, reference })
      throw new NotFoundError("Transaction not found")
    }

    // Verify transaction belongs to user
    if (transaction.accountId !== account.id) {
      logger.warn("Unauthorized transaction access attempt", {
        userId,
        reference,
        transactionAccountId: transaction.accountId,
        userAccountId: account.id,
      })
      throw new NotFoundError("Transaction not found")
    }

    logger.info("Transaction retrieved by reference", {
      userId,
      accountId: account.id,
      reference,
      transactionId: transaction.id,
    })

    return this.sanitizeTransaction(transaction)
  }

  /**
   * Get account summary
   * @param userId - User ID
   * @returns Promise with account summary
   */
  async getAccountSummary(userId: number): Promise<{
    balance: number
    accountNumber: string
    totalCredits: number
    totalDebits: number
    transactionCount: number
  }> {
    // Get user account
    const account = await this.accountRepository.findByUserId(userId)
    if (!account) {
      logger.warn("Account summary request for non-existent account", { userId })
      throw new NotFoundError("Account not found")
    }

    // Get transaction summary
    const summary = await this.transactionRepository.getAccountTransactionsSummary(account.id)

    logger.info("Account summary retrieved", {
      userId,
      accountId: account.id,
      transactionCount: summary.transactionCount,
    })

    return {
      balance: account.balance,
      accountNumber: account.accountNumber,
      ...summary,
    }
  }

  /**
   * Validate transaction amount
   * @private
   */
  private validateAmount(amount: number, operationType: string): void {
    if (amount <= 0) {
      throw new ValidationError("Amount must be a positive number");
    }

    const limit = this.limits[operationType as keyof typeof this.limits];
    if (!limit) {
      throw new ValidationError("Invalid operation type");
    }

    if (amount < limit.min) {
      throw new ValidationError(`Minimum ${operationType} amount is ₦${limit.min}`);
    }

    if (amount > limit.max) {
      throw new ValidationError(`Maximum ${operationType} amount is ₦${limit.max}`);
    }
  }

  /**
   * Generate unique transaction reference
   * @private
   */
  private async generateUniqueTransactionReference(trx: Knex.Transaction): Promise<string> {
    let reference: string
    let referenceExists = true
    let attempts = 0

    while (referenceExists && attempts < this.maxReferenceAttempts) {
      reference = generateTransactionReference()
      const existingTransaction = await trx("transactions").where({ reference }).first()

      if (existingTransaction) {
        logger.warn("Duplicate transaction reference generated", {
          reference,
          attempt: attempts + 1,
        })
      }

      referenceExists = !!existingTransaction
      attempts++
    }

    if (referenceExists) {
      logger.error("Failed to generate unique transaction reference", {
        attempts: this.maxReferenceAttempts,
      })
      throw new AppError("Unable to generate unique transaction reference", 500)
    }

    return reference!
  }

  /**
   * Map database result to transaction model
   * @private
   */
  private mapDbToTransaction(dbResult: any): any {
    return {
      id: dbResult.id,
      accountId: dbResult.account_id,
      type: dbResult.type,
      amount: Number.parseFloat(dbResult.amount),
      recipientId: dbResult.recipient_id,
      reference: dbResult.reference,
      status: dbResult.status,
      description: dbResult.description,
      createdAt: dbResult.created_at,
      updatedAt: dbResult.updated_at,
    }
  }

  /**
   * Sanitize transaction for response
   * @private
   */
  private sanitizeTransaction(transaction: any): TransactionResponse {
    return {
      id: transaction.id,
      accountId: transaction.accountId,
      type: transaction.type,
      amount: transaction.amount,
      recipientId: transaction.recipientId,
      reference: transaction.reference,
      status: transaction.status,
      description: transaction.description,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    }
  }
}
