// In-memory store for active OTPs (phone -> { code, expiresAt, attempts, lastSentAt })
const otpStore = new Map(); 

const OTP_LIFESPAN = 5 * 60 * 1000;  // 5 minutes expiry
const RESEND_COOLDOWN = 30 * 1000;  // 30 seconds cooldown
const MAX_ATTEMPTS = 3;  // Max 3 failed tries before invalidation

// Generate and store a 4-digit OTP with rate limiting
export const generateAndSendOTP = async (phone) => {
    // In dev mode, default code is '1234'
    const now = Date.now();
    const existingRecord = otpStore.get(phone);

    // Rate limiting check: Enforce a 30-second resend cooldown
    if (existingRecord && (now - existingRecord.lastSentAt) < RESEND_COOLDOWN) {
        const secondLeft = Math.ceil((RESEND_COOLDOWN - (now - existingRecord.lastSentAt)) / 1000);
        throw new Error(`Please wait ${secondsLeft} seconds before requesting a new OTP.`);
    }

    // Generate OTP
    const code = process.env.NODE_ENV === 'development' ? '1234' : Math.floor(1000 + Math.random() * 9000).toString();

    // Store the OTP metadata
    otpStore.set(phone, {
        code,
        expiresAt: now + OTP_LIFESPAN,
        attempts: 0,
        lastSentAt: now,
    });

    console.log(`[OTP SERVICE] 4-digit OTP for ${phone}: ${code}`);
    return code;
};

// Verifies OTP with single-use invalidation and max attempt enforcement
export const verifyOTP = (phone, inputCode) => {
    // In dev mode, '1234' always passes
    if (process.env.NODE_ENV === 'development' && inputCode === '1234') {
        return { valid: true };
    }

    const record = otpStore.get(phone);

    // Check if no OTP was requested or already burned
    if (!record) {
        return {
            valid: false,
            message: 'OTP expired or not found. Please request a new code.',
        };
    }
    
    // Check if 5-minute lifespan expired
    if (Date.now() > record.expiresAt) {
        otpStore.delete(phone);
        return {
            valid: false,
            message: 'OTP has expired. Please request a new code.',
        };
    }

    // Check if max attempts is exceeded
    if (record.attempts >= MAX_ATTEMPTS) {
        otpStore.delete(phone);
        return {
            valid: false,
            message: 'Maximum failed attempts reached. Please request a new code.',
        };
    }

    // Check incorrect code
    if (record.code != inputCode) {
        record.attempts += 1;
        const attemptRemaining = MAX_ATTEMPTS - record.attempts;

        if (record.attempts >= MAX_ATTEMPTS) {
            otpStore.delete(phone);
            return {
                valid: false,
                message: 'Maximum failed attempts reached. Please request a new code.',
            };
        }

        return {
            valid: false,
            message: `Incorrect OTP code. ${attemptsRemaining} attempt(s) remaining.`,
        };
    }

    // On Success -> Single-use burn!
    otpStore.delete(phone);
    return { valid: true} ;
};
