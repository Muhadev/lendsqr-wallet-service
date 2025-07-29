import { Router } from "express"
import { KYCController } from "../controllers/KYCController"
import { authenticate } from "../middleware/auth"

const router = Router()
const kycController = new KYCController()

// All KYC routes require authentication
router.use(authenticate)

// KYC operations
router.post("/submit", kycController.submitKYCDocument)
router.get("/documents", kycController.getUserKYCDocuments)
router.get("/status", kycController.getKYCStatus)

export default router
