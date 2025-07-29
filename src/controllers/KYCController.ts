import type { Response, NextFunction } from "express"
import { KYCService } from "../services/KYCService"
import type { CreateKYCData } from "../models/KYC"
import { kycSubmissionSchema } from "../utils/validators"
import { AppError } from "../utils/AppError"
import type { AuthenticatedRequest } from "../middleware/auth"

export class KYCController {
  private kycService: KYCService

  constructor() {
    this.kycService = new KYCService()
  }

  submitKYCDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401)
      }

      // Validate request data
      const { error, value } = kycSubmissionSchema.validate(req.body)
      if (error) {
        throw new AppError(error.details[0].message, 400)
      }

      const kycData: CreateKYCData = {
        userId: req.user.id,
        documentType: value.documentType,
        documentNumber: value.documentNumber,
        documentUrl: value.documentUrl,
      }

      const result = await this.kycService.submitKYCDocument(kycData)

      res.status(201).json({
        status: "success",
        message: "KYC document submitted successfully",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  getUserKYCDocuments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401)
      }

      const documents = await this.kycService.getUserKYCDocuments(req.user.id)

      res.status(200).json({
        status: "success",
        message: "KYC documents retrieved successfully",
        data: { documents },
      })
    } catch (error) {
      next(error)
    }
  }

  getKYCStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError("User not authenticated", 401)
      }

      const status = await this.kycService.getKYCStatus(req.user.id)

      res.status(200).json({
        status: "success",
        message: "KYC status retrieved successfully",
        data: status,
      })
    } catch (error) {
      next(error)
    }
  }
}
