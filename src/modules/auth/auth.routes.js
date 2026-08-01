import express from 'express';
import {
    sendOTP,
    registerHousehold,
    registerPartner,
    registerRecycler,
    loginWithPin,
    loginWithPassword,
    forgotPin,
    forgotPassword,
    resetPassword,
} from './auth.controller.js';


const router = express.Router();

// OTP
router.post('/send-otp', sendOTP);

// Registrations
router.post('/register/household', registerHousehold);
router.post('/register/partner', registerPartner);
router.post('/register/recycler', registerRecycler);

// Logins
router.post('/login/pin', loginWithPin);
router.post('/login/password', loginWithPassword);

// PIN and Password recovery
router.post('/forgot-pin', forgotPin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
