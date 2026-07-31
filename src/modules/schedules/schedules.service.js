const prisma = require("../../config/db");
const ApiError = require("../../utils/ApiError");

/**
 * Publish or update a partner's buying price for a material category.
 * Upsert semantics: one active price per (partner, category) pair.
 */
async function setPartnerPrice(partnerId, { category_id, price_per_kg }) {
  if (!category_id || price_per_kg === undefined) {
    throw new ApiError(
      400,
      "category_id and price_per_kg are required",
      "BAD_REQUEST",
    );
  }
  if (Number(price_per_kg) <= 0) {
    throw new ApiError(
      400,
      "price_per_kg must be greater than 0",
      "BAD_REQUEST",
    );
  }

  const category = await prisma.materialCategory.findUnique({
    where: { id: category_id },
  });
  if (!category) {
    throw new ApiError(404, "Material category not found", "NOT_FOUND");
  }

  const price = await prisma.partnerMaterialPrice.upsert({
    where: {
      partnerId_categoryId: { partnerId, categoryId: category_id },
    },
    update: { pricePerKg: price_per_kg },
    create: {
      partnerId,
      categoryId: category_id,
      pricePerKg: price_per_kg,
    },
  });

  return {
    partner_id: price.partnerId,
    category_id: price.categoryId,
    price_per_kg: price.pricePerKg,
  };
}

/**
 * Publish a recurring collection schedule for a partner's service zone.
 */
async function publishSchedule(
  partnerId,
  { service_zone, collection_day, time_window, notes },
) {
  if (!service_zone || !collection_day) {
    throw new ApiError(
      400,
      "service_zone and collection_day are required",
      "BAD_REQUEST",
    );
  }

  const schedule = await prisma.partnerSchedule.create({
    data: {
      partnerId,
      serviceZone: service_zone,
      collectionDay: collection_day,
      timeWindow: time_window || null,
      notes: notes || null,
    },
  });

  return schedule;
}

/**
 * Browse partners serving a given zone, with their published prices
 * and next collection schedule attached.
 */
async function browsePartnersByZone(serviceZone) {
  const where = { isVerified: true };
  // service_zones is stored as a string array/JSON on the partner profile
  const partners = await prisma.collectionPartnerProfile.findMany({
    where,
    include: {
      prices: { include: { category: true } },
      schedules: true,
    },
  });

  const filtered = serviceZone
    ? partners.filter((p) => (p.serviceZones || []).includes(serviceZone))
    : partners;

  return filtered.map((p) => ({
    id: p.id,
    business_name: p.companyName,
    badge_title: p.badgeTitle,
    address: p.address,
    landmark: p.landmark || null,
    dropoff_hours: p.dropoffHours,
    schedules: p.schedules
      .filter((s) => !serviceZone || s.serviceZone === serviceZone)
      .map((s) => ({
        collection_day: s.collectionDay,
        time_window: s.timeWindow,
      })),
    prices: p.prices.map((pr) => ({
      category_name: pr.category.name,
      price_per_kg: pr.pricePerKg,
    })),
  }));
}

module.exports = {
  setPartnerPrice,
  publishSchedule,
  browsePartnersByZone,
};
