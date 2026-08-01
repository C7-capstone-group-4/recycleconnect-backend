import express from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import {
    getWallet,
    topupWallet,
    linkBankAccount,
    withdrawToBank,
    spendUtility,
} from './wallet.controller.js';


const router = express.Router();

router.use(protect); // Require authentication for all wallet endpoints

// Get Wallet Balance & History (All Authenticated Roles)
router.get('/', getWallet);

// Collection Partner Pre-Fund Topup
router.post('/topup', restrictTo('COLLECTION_PARTNER'), topupWallet);

// Household Link Bank Account
router.post('/link-bank', restrictTo('HOUSEHOLD'), linkBankAccount);

// Household Withdraw to Bank
router.post('/withdraw', restrictTo('HOUSEHOLD'), withdrawToBank);

// Household Spend In-App Utility
router.post('/spend-utility', restrictTo('HOUSEHOLD'), spendUtility);

export default router;