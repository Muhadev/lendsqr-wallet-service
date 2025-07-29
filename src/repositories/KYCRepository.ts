import { db } from "../config/database"
import { type KYC, type CreateKYCData, type KYCDocumentType, KYCStatus } from "../models/KYC"
import { NotFoundError } from "../utils/AppError"

export class KYCRepository {
  private tableName = "kyc_documents"

  async create(kycData: CreateKYCData): Promise<KYC> {
    const [id] = await db(this.tableName).insert({
      user_id: kycData.userId,
      document_type: kycData.documentType,
      document_number: kycData.documentNumber,
      document_url: kycData.documentUrl,
      status: KYCStatus.PENDING,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const kyc = await this.findById(id)
    if (!kyc) {
      throw new Error("Failed to create KYC document")
    }

    return kyc
  }

  async findById(id: number): Promise<KYC | null> {
    const result = await db(this.tableName).where({ id }).first()

    if (!result) {
      return null
    }

    return this.mapDbToModel(result)
  }

  async findByUserId(userId: number): Promise<KYC[]> {
    const results = await db(this.tableName).where({ user_id: userId }).orderBy("created_at", "desc")

    return results.map((result: any) => this.mapDbToModel(result))
  }

  async findByUserIdAndType(userId: number, documentType: KYCDocumentType): Promise<KYC | null> {
    const result = await db(this.tableName)
      .where({
        user_id: userId,
        document_type: documentType,
      })
      .first()

    if (!result) {
      return null
    }

    return this.mapDbToModel(result)
  }

  async updateStatus(id: number, status: KYCStatus, rejectionReason?: string): Promise<KYC> {
    const updateData: any = {
      status,
      updated_at: new Date(),
    }

    if (status === KYCStatus.APPROVED) {
      updateData.verification_date = new Date()
    }

    if (status === KYCStatus.REJECTED && rejectionReason) {
      updateData.rejection_reason = rejectionReason
    }

    await db(this.tableName).where({ id }).update(updateData)

    const kyc = await this.findById(id)
    if (!kyc) {
      throw new NotFoundError("KYC document not found")
    }

    return kyc
  }

  async hasApprovedKYC(userId: number): Promise<boolean> {
    const result = await db(this.tableName)
      .where({
        user_id: userId,
        status: KYCStatus.APPROVED,
      })
      .first()

    return !!result
  }

  async delete(id: number): Promise<boolean> {
    const deletedCount = await db(this.tableName).where({ id }).del()

    return deletedCount > 0
  }

  private mapDbToModel(dbResult: any): KYC {
    return {
      id: dbResult.id,
      userId: dbResult.user_id,
      documentType: dbResult.document_type as KYCDocumentType,
      documentNumber: dbResult.document_number,
      documentUrl: dbResult.document_url,
      status: dbResult.status as KYCStatus,
      verificationDate: dbResult.verification_date,
      rejectionReason: dbResult.rejection_reason,
      createdAt: dbResult.created_at,
      updatedAt: dbResult.updated_at,
    }
  }
}
