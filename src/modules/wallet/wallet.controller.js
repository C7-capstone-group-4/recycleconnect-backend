import prisma from '../../config/db.js';
import walletService from './wallet.service.js';
import { validateRequiredFields } from '../../utils/validator.js';
import {
    initializePaystackTopup,
    verifyBankAccountNumber,
    createTransferRecipient,
    initiatePaystackTransfer,
} from '../../utils/paystackService.js';

/**
 * Get Active Wallet Balance & Ledger History (US-H10)
 * GET /api/v1/wallet
 */
export const getWallet = async (req, res) => {
    try {
        const userId = req.user.id;
        const wallet = await walletService.getOrCreateWallet(prisma, userId);

        const transactions = await prisma.walletTransaction.findMany({
            where: { wallet_id: wallet.id },
            orderBy: { created_at: 'desc' },
        });

        return res.status(200).json({
            success: true,
            message: 'Wallet balance and transaction ledger fetched successfully',
            data: {
                balance: Number(wallet.balance),
                transactions: transactions.map((t) => ({
                    id: t.id,
                    amount: Number(t.amount),
                    type: t.type,
                    reference_type: t.reference_type,
                    paystack_ref: t.paystack_ref,
                    created_at: t.created_at,
                })),
            },
        });
    } catch (error) {
        console.error('Error fetching wallet:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch wallet information.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Collection Partner Pre-Fund Wallet Top-up (US-C13)
 * POST /api/v1/wallet/topup
 */
export const topupWallet = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount } = req.body;

        const missingFields = validateRequiredFields(req.body, ['amount']);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'amount is required.',
                error: 'BAD_REQUEST',
                missing_fields: missingFields,
            });
        }

        if (Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Topup amount must be greater than 0.',
                error: 'BAD_REQUEST',
            });
        }

        const wallet = await walletService.getOrCreateWallet(prisma, userId);
        const userEmail = req.user.email || `partner_${userId.slice(0, 8)}@recycleconnect.ng`;

        // Call Paystack Initialize Transaction API
        const paystackRes = await initializePaystackTopup(userEmail, Number(amount));

        // Credit wallet in development mock mode
        if (process.env.NODE_ENV === 'development') {
            await walletService.creditWallet(
                prisma,
                wallet.id,
                Number(amount),
                'PRE_FUND',
                paystackRes.data.reference
            );
        }

        return res.status(200).json({
            success: true,
            message: 'Paystack topup checkout initialized successfully',
            data: {
                authorization_url: paystackRes.data.authorization_url,
                reference: paystackRes.data.reference,
                amount: Number(amount),
            },
        });
    } catch (error) {
        console.error('Error initializing topup:', error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to initialize wallet topup.',
            error: error.errorType || 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Verify & Link Bank Account via Paystack
 * POST /api/v1/wallet/link-bank
 */
export const linkBankAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { account_number, bank_code } = req.body;

        const missingFields = validateRequiredFields(req.body, ['account_number', 'bank_code']);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'account_number and bank_code are required.',
                error: 'BAD_REQUEST',
                missing_fields: missingFields,
            });
        }

        // Call Paystack Bank Account Resolution API
        const resolveRes = await verifyBankAccountNumber(account_number, bank_code);
        const accountName = resolveRes.data.account_name;

        // Save bank details to HouseholdProfile
        const updatedProfile = await prisma.householdProfile.update({
            where: { user_id: userId },
            data: {
                bank_name: bank_code,
                bank_account_no: account_number,
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Bank account verified and linked successfully',
            data: {
                account_name: accountName,
                account_number,
                bank_code,
            },
        });
    } catch (error) {
        console.error('Error linking bank account:', error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to verify bank account.',
            error: error.errorType || 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Withdraw Wallet Balance to Bank Account via Paystack
 * POST /api/v1/wallet/withdraw
 */
export const withdrawToBank = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount } = req.body;

        const missingFields = validateRequiredFields(req.body, ['amount']);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'amount is required.',
                error: 'BAD_REQUEST',
                missing_fields: missingFields,
            });
        }

        const numericAmount = Number(amount);
        if (numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Withdrawal amount must be greater than 0.',
                error: 'BAD_REQUEST',
            });
        }

        const householdProfile = await prisma.householdProfile.findUnique({
            where: { user_id: userId },
        });

        if (!householdProfile?.bank_account_no || !householdProfile?.bank_name) {
            return res.status(400).json({
                success: false,
                message: 'No bank account linked. Please link a bank account before withdrawing.',
                error: 'BANK_ACCOUNT_NOT_LINKED',
            });
        }

        const wallet = await walletService.getOrCreateWallet(prisma, userId);

        if (Number(wallet.balance) < numericAmount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance. Available: ₦${wallet.balance}, Requested: ₦${numericAmount}`,
                error: 'INSUFFICIENT_FUNDS',
            });
        }

        // Create Paystack Transfer Recipient
        const recipientRes = await createTransferRecipient(
            householdProfile.first_name,
            householdProfile.bank_account_no,
            householdProfile.bank_name
        );

        // Initiate Paystack Transfer
        const transferRes = await initiatePaystackTransfer(
            numericAmount,
            recipientRes.data.recipient_code
        );

        // Atomically debit wallet inside Prisma transaction
        const updatedWallet = await prisma.$transaction(async (tx) => {
            return await walletService.debitWallet(
                tx,
                wallet.id,
                numericAmount,
                'BANK_WITHDRAWAL',
                transferRes.data.transfer_code || transferRes.data.reference
            );
        });

        return res.status(200).json({
            success: true,
            message: 'Bank withdrawal initiated successfully via Paystack',
            data: {
                amount_withdrawn: numericAmount,
                remaining_balance: Number(updatedWallet.balance),
                paystack_transfer_code: transferRes.data.transfer_code || 'TRF_MOCK',
            },
        });
    } catch (error) {
        console.error('Error withdrawing to bank:', error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to process bank withdrawal.',
            error: error.errorType || 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Spend Wallet In-App on Utilities/Airtime via Paystack (US-H12)
 * POST /api/v1/wallet/spend-utility
 */
export const spendUtility = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, amount, phone_number, network } = req.body;

        const missingFields = validateRequiredFields(req.body, ['type', 'amount', 'phone_number']);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required field(s): ${missingFields.join(', ')}`,
                error: 'BAD_REQUEST',
                missing_fields: missingFields,
            });
        }

        const numericAmount = Number(amount);
        const wallet = await walletService.getOrCreateWallet(prisma, userId);

        if (Number(wallet.balance) < numericAmount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance. Available: ₦${wallet.balance}, Required: ₦${numericAmount}`,
                error: 'INSUFFICIENT_FUNDS',
            });
        }

        // Deduct wallet balance
        const updatedWallet = await prisma.$transaction(async (tx) => {
            return await walletService.debitWallet(
                tx,
                wallet.id,
                numericAmount,
                'UTILITY_BILL',
                `utility_${type.toLowerCase()}_${Date.now()}`
            );
        });

        return res.status(200).json({
            success: true,
            message: `${type} purchase of ₦${numericAmount} for ${phone_number} processed successfully`,
            data: {
                type,
                amount: numericAmount,
                phone_number,
                network: network || 'DEFAULT',
                remaining_balance: Number(updatedWallet.balance),
            },
        });
    } catch (error) {
        console.error('Error processing utility purchase:', error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to process utility purchase.',
            error: error.errorType || 'INTERNAL_SERVER_ERROR',
        });
    }
};