import { Router } from 'express';
import { WalletController } from '../controllers/WalletController';
import { authenticate } from '../middleware/auth';

const router = Router();
const walletController = new WalletController();

// All wallet routes require authentication
router.use(authenticate);

// Wallet operations
router.get('/balance', walletController.getBalance);
router.post('/fund', walletController.fundAccount);
router.post('/transfer', walletController.transferFunds);
router.post('/withdraw', walletController.withdrawFunds);

// Transaction routes
router.get('/transactions', walletController.getTransactionHistory);
router.get('/transactions/:reference', walletController.getTransactionByReference);

// Account summary
router.get('/summary', walletController.getAccountSummary);

export default router;