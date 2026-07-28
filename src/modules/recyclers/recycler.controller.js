import prisma from "../../config/db.js";


/**
 * View aggregated available material inventory
 * GET  /api/v1/recyclers/inventory
 */
export const getAggregatedInventory = async (req, res) => {
    try {
        const { material_category } = req.query;

        // Fetch master material categories (seeded in database)
        const categories = await prisma.materialCategory.findMany({
            where: material_category
              ? { name: { contains: material_category, mode: 'insensitive' } }
              : {},
        });

        // Sum up weight_kg from confirmed transactions for each category
        const inventoryData = await Promise.all(
            categories.map(async (category) => {
                const aggregate = await prisma.transactionItem.aggregate({
                    _sum: {
                        weight_kg: true,
                    },
                    where: {
                        category_id: category.id,
                        transaction: {
                            partner: {
                                user: {
                                    status: 'APPROVED',
                                },
                            },
                        },
                    },
                });

                return {
                    category_id: category.id,
                    category_name: category.name,
                    total_available_kg: aggregate._sum.weight_kg || 0,
                    unit: category.unit || 'kg',
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: 'Aggregated inventory fecthed successfully',
            data: inventoryData,
        });

        // Aggregated confirmed kilograms collected across verified partners grouped by category
        // const items = await prisma.transactionItem.groupBy({
        //     by: ['category_id'],
        //     _sum: {
        //         weight_kg: true,
        //     },
        //     where: {
        //         transaction: {
        //             partner: {
        //                 user: {
        //                     status: "APPROVED",
        //                 },
        //             },
        //         },
        //         ...(material_category && {
        //             category: {
        //                 name: {
        //                     contains: material_category,
        //                     mode: 'insensitive',
        //                 },
        //             },
        //         }),
        //     },
        // });

        // // Fetch master category names to format response
        // const categories = await prisma.materialCategory.findMany();
        // const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

        // const formattedInventory = items.map((item) => ({
        //     category_id: item.category_id,
        //     category_name: categoryMap.get(item.category) || 'General Recyclables',
        //     total_available_kg: item._sum.weight_kg || 0,
        //     unit: 'kg',
        // }));

        // return res.status(200).json({
        //     success: true,
        //     message: 'Aggregated inventory fetched successfully',
        //     data: formattedInventory,
        // });
    } catch (error) {
        console.error('Error fetching aggregated inventory:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};

/**
 * Recycler express purchase interest
 * POST  /api/v1/recyclers/express-interest
 */
export const expressInterest = async (req, rest) => {
    try {
        const recyclerUserId = req.user.id;  // Extracted from Auth middleware
        const { partner_id, category_name, estimated_kg } = req.body;

        if (!partner_id || !category_name || !estimated_kg) {
            return res.status(400).json({
                success: false,
                message: 'partner_id, category_name, and estimated_kg are required.',
                error: 'BAD_REQUEST',
            });
        }

        // Find Recycler's profile
        const recyclerProfile = await prisma.recyclingOrgProfile.findUnique({
            where: { user_id: recyclerUserId },
        });

        if (!recyclerProfile) {
            return res.status(404).json({
                success: false,
                message: 'Recycling organization profile not found.',
                error: 'NOT_FOUND',
            });
        }

        // Create RecyclerInterest record
        const interest = await prsima.recyclerInterest.create({
            data: {
                recycler_id: recyclerProfile.id,
                partner_id,
                category_name,
                estimated_kg: parseFloat(estimated_kg),
                status: 'PENDING',
            },
        });

        return res.status(201).json({
            success: true,
            message: "Expressed interest submitted successfully to partner",
            data: interest,
        });
    } catch (error) {
        console.error("Error expressing interest: ", error);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit interest',
            error: 'INTERNAL_SERVER_ERROR',
        }); 
    }
};

/**
 * Collection Partner responds to expressed interest
 * PATCH  /api/v1/partners/interests/:id/respond
 */
export const respondToInterest = async (req, res) => {
    try {
        const { id } = req.params;  // RecyclerInterest UUID
        const { action } = req.body;  // "ACCEPT" or "DECLINE"

        if (!action || !['ACCEPT', 'DECLINE'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must either be 'ACCEPT' or 'DECLINE'",
                error: 'BAD_REQUEST',
            });
        }

        const interest = await prisma.recyclerInterest.findUnique({
            where: { id },
            include: {
                recycler: { include: { user: true } },
                partner: { include: { user: true } },
            },
        });

        if (!interest) {
            return res.status(404).json({
                success: false,
                message: "Interest request not found",
                error: 'NOT_FOUND'
            });
        }

        const updatedInterest = await prisma.recyclerInterest.update({
            where: { id },
            data: { status: newStatus },
        });

        return res.status(200).json({
            success: true,
            message: `Interest request ${action.toLowerCase()}ed successfully`,
            data: {
                id: updatedInterest.id,
                status: updatedInterest.status,
                // If ACCEPTED exchange phone numbers for off-app logistics
                ...(newStatus === 'ACCEPTED' && {
                    recycler_phone: interest.recycler.user.phone,
                    partner_phone: interest.partner.user.phone,
                }),
            },
        });
    } catch (error) {
        console.error("Error responding to interest:", error);
        return res.status(500).json({
            success: false,
            message: 'Failed to respond to interest',
            error: 'INTERNAL_SERVER_ERROR',
        });
    }
};
