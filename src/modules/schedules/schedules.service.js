const prisma = require("../../config/db");
const AppError = require("../../utils/AppError");

/**
 * Fetch the CollectionPartnerProfile for a given user id, or throw.
 * Most partner-scoped actions need the profile id (not the user id).
 */
async function getPartnerProfileOrThrow(userId) {
  const partner = await prisma.collectionPartnerProfile.findUnique({
    where: { userId },
  });
  if (!partner) {
    throw new AppError(
      "Collection Partner profile not found for this user.",
      404,
      "NOT_FOUND",
    );
  }
  return partner;
}

/**
 * POST /partners/prices
 * Create or update (upsert) a partner's buying price for a material category.
 */
async function publishPrice(userId, { category_id, price_per_kg }) {
  if (!category_id || price_per_kg == null) {
    throw new AppError(
      "category_id and price_per_kg are required.",
      400,
      "BAD_REQUEST",
    );
  }
  if (Number(price_per_kg) <= 0) {
    throw new AppError(
      "price_per_kg must be a positive number.",
      400,
      "BAD_REQUEST",
    );
  }

  const partner = await getPartnerProfileOrThrow(userId);

  const category = await prisma.materialCategory.findUnique({
    where: { id: category_id },
  });
  if (!category) {
    throw new AppError("Material category not found.", 404, "NOT_FOUND");
  }

  const price = await prisma.partnerMaterialPrice.upsert({
    where: {
      partnerId_categoryId: { partnerId: partner.id, categoryId: category_id },
    },
    update: { pricePerKg: price_per_kg },
    create: {
      partnerId: partner.id,
      categoryId: category_id,
      pricePerKg: price_per_kg,
    },
  });

  return {
    id: price.id,
    partner_id: price.partnerId,
    category_id: price.categoryId,
    price_per_kg: Number(price.pricePerKg),
  };
}

/**
 * GET /households/prices
 * Households view published buying prices, optionally filtered by service_zone.
 */
async function listPricesForHouseholds({ service_zone }) {
  const partners = await prisma.collectionPartnerProfile.findMany({
    where: service_zone
      ? { serviceZones: { array_contains: service_zone } }
      : undefined,
    select: {
      id: true,
      companyName: true,
      isVerified: true,
      prices: {
        select: {
          pricePerKg: true,
          category: { select: { id: true, name: true, unit: true } },
        },
      },
    },
  });

  return partners.map((p) => ({
    partner_id: p.id,
    company_name: p.companyName,
    is_verified: p.isVerified,
    prices: p.prices.map((pr) => ({
      category_id: pr.category.id,
      category_name: pr.category.name,
      unit: pr.category.unit,
      price_per_kg: Number(pr.pricePerKg),
    })),
  }));
}

/**
 * POST /partners/schedules
 * Partner creates/publishes a recurring collection day for a service zone.
 */
async function publishSchedule(
  userId,
  { service_zone, collection_day, notes },
) {
  if (!service_zone || !collection_day) {
    throw new AppError(
      "service_zone and collection_day are required.",
      400,
      "BAD_REQUEST",
    );
  }

  const partner = await getPartnerProfileOrThrow(userId);

  const schedule = await prisma.partnerSchedule.create({
    data: {
      partnerId: partner.id,
      serviceZone: service_zone,
      collectionDay: collection_day,
      notes: notes || null,
    },
  });

  return {
    id: schedule.id,
    service_zone: schedule.serviceZone,
    collection_day: schedule.collectionDay,
    notes: schedule.notes,
  };
}

/**
 * GET /households/partners
 * Households browse nearby/local partners with their schedules and prices.
 * Supports filtering by service_zone (lat/lng-based proximity can be layered
 * on later — MVP uses zone matching per the "Predictable Scheduling" design goal).
 */
async function listPartnersForHouseholds({ service_zone }) {
  const partners = await prisma.collectionPartnerProfile.findMany({
    where: service_zone
      ? { serviceZones: { array_contains: service_zone } }
      : undefined,
    include: {
      schedules: service_zone ? { where: { serviceZone: service_zone } } : true,
      prices: { include: { category: true } },
    },
  });

  return partners.map((p) => ({
    id: p.id,
    company_name: p.companyName,
    is_verified: p.isVerified,
    badge_title: p.badgeTitle,
    address: p.address,
    drop_off_hours: p.drop_off_Hours,
    schedules: p.schedules.map((s) => ({
      service_zone: s.serviceZone,
      collection_day: s.collectionDay,
      notes: s.notes,
    })),
    prices: p.prices.map((pr) => ({
      category_name: pr.category.name,
      price_per_kg: Number(pr.pricePerKg),
    })),
  }));
}

/**
 * GET /partners/demand
 * Partner views accumulated READY households, grouped/filterable by service_zone.
 */
async function getAreaDemand(userId, { service_zone }) {
  const partner = await getPartnerProfileOrThrow(userId);

  const declarations = await prisma.scheduledDeclaration.findMany({
    where: {
      partnerId: partner.id,
      status: "READY",
      ...(service_zone ? { serviceZone: service_zone } : {}),
    },
    include: {
      household: {
        select: { id: true, address: true, user: { select: { phone: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const households = declarations.map((d) => ({
    declaration_id: d.id,
    household_id: d.household.id,
    address: d.household.address,
    phone: d.household.user.phone,
    declared_at: d.createdAt,
  }));

  return {
    service_zone: service_zone || "ALL",
    total_ready_households: households.length,
    households,
  };
}

module.exports = {
  getPartnerProfileOrThrow,
  publishPrice,
  listPricesForHouseholds,
  publishSchedule,
  listPartnersForHouseholds,
  getAreaDemand,
};
