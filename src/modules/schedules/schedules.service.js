import prisma from '../../config/db.js';


async function getPartnerProfileOrThrow(userId) {
    const partner = await prisma.collectionPartnerProfile.findUnique({
        where: { user_id: userId },
    });
    if (!partner) {
        const err = new Error('Collection Partner profile not found for this user.');
        err.statusCode = 404;
        err.errorType = 'NOT_FOUND';
        throw err;
    }
    return partner;
}

// POST /partners/prices
async function publishPrice(userId, { category_id, price_per_kg }) {
    if (!category_id || price_per_kg == null) {
        const err = new Error('category_id and price_per_kg are required.');
        err.statusCode = 400;
        err.errorType = 'BAD_REQUEST';
        throw err;
    }
    if (Number(price_per_kg) <= 0) {
        const err = new Error('price_per_kg must be a positive number.');
        err.statusCode = 400;
        err.errorType = 'BAD_REQUEST';
        throw err;
    }

    const partner = await getPartnerProfileOrThrow(userId);

    const category = await prisma.materialCategory.findUnique({ where: { id: category_id } });
    if (!category) {
        const err = new Error('Material category not found.');
        err.statusCode = 404;
        err.errorType = 'NOT_FOUND';
        throw err;
    }

    const existingPrice = await prisma.partnerMaterialPrice.findFirst({
        where: { partner_id: partner.id, category_id: category_id },
    });

    let price;
    if (existingPrice) {
        price = await prisma.partnerMaterialPrice.update({
            where: { id: existingPrice.id },
            data: { price_per_kg: parseFloat(price_per_kg) },
        });
    } else {
        price = await prisma.partnerMaterialPrice.create({
            data: {
                partner_id: partner.id,
                category_id: category_id,
                price_per_kg: parseFloat(price_per_kg),
            },
        });
    }

    return {
        id: price.id,
        partner_id: price.partner_id,
        category_id: price.category_id,
        price_per_kg: Number(price.price_per_kg),
    };
}

// GET /households/prices
async function listPricesForHouseholds({ service_zone }) {
    const partners = await prisma.collectionPartnerProfile.findMany({
        where: { user: { status: 'APPROVED' } },
        include: {
            prices: { include: { category: true } },
        },
    });

    const filtered = service_zone
        ? partners.filter((p) => p.service_area === service_zone || (p.service_zones || []).includes(service_zone))
        : partners;

    return filtered.map((p) => ({
        partner_id: p.id,
        business_name: p.business_name,
        is_verified: p.is_verified,
        prices: p.prices.map((pr) => ({
            category_id: pr.category.id,
            category_name: pr.category.name,
            unit: pr.category.unit,
            price_per_kg: Number(pr.price_per_kg),
        })),
    }));
}

// POST /partners/schedules
async function publishSchedule(userId, { service_zone, service_area, collection_day, time_window }) {
    const targetArea = service_area || service_zone;

    if (!targetArea || !collection_day) {
        const err = new Error('service_area and collection_day are required.');
        err.statusCode = 400;
        err.errorType = 'BAD_REQUEST';
        throw err;
    }

    const partner = await getPartnerProfileOrThrow(userId);

    const schedule = await prisma.partnerSchedule.create({
        data: {
            partner_id: partner.id,
            service_area: targetArea,
            collection_day: collection_day,
            time_window: time_window || null,
        },
    });

    return {
        id: schedule.id,
        service_area: schedule.service_area,
        collection_day: schedule.collection_day,
        time_window: schedule.time_window,
    };
}

// GET /households/partners
async function listPartnersForHouseholds({ service_zone }) {
    const partners = await prisma.collectionPartnerProfile.findMany({
        where: { user: { status: 'APPROVED' } },
        include: {
            schedules: true,
            prices: { include: { category: true } },
        },
    });

    const filtered = service_zone
        ? partners.filter((p) => p.service_area === service_zone || (p.service_zones || []).includes(service_zone))
        : partners;

    return filtered.map((p) => ({
        id: p.id,
        business_name: p.business_name,
        badge_title: p.badge_title,
        address: p.address,
        dropoff_hours: p.dropoff_hours,
        schedules: p.schedules
            .filter((s) => !service_zone || s.service_area === service_zone)
            .map((s) => ({
                service_area: s.service_area,
                collection_day: s.collection_day,
                time_window: s.time_window,
            })),
        prices: p.prices.map((pr) => ({
            category_name: pr.category.name,
            price_per_kg: Number(pr.price_per_kg),
        })),
    }));
}

// GET /partners/demand
async function getAreaDemand(userId, { service_zone }) {
    const partner = await getPartnerProfileOrThrow(userId);
    const zone = service_zone || partner.service_area;

    const declarations = await prisma.scheduledDeclaration.findMany({
        where: {
            partner_id: partner.id,
            ...(zone && { service_area: zone }),
        },
        include: {
            household: { include: { user: true } },
        },
        orderBy: { created_at: 'asc' },
    });

    const households = declarations.map((d) => ({
        declaration_id: d.id,
        household_id: d.household.id,
        reference_code: d.household.reference_code,
        first_name: d.household.first_name,
        address: d.household.address,
        phone: d.household.user.phone,
        declared_at: d.created_at,
    }));

    return {
        service_area: zone,
        total_ready_households: households.length,
        households,
    };
}

export default {
    getPartnerProfileOrThrow,
    publishPrice,
    listPricesForHouseholds,
    publishSchedule,
    listPartnersForHouseholds,
    getAreaDemand,
};