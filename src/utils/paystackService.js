import 'dotenv/config';


const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Helper to make authenticated requests to Paystack API
const paystackRequest = async (endpoint, method = 'GET', body = null) => {
    // Development or Mock Mode fallback if no live Paystack key is set
    if (!PAYSTACK_SECRET || PAYSTACK_SECRET.includes('your_paystack') || process.env.NODE_ENV === 'development') {
        console.log(`[PAYSTACK MOCK SERVICE] Called ${method} ${endpoint}`);
        return {
            status: true,
            message: 'Mock Paystack API execution successful',
            data: {
                authorization_url: 'https://checkout.paystack.com/mock_checkout_url',
                access_code: 'mock_access_code_123',
                reference: `ref_mock_${Date.now()}`,
                account_name: 'MOCK VERIFIED ACCOUNT NAME',
                recipient_code: 'RCP_mock_998877',
                transfer_code: 'TRF_mock_554433',
            },
        };
    }

    const options = {
        method,
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json',
        },
        ...(body && { body: JSON.stringify(body) }),
    };

    const response = await fetch(`${PAYSTACK_BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok || !data.status) {
        const err = new Error(data.message || 'Paystack API operation failed');
        err.statusCode = 400;
        err.errorType = 'PAYSTACK_ERROR';
        throw err;
    }

    return data;
};

// Initialize Top-up Checkout for Partner Pre-Funding
export const initializePaystackTopup = async (email, amountInNaira) => {
    const amountInKobo = Math.round(amountInNaira * 100);
    return await paystackRequest('/transaction/initialize', 'POST', {
        email,
        amount: amountInKobo,
    });
};

// Resolve/Verify Bank Account Number
export const verifyBankAccountNumber = async (accountNumber, bankCode) => {
    return await paystackRequest(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, 'GET');
};

// Create Transfer Recipient for Bank Withdrawals
export const createTransferRecipient = async (name, accountNumber, bankCode) => {
    return await paystackRequest('/transferrecipient', 'POST', {
        type: 'nuban',
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
    });
};

// Initiate Bank Transfer Payout
export const initiatePaystackTransfer = async (amountInNaira, recipientCode) => {
    const amountInKobo = Math.round(amountInNaira * 100);
    return await paystackRequest('/transfer', 'POST', {
        source: 'balance',
        amount: amountInKobo,
        recipient: recipientCode,
        reason: 'RecycleConnect Wallet Withdrawal',
    });
};