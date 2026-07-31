import express from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import {
    getMe,
    updateHouseholdProfile,
    updatePartnerProfile,
    updateDeviceToken,
} from './user.controller.js';


const router = express.Router();

router.use(protect);  // use 'protect' on all routes below

// Get current user profile (all authenticated roles)
router.get('/me', getMe);

// Update FCM device token (all authenticated roles)
router.patch('/device-token', updateDeviceToken);

// Household location updates
router.patch('/profile/household', restrictTo('HOUSEHOLD'), updateHouseholdProfile);

// Partner operating details updates
router.patch('/profile/partner', restrictTo('COLLECTION_PARTNER'), updatePartnerProfile);

export default router;
