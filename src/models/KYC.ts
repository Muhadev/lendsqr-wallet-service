export interface KYC {
  id: number
  userId: number
  documentType: KYCDocumentType
  documentNumber: string
  documentUrl?: string
  status: KYCStatus
  verificationDate?: Date
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
}

export enum KYCDocumentType {
  NATIONAL_ID = "national_id",
  DRIVERS_LICENSE = "drivers_license",
  PASSPORT = "passport",
  VOTERS_CARD = "voters_card",
}

export enum KYCStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  EXPIRED = "expired",
}

export interface CreateKYCData {
  userId: number
  documentType: KYCDocumentType
  documentNumber: string
  documentUrl?: string
}

export interface KYCResponse {
  id: number
  userId: number
  documentType: KYCDocumentType
  documentNumber: string
  status: KYCStatus
  verificationDate?: Date
  createdAt: Date
  updatedAt: Date
}
