import prisma from '../../config/db.js';


/**
 * View pending Partner and Recycler applications
 * GET  /api/v1/admin/applications
 */
export const getPendingApplications = async (req, res) => {
    try {
        const pendingPartners = await prisma.collectionPartnerProfile.findMany({
            where: { user: { status: 'PENDING' } },
            include: {
                user: { select: { id: true, phone: true, status: true, created_at: true } },
            },
        });

        const pendingRecyclers = await prisma.recyclingOrgProfile.findMany({
            where: { user: { status: 'PENDING' } },
            include: {
                user: { select: { id: true, phone: true, status: true, created_at: true } },
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Pending applications retrieved successfully',
            data: {
                collection_partners: pendingPartners,
                recycling_organizations: pendingRecyclers,
            },
        });
    } catch (error) {
        console.error('Error fetching apllications:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch pending applications',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Approve or Reject Application
 * PATCH  /api/v1/admin/applications/:id/review
 */
export const reviewApplication = async (req, res) => {
    try {
        const { id } = req.params;  // User UUID
        const { status, badge_title } = req.body;  // status: "APPROVED" or "REJECTED"

        if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be either 'APPROVED' or 'REJECTED'.",
                error: 'BAD_REQUEST',
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { status },
        });

        // If Collection Partner is approved, optionally set custom badge title
        if (updatedUser.role === 'COLLECTION_PARTNER' && status === 'APPROVED') {
            await prisma.collectionPartnerProfile.update({
                where: { user_id: id },
                data: { badge_title: badge_title || 'Verified Partner' },
            });
        }

        return res.status(200).json({
            success: true,
            message: `Account status updated to ${status} successfully`,
            data: {
                user_id: updatedUser.id,
                status: updatedUser.status,
            },
        });
    } catch (error) {
        console.error('Error reviewing application:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to review application',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * View all flagged Disputes
 * GET  /api/v1/admin/disputes
 */
export const getDisputes = async (req, res) => {
    try {
        const disputes = await prisma.dispute.findMany({
            where: { is_resolved: false },
            include: {
                transaction: {
                    include: {
                        items: { include: { category: true } },
                        partner: true,
                    },
                },
                household: true,
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Disputed transactions retrieved successfully',
            data: disputes,
        });
    } catch (error) {
        console.error('Error fetching disputes:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch disputes',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Resolve Dispute
 * PATCH  /api/v1/admin/disputes/:id/resolve
 */
export const resolveDispute = async (req, res) => {
    try {
        const { id } = req.params;  // Dispute UUID
        const { admin_notes, resolved_amount } = req.body;

        const dispute = await prisma.dispute.findUnique({ where: { id } });

        if (!dispute) {
            return res.status(404).json({
                success: false,
                message: 'Dispute record not found.',
                error: 'NOT_FOUND',
            });
        }

        // Mark dispute as resolved
        const updatedDispute = await prisma.dispute.update({
            where: { id },
            data: {
                admin_notes: admin_notes || 'Resolved by Admin',
                is_resolved: true,
            },
        });

        // Update the transaction status and amount if specified
        if (resolved_amount) {
            await prisma.collectionTransaction.update({
                where: { id: dispute.transaction_id },
                data: {
                    total_amount: parseFloat(resolved_amount),
                    status: 'RESOLVED',
                },
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Dispute resolved successfully',
            data: updatedDispute,
        });
    } catch (error) {
        console.error('Error resolving dispute:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to resolve dispute',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Platform Oversight Summary View
 * GET  /api/v1/admin/oversight
 */
export const getOversightList = async (req, res) => {
    try {
        const partners = await prisma.collectionPartnerProfile.findMany({
            include: {
                user: { select: { status: true, phone: true } },
            },
        });

        const recyclers = await prisma.recyclingOrgProfile.findMany({
            include: {
                user: { select: { status: true, email: true} },
            },
        });

        return res.status(200).json({
            success: true,
            data: {
                collection_partners: partners,
                recycling_organizations: recyclers,
            },
        });
    } catch (error) {
        console.error('Error fetching oversight list:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch oversight list',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Create Master Material Category
 * POST  /api/v1/admin/categories
 */
export const createMaterialCategory = async (req, res) => {
    try {
        const { name, unit } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Material category name is required',
                error: 'BAD_REQUEST',
            });
        }

        const category = await prisma.materialCategory.create({
            data: {
                name,
                unit: unit || 'kg',
            },
        });

        return res.status(201).json({
            success: true,
            message: 'Material category created successfully',
            data: category,
        });
    } catch (error) {
        console.error('Error creating category:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};
