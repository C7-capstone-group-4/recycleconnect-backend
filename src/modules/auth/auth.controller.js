import bcrypt from "bcryptjs";
import crypto from 'crypto';
import prisma from "../../config/db.js";
import { signToken } from '../../utils/jwt.js';
import { generateAndSendOTP, verifyOTP } from "../../utils/otpService.js";
import { generateReferenceCode } from "../../utils/referenceCode.js";
import { validateRequiredFields, isValidPhoneNumber } from "../../utils/validator.js";


// Temporary memory store for Password reset tokes (email -> { resetToken, expiresAt })
const resetTokenStore = new Map();

/**
 * Send OTP
 * POST  /api/v1/auth/send-otp
 */
export const sendOTP = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required.',
                error: 'BAD_REQUEST',
            });
        }

        // Phone format validation
        if (!isValidPhoneNumber(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid phone number (e.g. +2348012345678 or 08012345678',
                error: 'BAD_REQUEST',
            });
        }

        const otpData = await generateAndSendOTP(phone);

        return res.status(200).json({
            success: true,
            message: `OTP code sent successfully to ${phone}`,
            data: {
                cooldown_seconds: otpData.cooldown_seconds,
                ...(process.env.NODE_ENV === 'development' && { dev_otp: otpData.code }),  // Show otp in dev mode for Postman testing
            },
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to send OTP.',
            error: 'BAD_REQUEST',
        });
    }
};

/**
 * Register Household
 * POST  /api/v1/auth/register/household
 */
export const registerHousehold = async (req, res) => {
    try {
        const missingFields = validateRequiredFields(req.body, [
            'phone',
            'otp',
            'pin',
            'first_name',
            'state',
            'area',
            'service_zone'
        ]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields(s): ${missingFields.join(', ')}`,
                error: 'BAD_REQUEST',
                missing_fields: missingFields,  // Send array to frontend
            });
        }

        const { phone, otp, pin, first_name, state, area, landmark, service_zone } = req.body;

        // Validate phone number format
        if (!isValidPhoneNumber(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid phone number (e.g., +2348012345678 or 08012345678).',
                error: 'BAD_REQUEST',
            });
        }

        // Verify 4-digit OTP
        const otpResult = verifyOTP(phone, otp);
        if (!otpResult.valid) {
            return res.status(400).json({
                success: false,
                message: otpResult.message,
                error: 'BAD_RESULT',
            });
        }

        // Check if phone is already registered
        const existingUser = await prisma.user.findUnique({ where: { phone } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'An account with this phone number already exists.',
                status: 'BAD_REQUEST',
            });
        }

        // Hash 4-digit PIN
        const pinHash = await bcrypt.hash(pin.toString(), 10);
        const reference_code = generateReferenceCode();

        // Create User + HouseholdProfile + Wallet
        const result = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    phone,
                    pin_hash: pinHash,
                    role: 'HOUSEHOLD',
                    status: 'APPROVED',
                },
            });

            const newProfile = await tx.householdProfile.create({
                data: {
                    user_id: newUser.id,
                    first_name,
                    reference_code,
                    state,
                    area,
                    landmark: landmark || '',
                    service_zone,
                },
            });

            await tx.wallet.create({
                data: {
                    user_id: newUser.id,
                    balance: 0.0,
                },
            });

            return { newUser, newProfile };
        });

        const token = signToken(result.newUser.id, result.newUser.role);

        return res.status(201).json({
            success: true,
            message: 'Household account registered successfully',
            data: {
                token,
                user: {
                    id: result.newUser.id,
                    phone: result.newUser.phone,
                    role: result.newUser.role,
                },
                household_profile: {
                    id: result.newProfile.id,
                    first_name: result.newProfile.first_name,
                    reference_code: result.newProfile.reference_code,
                    service_zone: result.newProfile.service_zone,
                },
            },
        });
    } catch (error) {
        console.error('Error registering household:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to register household account.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Register Collection Partner
 * POST  /api/v1/auth/register/partner
 */
export const registerPartner = async (req, res) => {
    try {
        const {
            phone,
            otp,
            pin,
            full_name,
            business_name,
            partner_type,
            id_type,
            id_number,
            id_photo_url,
            vehicle_type,
            storage_capacity,
            address,
            landmark,
            latitude,
            longitude,
            service_area,
        } = req.body;

        // Check for missing required fields dynamically
        const requiredPartnerFields = [
            'phone',
            'otp',
            'pin',
            'full_name',
            'business_name',
            'id_number',
            'id_photo_url',
            'vehicle_type',
            'storage_capacity',
            'address',
            'service_area',
        ];

        const missingFields = validateRequiredFields(req.body, requiredPartnerFields);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required onboarding field(s): ${missingFields.join(', ')}`,
                error: 'BAD_REQUEST',
                missing_fields: missingFields,
            });
        }

        // Validate 4-digit PIN format
        if (pin.toString().trim().length !== 4 || isNaN(pin)) {
            return res.status(400).json({
                success: false,
                message: 'PIN must be exactly 4 numeric digits.',
                error: 'BAD_REQUEST',
            });
        }

        // Verify 4-digit OTP
        const otpResult = verifyOTP(phone, otp);
        if (!otpResult.valid) {
            return res.status(400).json({
                success: false,
                message: otpResult.message,
                error: 'BAD_RESULT',
            });
        }

        // Check if phone exists
        const existingUser = await prisma.user.findUnique({ where: { phone } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'An account with this phone number already exists.',
                error: 'BAD_REQUEST',
            });
        }

        const pinHash = await bcrypt.hash(pin.toString(), 10);
        
        // Create a User (PENDING status) + PartnerProfile + Wallet
        const result = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    phone,
                    pin_hash: pinHash,
                    role: 'COLLECTION_PARTNER',
                    status: 'PENDING',  // Awaits Admin review
                },
            });

            const newProfile = await tx.collectionPartnerProfile.create({
                data: {
                    user_id: newUser.id,
                    full_name,
                    business_name,
                    partner_type: partner_type || 'EXISTING_OPERATOR',
                    id_type: id_type || 'NIN',
                    id_number,
                    id_photo_url,
                    vehicle_type,
                    storage_capacity,
                    address,
                    landmark: landmark || '',
                    latitude: parseFloat(latitude) || 0.0,
                    longitude: parseFloat(longitude) || 0.0,
                    service_area,
                },
            });

            await tx.wallet.create({
                data: {
                    user_id: newUser.id,
                    balance: 0.0,
                },
            });

            return { newUser, newProfile };
        });

        return res.status(201).json({
            success: true,
            message: 'Collection Partner application submitted successfully. Awaiting Admin review.',
            data: {
                user_id: result.newUser.status,
                business_name: result.newProfile.business_name,
                status: result.newUser.status,
            },
        });
    } catch (error) {
        console.error('Error registering partner:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to register Collection Partner application.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Register Recycling Organization
 * POST  /api/v1/auth/register/recycler
 */
export const registerRecycler = async (req, res) => {
    try {
        const { email, password, org_name, contact_name, phone, address, materials_of_interest } = req.body;

        // Dynamic missing fields check
        const requiredRecyclerFields = ['email', 'password', 'org_name', 'phone'];
        const missingFields = validateRequiredFields(req.body, requiredRecyclerFields);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required field(s): ${missingFields.join(', ')}`,
                error: 'BAD_REQUEST',
                missing_fields: missingFields,
            });
        }

        // Email format validation
        const normalizedEmail = email.toLowerCase().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.',
                error: 'BAD_REQUEST',
            });
        }

        // Phone format validation
        if (!isValidPhoneNumber(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid phone number (e.g., +2348012345678 or 08012345678)',
                error: 'BAD_REQUEST',
            });
        }

        // Minimum password length check
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long.',
                error: 'BAD_REQUEST',
            });
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email address already exists.',
                error: 'BAD_REQUEST',
            });
        }

        // Check if phone already exists
        const existingPhone = await prisma.user.findUnique({ where: { phone } });
        if (existingPhone) {
            return res.status(400).json({
                success: false,
                message: 'An account with this phone number already exists.',
                error: 'BAD_REQUEST',
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email: normalizedEmail,
                    phone,
                    password_hash: passwordHash,
                    role: 'RECYCLING_ORG',
                    status: 'PENDING',  // Awaits Admin review
                },
            });

            const newProfile = await tx.recyclingOrgProfile.create({
                data: {
                    user_id: newUser.id,
                    org_name,
                    contact_name: contact_name || '',
                    address: address || '',
                    materials_of_interest: materials_of_interest || [],
                },
            });

            return { newUser, newProfile };
        });

        return res.status(201).json({
            success: true,
            message: 'Recycling organization registered successfully. Awaiting Admin review.',
            data: {
                user_id: result.newUser.id,
                org_name: result.newProfile.org_name,
                status: result.newUser.status,
            },
        });
    } catch (error) {
        console.error('Error registering recycler:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to register recycling organization.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Login via Phone and PIN (Households and Partners)
 * POST   /api/v1/auth/login/pin
 */
export const loginWithPin = async (req, res) => {
    try {
        const { phone, pin } = req.body;

        if (!phone || !pin) {
            return res.status(400).json({
                success: false,
                message: 'Phone and PIN are required.',
                error: 'BAD_REQUEST',
            });
        }

        const user = await prisma.user.findUnique({
            where: { phone },
            include: {
                householdProfile: true,
                partnerProfile: true,
            },
        });

        if (!user || !user.pin_hash) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone or PIN.',
                error: 'UNAUTHORIZED',
            });
        }

        // Verify PIN match
        const isPinValid = await bcrypt.compare(pin.toString(), user.pin_hash);
        if (!isPinValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone number or PIN.',
                error: 'UNAUTHORIZED',
            });
        }

        // Check account status
        if (user.status === 'REJECTED') {
            return res.status(403).json({
                success: false,
                message: 'Your application has been rejected by Admin',
                error: 'FORBIDDEN',
            });
        }

        const token = signToken(user.id, user.role);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    phone: user.phone,
                    role: user.role,
                    status: user.status,
                    reference_code: user.householdProfile?.reference_code || null,
                },
            },
        });
    } catch (error) {
        console.error('Errorl logging in with PIN:', error);
        return res.status(500).json({
            success: false,
            message: 'Login failed.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Login via Email and Password (Recyclers and Admin)
 * POST   /api/v1/auth/login/password
 */
export const loginWithPassword = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and Password are required.',
                error: 'BAD_REQUEST',
            });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.password_hash) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email address or password.',
                error: 'UNAUTHORIZED',
            });
        }

        if (user.status === 'REJECTED') {
            return res.status(403).json({
                success: false,
                message: 'Your registration has been rejected by Admin.',
                error: 'FORBIDDEN',
            });
        }

        const token = signToken(user.id, user.role);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                },
            },
        });
    } catch (error) {
        console.error('Error logging in with password:', error);
        return res.status(500).json({
            success: false,
            message: 'Login failed.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Forgotten PIN recovery
 * POST  /api/v1/auth/forgot-pin
 */
export const forgotPin = async (req, res) => {
    try {
        const { phone, otp, new_pin } = req.body;

        // Dynamic missing fields validation
        const missingFields = validateRequiredFields(req.body, ['phone', 'otp', 'new_pin']);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required field(s): ${missingFields.join(', ')}`,
                error: 'BAD_REQUEST',
                missing_fields: missingFields,
            });
        }

        // Validate 4-digit PIN format
        if (new_pin.toString().trim().length !== 4 || isNaN(new_pin)) {
            return res.status(400).json({
                success: false,
                message: 'New PIN must be exactly 4 numeric digits.',
                error: 'BAD_REQUEST',
            });
        }

        // Verify OTP code
        const otpResult = verifyOTP(phone, otp);
        if (!otpResult.valid) {
            return res.status(400).json({
                success: false,
                message: otpResult.message,
                error: 'BAD_REQUEST',
            });
        }

        const newPinHash = await bcrypt.hash(new_pin.toString(), 10);

        // Update user PIN in database
        await prisma.user.update({
            where: { phone },
            data: { pin_hash: newPinHash },
        });

        return res.status(200).json({
            success: true,
            message: 'PIN reset successfully. You can now log in with your new PIN.',
        });
    } catch (error) {
        console.error('Error resetting PIN:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reset PIN.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Request Password reset token
 * POST  /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
    try {
        const missingFields = validateRequiredFields(req.body, ['email']);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required.',
                error: 'BAD_REQUEST',
                missing_fields: missingFields,
            });
        }

        const { email } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        // Security Best Practice: Do not leak if an email exists or not
        if (!user || !user.password_hash) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists with that email, a password reset token has been generated.',
            });
        }

        // Generate secure 5-minute reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        const expiresAt = Date.now() + 5 * 60 * 1000;

        resetTokenStore.set(normalizedEmail, { resetToken, expiresAt });

        console.log(`[PASSWORD RESET] Token for ${normalizedEmail}: ${resetToken}`);

        return res.status(200).json({
            success: true,
            message: 'If an account exists with that email, a password token has been generated.',
            ...(process.env.NODE_ENV === 'development' && { dev_reset_token: resetToken}),
        });
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process password reset request.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Reset Password with Token
 * POST  /api/v1/auth/reset-password
 */
export const resetPassword = async (req, res) => {
    try {
        const missingFields = validateRequiredFields(req.body, ['email', 'token', 'new_password']);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required field(s): ${missingFields.join(', ')}`,
                error: 'BAD_REQUEST',
                missing_fields: missingFields,
            });
        }

        const { email, token, new_password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New Password must be at least 6 characters long.',
                error: 'BAD_REQUEST',
            });
        }

        const record = resetTokenStore.get(normalizedEmail);

        // Verify token validity and expiration
        if (!record || record.resetToken !== token || Date.now > record.expiresAt) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired password reset token. Please request a new one.',
                error: 'BAD_REQUEST',
            });
        }

        const newPasswordHash = await bcrypt.hash(new_password, 10);

        await prisma.user.update({
            where: { email: normalizedEmail },
            data: { password_hash: newPasswordHash },
        });

        // Burn token after siingle use
        resetTokenStore.delete(normalizedEmail);

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully. You can now log in with your new password.',
        });
    } catch (error) {
        console.error('Error in resetPassword:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reset password.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};
