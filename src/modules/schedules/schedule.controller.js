import prisma from '../../config/db.js';
import { validateRequiredFields } from '../../utils/validator.js';


/**
 * Publish/Update Partner buying prices
 * POST  /api/v1/partners/prices
 * (Auth: COLLECTION_PARTNER)
 */
export const publishPrice = async (req, res) => {
    try {
        const userId = req.user.id;
        const { category_id, price_per_kg } = req.body;

        const missingFields = validateRequiredFields(req.body, ['category_id', 'price_per_kg']);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required field(s): ${missingFields.join(', ')}`,
                error: 'BAD_REQUEST',
                missing_fields: missingFields,
            });
        }

        const partnerProfile = await prisma.collectionPartnerProfile.findUnique({
            where: { user_id: userId },
        });

        if (!partnerProfile) {
            return res.status(404).json({
                success: false,
                message: 'Collection Partner profile not found.',
                error: 'NOT_FOUND',
            });
        }

        // Upsert buying price
        const existingPrice = await prisma.partnerMaterialPrice.findFirst({
            where: {
                partner_id: partnerProfile.id,
                category_id,
            },
        });

        let publishedPrice;
        if (existingPrice) {
            publishedPrice = await prisma.partnerMaterialPrice.update({
                where: { id: existingPrice.id },
                data: { price_per_kg: parseFloat(price_per_kg) },
            });
        } else {
            publishPrice = await prisma.partnerMaterialPrice.create({
                data: {
                    partner_id: partnerProfile.id,
                    category_id,
                    price_per_kg: parseFloat(price_per_kg),
                },
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Material buying price published successfully',
            data: publishedPrice,
        });
    } catch (error) {
        console.error('Error publishing price:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to publish buying price.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Publish Partner collection schedule
 * POST  /api/v1/partners/schedules
 * (Auth: COLLECTION_PARTNER)
 */
export const publishSchedule = async (req, res) => {
    try {
        const userId = req.user.id;
        const { service_area, collection_day, time_window } = req.body;

        const missingFields = validateRequiredFields(req.body, ['service_area', 'collection_day']);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required field(s): ${missingFields.join(', ')}`,
                error: 'BAD_REQUEST',
                missing_fields: missingFields,
            });
        }

        const partnerProfile = await prisma.collectionPartnerProfile.findUnique({
            where: { user_id: userId },
        });

        if (!partnerProfile) {
            return res.status(404).json({
                success: false,
                message: 'Collection Partner profile not found.',
                error: 'NOT_FOUND',
            });
        }

        const newSchedule = await prisma.partnerSchedule.create({
            data: {
                partner_id: partnerProfile.id,
                service_area,
                collection_day,
                time_window: time_window || null,  // Stores null if no time window is provided
            },
        });

        return res.status(201).json({
            success: true,
            message: 'Collection schedule published successfully',
            data: newSchedule,
        });
    }
};

/**
 * Browse assigned Partner Info, Schedules, Prices, and Drop-off point
 * GET  /api/v1/households/partners
 * (Auth: HOUSEHOLD)
 */
export const getNearbyPartnerInfo = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get household service zone
        const household = await prisma.householdProfile.findUnique({
            where: { user_id: userId },
        });

        if (!household) {
            return res.status(404).json({
                success: false,
                message: 'Household profile not found.',
                error: 'NOT_FOUND',
            });
        }

        // Find active partner serving this exact service area
        const partners = await prisma.collectionPartnerProfile.findMany({
            where: {
                service_area: household.service_zone,
                user: { status: 'APPROVED' },
            },
            include: {
                schedules: true,
                prices: {
                    include: { category: true },
                },
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Partner information and drop-off hubs retrieved successfully',
            data: partners,
        });
    } catch (error) {
        console.error('Error fetching partner info:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch partner info.',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Household mark materials ready
 * POST  /api/v1/households/declarations
 * (Auth: HOUSEHOLD)
 */
export const declareMaterialsReady = async (req, res) => {
    try {
        const userId = req.user.id;
        const { partner_id, service_area, materials } = req.body;

        const missingFields = validateRequiredFields(req.body, ['partner_id', 'service_area', 'materials']);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required field(s): ${missingFields.join(', ')}`,
                error: 'BAD_REQUEST',
                missing_fields: missingFields,
            });
        }

        const household = await prisma.householdProfile.findUnique({
            where: { user_id: userId },
        });

        if (!household) {
            return res.status(404).json({
                success: false,
                message: 'Household profile not found.',
                error: 'NOT_FOUND',
            });
        }

        // Prevent duplicate active declarations
        const existingDeclaration = await prisma.scheduledDeclaration.findFirst({
            where: {
                household_id: household.id,
            }
        })
    }
}
