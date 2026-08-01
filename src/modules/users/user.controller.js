import prisma from "../../config/db.js";
import { validateRequiredFields } from "../../utils/validator.js";


/**
 * Get current logged-in Profile
 * GET  /api/v1/users/me
 */
export const getMe = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                phone: true,
                email: true,
                role: true,
                status: true,
                device_token: true,
                householdProfile: true,
                partnerProfile: true,
                recyclingOrgProfile: true,
                wallet: {
                    select: { balance: true },
                },
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found.',
                error: 'NOT_FOUND',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Profile details retrieved successfully',
            data: user,
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Update Household Profile location
 * PATCH  /api/v1/users/profile/household
 */
export const updateHouseholdProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { address, state, area, landmark, service_zone } = req.body;

        const updatedProfile = await prisma.householdProfile.update({
            where: { user_id: userId },
            data: {
                ...(address && { address }),
                ...(state && { state }),
                ...(area && { area }),
                ...(landmark && { landmark }),
                ...(service_zone && { service_zone }),
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Household location profile updated successfully',
            data: updatedProfile,
        });
    } catch (error) {
        console.error('Error updating household profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update household profile.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Update Collection Partner operating details
 * PATCH  /api/v1/user/profile/partner
 */
export const updatePartnerProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { dropoff_hours, service_area, vehicle_type, storage_capacity } = req.body;

        const updatedProfile = await prisma.collectionPartnerProfile.update({
            where: { user_id: userId },
            data: {
                ...(dropoff_hours && { dropoff_hours }),
                ...(service_area && { service_area }),
                ...(vehicle_type && { vehicle_type }),
                ...(storage_capacity && { storage_capacity }),
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Collection Partner details updated successfully',
            data: updatedProfile,
        });
    } catch (error) {
        console.error('Error updating partner profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update Collection Partner profile',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Update FCM push notification device token
 * PATCH  /api/v1/users/device-toke
 */
export const updateDeviceToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const { device_token } = req.body;

        const missingFields = validateRequiredFields(req.body, ['device_token']);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'device_token is required.',
                error: 'BAD_REQUEST',
                missing_fields: missingFields,
            });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { device_token },
        });

        return res.status(200).json({
            success: true,
            message: 'FCM device token updated successfully',
        });
    } catch (error) {
        console.error('Error updating device token:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update device token.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};
