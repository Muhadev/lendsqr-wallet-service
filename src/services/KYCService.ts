import { KYCRepository } from "../repositories/KYCRepository"
import { type CreateKYCData, KYCStatus, type KYCResponse } from "../models/KYC"
import { ConflictError } from "../utils/AppError"
import { logger } from "../utils/logger"

export class KYCService {
  private kycRepository: KYCRepository

  constructor() {
    this.kycRepository = new KYCRepository()
  }

  async submitKYCDocument(kycData: CreateKYCData): Promise<KYCResponse> {
    // Check if user already has this document type
    const existingKYC = await this.kycRepository.findByUserIdAndType(kycData.userId, kycData.documentType)

    if (existingKYC && existingKYC.status === KYCStatus.APPROVED) {
      throw new ConflictError("This document type is already verified")
    }

    if (existingKYC && existingKYC.status === KYCStatus.PENDING) {
      throw new ConflictError("This document type is already under review")
    }

    // For demo purposes, we'll auto-approve dummy documents
    const kyc = await this.kycRepository.create(kycData)

    // Simulate KYC verification (auto-approve for demo)
    const verifiedKYC = await this.simulateKYCVerification(kyc.id)

    logger.info("KYC document submitted", {
      userId: kycData.userId,
      documentType: kycData.documentType,
      status: verifiedKYC.status,
    })

    return this.sanitizeKYC(verifiedKYC)
  }

  async getUserKYCDocuments(userId: number): Promise<KYCResponse[]> {
    const kycDocuments = await this.kycRepository.findByUserId(userId)
    return kycDocuments.map((kyc) => this.sanitizeKYC(kyc))
  }

  async getKYCStatus(userId: number): Promise<{
    hasApprovedKYC: boolean
    documents: KYCResponse[]
  }> {
    const hasApprovedKYC = await this.kycRepository.hasApprovedKYC(userId)
    const documents = await this.getUserKYCDocuments(userId)

    return {
      hasApprovedKYC,
      documents,
    }
  }

  // Simulate KYC verification for demo purposes
  private async simulateKYCVerification(kycId: number) {
    // In a real system, this would involve actual document verification
    // For demo, we'll randomly approve/reject or auto-approve dummy documents

    const shouldApprove = Math.random() > 0.1 // 90% approval rate for demo

    if (shouldApprove) {
      return await this.kycRepository.updateStatus(kycId, KYCStatus.APPROVED)
    } else {
      return await this.kycRepository.updateStatus(
        kycId,
        KYCStatus.REJECTED,
        "Document quality is poor or information is unclear",
      )
    }
  }

  private sanitizeKYC(kyc: any): KYCResponse {
    return {
      id: kyc.id,
      userId: kyc.userId,
      documentType: kyc.documentType,
      documentNumber: kyc.documentNumber,
      status: kyc.status,
      verificationDate: kyc.verificationDate,
      createdAt: kyc.createdAt,
      updatedAt: kyc.updatedAt,
    }
  }
}
